import { Request, Response, NextFunction } from 'express';
import { UtilityService } from '../services/utility.service';
import { Prisma, UtilityType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const utilityService = new UtilityService();

export class UtilityController {

    async getAllReadings(req: Request, res: Response, next: NextFunction) {
        try {
            const { roomId, type, month, year, page, limit, search, roomNumber } = req.query;

            console.log('Utility API called with query params:', req.query);

            const options: Prisma.UtilityMeterReadingFindManyArgs = { where: {} };

            // Xây dựng bộ lọc
            if (roomId) options.where!.roomId = parseInt(roomId as string);

            // Tìm kiếm theo số phòng nâng cao
            if (roomNumber) {
                const roomSearch = roomNumber as string;

                // Kiểm tra xem có phải pattern "306 (B3)" không
                const roomWithBuildingPattern = /(\d+)\s*\(([^)]+)\)/;
                const matchRoomWithBuilding = roomSearch.match(roomWithBuildingPattern);

                if (matchRoomWithBuilding) {
                    // Pattern "306 (B3)" - tìm theo cả số phòng và tòa nhà
                    const roomNum = matchRoomWithBuilding[1]; // "306"
                    const buildingName = matchRoomWithBuilding[2]; // "B3"

                    options.where!.room = {
                        number: {
                            contains: roomNum,
                            mode: 'insensitive'
                        },
                        building: {
                            name: {
                                contains: buildingName,
                                mode: 'insensitive'
                            }
                        }
                    };
                } else if (/^\D+$/.test(roomSearch)) {
                    // Pattern chỉ có chữ cái (không có số) - có thể là tên tòa nhà "B3"
                    options.where!.room = {
                        building: {
                            name: {
                                contains: roomSearch,
                                mode: 'insensitive'
                            }
                        }
                    };
                } else {
                    // Mặc định - chỉ tìm theo số phòng
                    options.where!.room = {
                        number: {
                            contains: roomSearch,
                            mode: 'insensitive'
                        }
                    };
                }
            }

            // Tìm kiếm chung
            if (search) {
                options.where!.OR = [
                    { room: { number: { contains: search as string, mode: 'insensitive' } } },
                    { notes: { contains: search as string, mode: 'insensitive' } }
                ];
            }

            // Tìm theo loại công tơ
            if (type) {
                // Handle the case where type might be stringified object
                let typeValue = type;

                // If it's a string that looks like an object representation
                if (typeof type === 'string' && type.includes('[object')) {
                    console.warn(`Received malformed type parameter: ${type}, defaulting to empty search`);
                    // Skip the type filter if it's malformed
                    typeValue = '';
                }

                if (typeValue === 'OTHER') {
                    // Xử lý trường hợp 'OTHER' (loại khác không phải điện, nước)
                    options.where!.type = {
                        notIn: ['ELECTRICITY', 'WATER'] as UtilityType[]
                    };
                } else if (typeValue && Object.values(UtilityType).includes(typeValue as UtilityType)) {
                    options.where!.type = typeValue as UtilityType;
                } else if (typeValue && typeValue !== '') {
                    console.warn(`Invalid utility type: ${typeValue}`);
                    // Don't throw an error for invalid types, just log a warning and continue without filtering by type
                }
            }

            // Tìm kiếm theo tháng/năm
            if (month && !isNaN(parseInt(month as string))) {
                options.where!.billingMonth = parseInt(month as string);
            }

            if (year && !isNaN(parseInt(year as string))) {
                options.where!.billingYear = parseInt(year as string);
            }

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 20; // Mặc định 20 item/trang
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;
            options.orderBy = [{ readingDate: 'desc' }, { roomId: 'asc' }]; // Sắp xếp

            console.log('Query options:', JSON.stringify(options, null, 2));

            // Lấy tổng số bản ghi
            const totalRecords = await prisma.utilityMeterReading.count({ where: options.where });
            console.log(`Total matching records: ${totalRecords}`);

            const readings = await utilityService.findAllReadings(options);
            console.log(`Returned readings: ${readings.length}`);

            // Check if there's any data in the database at all
            const totalAllReadings = await prisma.utilityMeterReading.count();
            console.log(`Total readings in database: ${totalAllReadings}`);

            res.status(200).json({
                status: 'success',
                results: readings.length,
                total: totalRecords,
                data: readings
            });
        } catch (error) {
            console.error('Error in getAllReadings:', error);
            next(error);
        }
    }

    async getReadingById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const reading = await utilityService.findReadingById(id); // Service xử lý not found
            res.status(200).json({
                status: 'success',
                data: reading
            });
        } catch (error) {
            next(error);
        }
    }

    async createReading(req: Request, res: Response, next: NextFunction) {
        try {
            const { roomId, type, readingDate, indexValue, billingMonth, billingYear, notes } = req.body;

            // --- Validation cơ bản (Service cũng validate, nhưng thêm ở đây để báo lỗi sớm) ---
            if (!roomId || !type || !readingDate || indexValue === undefined || indexValue === null || !billingMonth || !billingYear) {
                return next(new Error('Thiếu thông tin bắt buộc: roomId, type, readingDate, indexValue, billingMonth, billingYear.'));
            }
            if (!Object.values(UtilityType).includes(type as UtilityType)) {
                return next(new Error(`Loại công tơ không hợp lệ: ${type}`));
            }
            try { // Validate date format
                new Date(readingDate);
            } catch {
                return next(new Error('Định dạng readingDate không hợp lệ.'));
            }
            // --- Kết thúc Validation ---

            const createData = {
                roomId: parseInt(roomId),
                type: type as UtilityType,
                readingDate, // Service sẽ chuyển thành Date
                indexValue: parseFloat(indexValue),
                billingMonth: parseInt(billingMonth),
                billingYear: parseInt(billingYear),
                notes
            };

            const newReading = await utilityService.createReading(createData);
            res.status(201).json({
                status: 'success',
                data: newReading
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }

    async updateReading(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            // Chỉ cho phép cập nhật một số trường
            const { readingDate, indexValue, notes } = req.body;

            // --- Validation ---
            if (indexValue !== undefined && indexValue !== null && isNaN(parseFloat(indexValue as any))) {
                return next(new Error('indexValue phải là số.'));
            }
            if (readingDate) {
                try { new Date(readingDate); } catch { return next(new Error('Định dạng readingDate không hợp lệ.')); }
            }
            // --- Kết thúc Validation ---

            const updateData = {
                readingDate, // Service sẽ chuyển thành Date nếu có
                indexValue: indexValue !== undefined && indexValue !== null ? parseFloat(indexValue) : undefined,
                notes
            };

            const updatedReading = await utilityService.updateReading(id, updateData);
            res.status(200).json({
                status: 'success',
                data: updatedReading
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }

    async deleteReading(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            await utilityService.deleteReading(id); // Service xử lý not found
            res.status(200).json({
                status: 'success',
                message: 'Bản ghi chỉ số đã được xóa thành công.',
                data: null
            });
        } catch (error) {
            next(error);
        }
    }
}

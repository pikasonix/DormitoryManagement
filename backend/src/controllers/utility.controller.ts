import { Request, Response, NextFunction } from 'express';
import { UtilityService } from '../services/utility.service';
import { Prisma, UtilityType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


const utilityService = new UtilityService();

export class UtilityController {

    async getAllReadings(req: Request, res: Response, next: NextFunction) {
        try {
            const { roomId, type, month, year, page, limit, buildingId } = req.query;

            const options: Prisma.UtilityMeterReadingFindManyArgs = { where: {} };

            // Xây dựng bộ lọc
            if (roomId) options.where!.roomId = parseInt(roomId as string);
            if (type && Object.values(UtilityType).includes(type as UtilityType)) {
                options.where!.type = type as UtilityType;
            } else if (type) {
                return next(new Error(`Loại công tơ không hợp lệ: ${type}`));
            }
            if (month) options.where!.billingMonth = parseInt(month as string);
            if (year) options.where!.billingYear = parseInt(year as string);
            if (buildingId) options.where!.room = { buildingId: parseInt(buildingId as string) };

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 20; // Mặc định 20 item/trang
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;
            options.orderBy = [{ readingDate: 'desc' }, { roomId: 'asc' }]; // Sắp xếp

            // Lấy tổng số bản ghi
            const totalRecords = await prisma.utilityMeterReading.count({ where: options.where });
            const readings = await utilityService.findAllReadings(options);

            res.status(200).json({
                status: 'success',
                results: readings.length,
                total: totalRecords,
                data: readings
            });
        } catch (error) {
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

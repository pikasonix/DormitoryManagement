import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../services/maintenance.service';
import { deleteFile } from '../services/file.service'; // Import hàm xóa file
import { PrismaClient, Prisma, MaintenanceStatus } from '@prisma/client'; // Import PrismaClient, Prisma và Enum

const prisma = new PrismaClient(); // Initialize PrismaClient

const maintenanceService = new MaintenanceService();

export class MaintenanceController {

    async getAllMaintenances(req: Request, res: Response, next: NextFunction) {
        try {
            // Lấy các tham số lọc từ query string
            const { roomId, roomNumber, buildingName, status, assignedToId, buildingId, page, limit, id } = req.query;

            console.log('[API] Maintenance filter params:', { roomId, roomNumber, buildingName, status, assignedToId, page, limit, id });

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;

            const options: Prisma.MaintenanceFindManyArgs = { where: {} };

            // Xây dựng điều kiện lọc
            if (id) options.where!.id = parseInt(id as string);
            if (status) {
                // Chuyển đổi status thành chữ hoa để khớp với Enum
                const normalizedStatus = typeof status === 'string'
                    ? status.toUpperCase()
                    : String(status).toUpperCase();

                if (Object.values(MaintenanceStatus).includes(normalizedStatus as MaintenanceStatus)) {
                    options.where!.status = normalizedStatus as MaintenanceStatus;
                }
            }
            if (assignedToId) options.where!.assignedToId = parseInt(assignedToId as string);

            // QUAN TRỌNG: Xử lý điều kiện lọc liên quan đến phòng
            if (roomId) {
                const roomQuery = roomId as string;
                console.log(`[API] Processing room filter: "${roomQuery}"`);

                // Trường hợp: tìm chính xác theo tòa nhà (B3, B9) - Pattern đầy đủ
                const exactBuildingPattern = /^B\d+$/i;
                if (exactBuildingPattern.test(roomQuery)) {
                    console.log(`[API] Exact building search for: ${roomQuery}`);

                    // Tìm chính xác tên tòa nhà
                    options.where = {
                        ...options.where,
                        room: {
                            building: {
                                name: {
                                    equals: roomQuery.toUpperCase(),
                                    mode: 'insensitive' as Prisma.QueryMode
                                }
                            }
                        }
                    };
                }
                // Trường hợp: tìm theo chữ cái "B" - hiển thị tất cả tòa B
                else if (roomQuery.toUpperCase() === 'B') {
                    console.log(`[API] Building prefix search for: ${roomQuery}`);

                    options.where = {
                        ...options.where,
                        room: {
                            building: {
                                name: {
                                    startsWith: roomQuery.toUpperCase(),
                                    mode: 'insensitive' as Prisma.QueryMode
                                }
                            }
                        }
                    };
                }
                // Trường hợp: tìm theo số phòng chính xác (203, 101)
                else if (/^\d+[A-Za-z]?$/.test(roomQuery)) {
                    console.log(`[API] Room number search for: ${roomQuery}`);

                    // Tìm kiếm contains thay vì equals
                    options.where = {
                        ...options.where,
                        room: {
                            number: {
                                contains: roomQuery,
                                mode: 'insensitive' as Prisma.QueryMode
                            }
                        }
                    };
                }
                // Trường hợp: tìm theo kết hợp số phòng và tòa nhà
                else {
                    // Hỗ trợ nhiều định dạng: "105 B3", "105-B3", "105(B3)", "105 - B3", "105 ( B3 )"
                    const combinedRoomPattern = /^(\d+[A-Za-z]?)\s*[-\s(]*\s*([Bb]\d+)\s*[\s)]*$/;
                    const combinedMatches = roomQuery.match(combinedRoomPattern);

                    if (combinedMatches && combinedMatches.length >= 3) {
                        const roomNumber = combinedMatches[1].trim();
                        const buildingName = combinedMatches[2].trim();

                        console.log(`[API] Combined search: room=${roomNumber}, building=${buildingName}`);

                        options.where = {
                            ...options.where,
                            room: {
                                number: {
                                    equals: roomNumber,
                                    mode: 'insensitive' as Prisma.QueryMode
                                },
                                building: {
                                    name: {
                                        equals: buildingName.toUpperCase(),
                                        mode: 'insensitive' as Prisma.QueryMode
                                    }
                                }
                            }
                        };
                    }
                    // Tìm kiếm tổng quát
                    else {
                        console.log(`[API] General search for: ${roomQuery}`);

                        options.where = {
                            ...options.where,
                            OR: [
                                {
                                    room: {
                                        number: {
                                            contains: roomQuery,
                                            mode: 'insensitive' as Prisma.QueryMode
                                        }
                                    }
                                },
                                {
                                    room: {
                                        building: {
                                            name: {
                                                contains: roomQuery,
                                                mode: 'insensitive' as Prisma.QueryMode
                                            }
                                        }
                                    }
                                }
                            ]
                        };
                    }
                }
            }

            // Các điều kiện khác nếu không có roomId
            if (roomNumber) {
                options.where!.room = {
                    number: {
                        contains: roomNumber as string,
                        mode: 'insensitive' as Prisma.QueryMode
                    }
                };
            }

            // Lọc theo tòa nhà
            if (buildingId) {
                // Đảm bảo options.where!.room đã được khởi tạo
                if (!options.where!.room) {
                    options.where!.room = {};
                }

                const buildingIdNum = parseInt(buildingId as string);
                if (!isNaN(buildingIdNum)) {
                    options.where!.room.buildingId = buildingIdNum;
                }
            }
            // Hoặc lọc theo tên tòa nhà
            else if (buildingName) {
                // Đảm bảo options.where!.room đã được khởi tạo
                if (!options.where!.room) {
                    options.where!.room = {};
                }

                options.where!.room.building = {
                    name: {
                        contains: buildingName as string,
                        mode: 'insensitive' as Prisma.QueryMode
                    }
                };
            }

            // Áp dụng phân trang
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;

            console.log('[API] Final query options:', JSON.stringify(options.where));

            // Lấy tổng số bản ghi (cho phân trang phía client)
            const totalRecords = await prisma.maintenance.count({ where: options.where });
            const maintenances = await maintenanceService.findAll(options);

            console.log(`[API] Query results: ${maintenances.length} records found`);

            res.status(200).json({
                status: 'success',
                results: maintenances.length,
                total: totalRecords, // Trả về tổng số bản ghi
                data: maintenances
            });
        } catch (error) {
            console.error('[API] Maintenance search error:', error);
            next(error);
        }
    }

    async getMaintenanceById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const maintenance = await maintenanceService.findById(id); // Service đã xử lý lỗi not found
            res.status(200).json({
                status: 'success',
                data: maintenance
            });
        } catch (error) {
            next(error);
        }
    }

    async createMaintenance(req: Request, res: Response, next: NextFunction) {
        try {
            const { roomId, issue, notes, imageIds, assignedToId, status } = req.body;
            const reporterUserId = req.user?.userId; // Lấy userId của người dùng đang đăng nhập

            if (!reporterUserId) {
                return next(new Error('Không tìm thấy thông tin người dùng báo cáo.')); // Hoặc AppError 401
            }
            if (!roomId || !issue) {
                return next(new Error('Thiếu thông tin bắt buộc: roomId, issue.')); // Hoặc AppError 400
            }

            // Kiểm tra xem có phải sinh viên không (cần thiết vì reportedById giờ là userId)
            const reporterProfile = await prisma.studentProfile.findUnique({
                where: { userId: reporterUserId },
                select: { id: true }
            });

            if (!reporterProfile) {
                // Có thể là Staff/Admin báo cáo? Hoặc lỗi? Cần xác định logic.
                // Tạm thời báo lỗi nếu không phải sinh viên
                return next(new Error('Chỉ sinh viên mới có thể tạo báo cáo bảo trì qua API này.')); // Hoặc AppError 403
            }

            const createData = {
                roomId: parseInt(roomId),
                reportedById: reporterUserId, // Sử dụng userId trực tiếp thay vì profile.id
                issue,
                notes,
                imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number) : [Number(imageIds)]) : undefined,
                assignedToId: assignedToId ? parseInt(assignedToId) : undefined,
                status: status as MaintenanceStatus // Cần validate enum
            };

            const newMaintenance = await maintenanceService.create(createData);
            res.status(201).json({
                status: 'success',
                data: newMaintenance
            });
        } catch (error) {
            next(error);
        }
    }

    async updateMaintenance(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const { issue, status, assignedToId, notes, imageIds } = req.body;

            const updateData = {
                issue,
                status: status as MaintenanceStatus, // Cần validate enum
                // Xử lý assignedToId: nếu gửi rỗng hoặc null -> disconnect
                assignedToId: assignedToId !== undefined ? (assignedToId ? parseInt(assignedToId) : null) : undefined,
                notes,
                // Đảm bảo imageIds là mảng số
                imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number).filter(n => !isNaN(n)) : [Number(imageIds)].filter(n => !isNaN(n))) : undefined
            };

            const { maintenance, oldImagePaths } = await maintenanceService.update(id, updateData);

            // Xóa file ảnh vật lý cũ sau khi cập nhật DB thành công
            if (oldImagePaths.length > 0 && typeof deleteFile === 'function') {
                await Promise.allSettled(oldImagePaths.map(filePath => deleteFile(filePath)));
            } else if (oldImagePaths.length > 0) {
                console.warn(`[MaintenanceController] deleteFile function not available, cannot delete old maintenance images.`);
            }


            res.status(200).json({
                status: 'success',
                data: maintenance
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteMaintenance(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const { oldImagePaths } = await maintenanceService.delete(id);

            // Xóa file ảnh vật lý cũ sau khi xóa DB thành công
            if (oldImagePaths.length > 0 && typeof deleteFile === 'function') {
                await Promise.allSettled(oldImagePaths.map(filePath => deleteFile(filePath)));
            } else if (oldImagePaths.length > 0) {
                console.warn(`[MaintenanceController] deleteFile function not available, cannot delete maintenance images.`);
            }


            res.status(200).json({
                status: 'success',
                message: 'Yêu cầu bảo trì đã được xóa thành công.',
                data: null
            });
        } catch (error) {
            next(error);
        }
    }
}
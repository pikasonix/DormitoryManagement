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
            const { roomId, status, assignedToId, buildingId, page, limit } = req.query;

            const options: Prisma.MaintenanceFindManyArgs = { where: {} };

            // Xây dựng điều kiện lọc
            if (status) options.where!.status = status as MaintenanceStatus;
            if (assignedToId) options.where!.assignedToId = parseInt(assignedToId as string);
            if (roomId) options.where!.roomId = parseInt(roomId as string);
            if (buildingId) options.where!.room = { buildingId: parseInt(buildingId as string) };

            // Phân trang (ví dụ)
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;

            // Lấy tổng số bản ghi (cho phân trang phía client)
            const totalRecords = await prisma.maintenance.count({ where: options.where });
            const maintenances = await maintenanceService.findAll(options);

            res.status(200).json({
                status: 'success',
                results: maintenances.length,
                total: totalRecords, // Trả về tổng số bản ghi
                data: maintenances
            });
        } catch (error) {
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
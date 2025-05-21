import { Request, Response, NextFunction } from 'express';
import { VehicleService } from '../services/vehicle.service';
import { deleteFile } from '../services/file.service';
import { Prisma, VehicleType, FeeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vehicleService = new VehicleService();

export class VehicleController {
    async getAllRegistrations(req: Request, res: Response, next: NextFunction) {
        try {
            const { studentProfileId, vehicleType, isActive, licensePlate, parkingCardNo, hasParkingCardNo, page, limit } = req.query;
            const requesterUserId = req.user?.userId;
            const requesterRole = req.user?.role;

            const options: Prisma.VehicleRegistrationFindManyArgs = { where: {} };

            // Nếu là sinh viên, chỉ cho xem xe của chính mình
            if (requesterRole === 'STUDENT') {
                const studentProfile = await prisma.studentProfile.findUnique({
                    where: { userId: requesterUserId },
                    select: { id: true }
                });

                if (!studentProfile) {
                    return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                }

                // Luôn filter theo studentProfileId của chính sinh viên đó
                options.where!.studentProfileId = studentProfile.id;
            }
            // Admin/Staff có thể xem tất cả hoặc lọc theo studentProfileId
            else if (requesterRole === 'ADMIN' || requesterRole === 'STAFF') {
                if (studentProfileId) options.where!.studentProfileId = parseInt(studentProfileId as string);
            }

            // Các bộ lọc khác
            if (vehicleType && Object.values(VehicleType).includes(vehicleType as VehicleType)) {
                options.where!.vehicleType = vehicleType as VehicleType;
            } else if (vehicleType) {
                return next(new Error(`Loại xe không hợp lệ: ${vehicleType}`));
            }
            if (isActive !== undefined) options.where!.isActive = isActive === 'true';
            if (licensePlate) options.where!.licensePlate = { contains: licensePlate as string, mode: 'insensitive' }; // Tìm kiếm biển số
            if (parkingCardNo) options.where!.parkingCardNo = parkingCardNo as string;

            // Lọc xe có hoặc không có parkingCardNo
            if (hasParkingCardNo !== undefined) {
                if (hasParkingCardNo === 'true') {
                    options.where!.parkingCardNo = { not: null };
                } else {
                    options.where!.parkingCardNo = null;
                }
            }

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;
            options.orderBy = { createdAt: 'desc' };

            // Lấy tổng số bản ghi
            const totalRecords = await prisma.vehicleRegistration.count({ where: options.where });
            const registrations = await vehicleService.findAll(options);

            res.status(200).json({
                status: 'success',
                results: registrations.length,
                total: totalRecords,
                data: registrations
            });
        } catch (error) {
            next(error);
        }
    } async getRegistrationById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const requesterUserId = req.user?.userId;
            const requesterRole = req.user?.role;

            // Lấy thông tin xe trước
            const registration = await vehicleService.findById(id); // Service xử lý not found

            // Kiểm tra xem có tìm thấy xe không
            if (!registration) {
                return next(new Error('Không tìm thấy thông tin xe.'));
            }

            // Kiểm tra quyền xem chi tiết
            if (requesterRole === 'STUDENT') {
                // Nếu là sinh viên, chỉ xem được xe của chính mình
                const studentProfile = await prisma.studentProfile.findUnique({
                    where: { userId: requesterUserId },
                    select: { id: true }
                });

                if (!studentProfile) {
                    return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                }

                // Nếu không phải xe của họ, từ chối truy cập
                if (registration.studentProfileId !== studentProfile.id) {
                    return next(new Error('Bạn không có quyền xem thông tin xe này.'));
                }
            }

            res.status(200).json({
                status: 'success',
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    // Sinh viên hoặc Admin/Staff tạo đăng ký
    async createRegistration(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                studentProfileId, // Có thể lấy từ req.user nếu là sinh viên tự đăng ký, hoặc từ body nếu Admin/Staff tạo hộ
                vehicleType, licensePlate, startDate,
                brand, model, color, parkingCardNo, isActive, endDate, notes, imageIds
            } = req.body;
            const requesterUserId = req.user?.userId;
            const requesterRole = req.user?.role;

            let targetStudentProfileId: number;

            // Xác định ID sinh viên cần đăng ký xe cho
            if (requesterRole === 'STUDENT') {
                // Sinh viên tự đăng ký
                const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: requesterUserId }, select: { id: true } });
                if (!studentProfile) return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                targetStudentProfileId = studentProfile.id;
                // Không cho sinh viên tự set parkingCardNo, isActive, endDate
                if (parkingCardNo !== undefined || isActive !== undefined || endDate !== undefined) {
                    console.warn(`Student (User ID: ${requesterUserId}) attempted to set restricted fields during vehicle registration.`);
                    // return next(new Error('Bạn không có quyền đặt số thẻ, trạng thái hoặc ngày kết thúc.'));
                }

            } else if ((requesterRole === 'ADMIN' || requesterRole === 'STAFF') && studentProfileId) {
                // Admin/Staff đăng ký hộ
                targetStudentProfileId = parseInt(studentProfileId);
                if (isNaN(targetStudentProfileId)) return next(new Error('studentProfileId không hợp lệ.'));
            } else {
                return next(new Error('Không thể xác định sinh viên để đăng ký xe.')); // Hoặc AppError 400/403
            }


            // Validate VehicleType enum
            if (!vehicleType || !Object.values(VehicleType).includes(vehicleType as VehicleType)) {
                return next(new Error(`Loại xe không hợp lệ: ${vehicleType}`));
            }


            const createData = {
                studentProfileId: targetStudentProfileId,
                vehicleType: vehicleType as VehicleType,
                licensePlate,
                startDate, // Service sẽ chuyển thành Date
                brand, model, color, notes,                // Chỉ Admin/Staff mới được set các trường này khi tạo
                parkingCardNo: (requesterRole !== 'STUDENT' ? parkingCardNo : undefined),
                isActive: (requesterRole !== 'STUDENT' ? (isActive !== undefined ? isActive : true) : false), // Sinh viên tự đăng ký thì mặc định inactive (false) để đợi duyệt
                endDate: (requesterRole !== 'STUDENT' ? endDate : undefined),
                imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number) : [Number(imageIds)]) : undefined
            };

            const newRegistration = await vehicleService.create(createData);
            res.status(201).json({
                status: 'success',
                data: newRegistration
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }

    // Admin/Staff cập nhật đăng ký xe
    async updateRegistration(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            // Lấy dữ liệu cập nhật từ body
            const { vehicleType, licensePlate, brand, model, color, parkingCardNo, isActive, startDate, endDate, notes, imageIds } = req.body;

            // Validate VehicleType enum
            if (vehicleType && !Object.values(VehicleType).includes(vehicleType as VehicleType)) {
                return next(new Error(`Loại xe không hợp lệ: ${vehicleType}`));
            }


            const updateData = {
                vehicleType: vehicleType as VehicleType,
                licensePlate, brand, model, color, parkingCardNo, isActive, startDate, endDate, notes,
                // Đảm bảo imageIds là mảng số
                imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number).filter(n => !isNaN(n)) : [Number(imageIds)].filter(n => !isNaN(n))) : undefined
            };

            const { registration, oldImagePaths } = await vehicleService.update(id, updateData);

            // Xóa file ảnh vật lý cũ
            if (oldImagePaths.length > 0 && typeof deleteFile === 'function') {
                await Promise.allSettled(oldImagePaths.map(filePath => deleteFile(filePath)));
            } else if (oldImagePaths.length > 0) {
                console.warn(`[VehicleController] deleteFile function not available, cannot delete old vehicle images.`);
            }

            res.status(200).json({
                status: 'success',
                data: registration
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }    // Admin/Staff xóa đăng ký xe hoặc sinh viên hủy đăng ký xe chờ duyệt của chính mình
    async deleteRegistration(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const requesterUserId = req.user?.userId;
            const requesterRole = req.user?.role;

            // Kiểm tra quyền xóa
            if (requesterRole === 'STUDENT') {
                // Nếu là sinh viên, kiểm tra xem xe có phải của họ không
                const studentProfile = await prisma.studentProfile.findUnique({
                    where: { userId: requesterUserId },
                    select: { id: true }
                });

                if (!studentProfile) {
                    return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                }

                // Kiểm tra xe có thuộc sở hữu của sinh viên này không
                const vehicle = await prisma.vehicleRegistration.findUnique({
                    where: { id },
                    select: { studentProfileId: true, isActive: true, parkingCardNo: true }
                });

                if (!vehicle) {
                    return next(new Error('Không tìm thấy thông tin xe.'));
                }

                if (vehicle.studentProfileId !== studentProfile.id) {
                    return next(new Error('Bạn không có quyền xóa thông tin xe này.'));
                }

                // Sinh viên chỉ được xóa xe đang chờ duyệt (isActive = false và chưa có parkingCardNo)
                if (vehicle.isActive || vehicle.parkingCardNo) {
                    return next(new Error('Bạn chỉ có thể hủy đăng ký xe đang chờ duyệt.'));
                }
            }

            // Thực hiện xóa
            const { oldImagePaths } = await vehicleService.delete(id); // Service xử lý not found và transaction xóa

            // Xóa file ảnh vật lý cũ
            if (oldImagePaths.length > 0 && typeof deleteFile === 'function') {
                await Promise.allSettled(oldImagePaths.map(filePath => deleteFile(filePath)));
            } else if (oldImagePaths.length > 0) {
                console.warn(`[VehicleController] deleteFile function not available, cannot delete vehicle images.`);
            }

            res.status(200).json({
                status: 'success',
                message: 'Đăng ký xe đã được xóa thành công.',
                data: null
            });
        } catch (error) {
            next(error);
        }
    }
}
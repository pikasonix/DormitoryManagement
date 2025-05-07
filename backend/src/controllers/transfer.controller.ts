import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../services/transfer.service';
import { PrismaClient, Prisma, TransferStatus } from '@prisma/client';

const prisma = new PrismaClient();

const transferService = new TransferService();

export class TransferController {

    async getAllTransfers(req: Request, res: Response, next: NextFunction) {
        try {
            const { studentProfileId, fromRoomId, toRoomId, status, page, limit, identifier, studentId } = req.query;

            const options: Prisma.RoomTransferFindManyArgs = { where: {} };

            // Xây dựng bộ lọc
            if (studentProfileId) options.where!.studentProfileId = parseInt(studentProfileId as string);
            if (fromRoomId) options.where!.fromRoomId = parseInt(fromRoomId as string);
            if (toRoomId) options.where!.toRoomId = parseInt(toRoomId as string);

            // Xử lý khi có tham số studentId (mã số sinh viên)
            if (studentId) {
                // Tìm studentProfile có studentId chứa studentId
                const matchingStudents = await prisma.studentProfile.findMany({
                    where: {
                        studentId: {
                            contains: studentId as string,
                            mode: 'insensitive' // Case-insensitive search
                        }
                    },
                    select: { id: true }
                });

                if (matchingStudents.length > 0) {
                    const studentIds = matchingStudents.map(student => student.id);
                    options.where!.studentProfileId = { in: studentIds };
                } else {
                    // Nếu không tìm thấy kết quả nào, trả về mảng rỗng
                    options.where!.id = -1; // Không có ID nào là -1, đảm bảo không có kết quả trả về
                }
            }

            // Xử lý tìm kiếm theo mã SV/phòng qua tham số identifier
            if (identifier) {
                const searchTerm = (identifier as string).trim();

                // Tìm studentProfile có studentId chứa searchTerm
                const matchingStudents = await prisma.studentProfile.findMany({
                    where: {
                        studentId: {
                            contains: searchTerm,
                            mode: 'insensitive' // Case-insensitive search
                        }
                    },
                    select: { id: true }
                });

                // Tìm phòng có số phòng hoặc tên tòa nhà chứa searchTerm
                const matchingRooms = await prisma.room.findMany({
                    where: {
                        OR: [
                            { number: { contains: searchTerm, mode: 'insensitive' } },
                            { building: { name: { contains: searchTerm, mode: 'insensitive' } } }
                        ]
                    },
                    select: { id: true }
                });

                type OrConditionType =
                    | { studentProfileId: number }
                    | { fromRoomId: number }
                    | { toRoomId: number };
                const orConditions: OrConditionType[] = [];

                if (matchingStudents.length > 0) {
                    orConditions.push(...matchingStudents.map(student => ({ studentProfileId: student.id })));
                }
                // Add room conditions for both fromRoomId and toRoomId
                if (matchingRooms.length > 0) {
                    orConditions.push(...matchingRooms.map(room => ({ fromRoomId: room.id })));
                    orConditions.push(...matchingRooms.map(room => ({ toRoomId: room.id })));
                }

                if (orConditions.length > 0) {
                    if (options.where!.OR) {
                        options.where!.AND = [
                            { OR: options.where!.OR },
                            { OR: orConditions }
                        ];
                        delete options.where!.OR;
                    } else {
                        options.where!.OR = orConditions;
                    }
                } else {
                    // Nếu không tìm thấy kết quả nào, trả về mảng rỗng
                    options.where!.id = -1; // Không có ID nào là -1, đảm bảo không có kết quả trả về
                }
            }

            // Validate và xử lý trạng thái
            if (status) {
                if (Object.values(TransferStatus).includes(status as TransferStatus)) {
                    options.where!.status = status as TransferStatus;
                } else {
                    return next(new Error(`Trạng thái chuyển phòng không hợp lệ: ${status}`));
                }
            }

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;
            options.orderBy = { createdAt: 'desc' };

            // Lấy tổng số bản ghi
            const totalRecords = await prisma.roomTransfer.count({ where: options.where });
            const transfers = await transferService.findAll(options);

            res.status(200).json({
                status: 'success',
                results: transfers.length,
                total: totalRecords,
                data: transfers
            });
        } catch (error) {
            next(error);
        }
    }

    async getTransferById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const transfer = await transferService.findById(id); // Service xử lý not found
            res.status(200).json({
                status: 'success',
                data: transfer
            });
        } catch (error) {
            next(error);
        }
    }

    // Sinh viên tạo yêu cầu chuyển phòng
    async createTransferRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const studentUserId = req.user?.userId;
            const { toRoomId, transferDate, reason } = req.body;

            if (!studentUserId) {
                return next(new Error('Không tìm thấy thông tin người dùng yêu cầu.')); // Hoặc AppError 401
            }
            if (!toRoomId || !transferDate) {
                return next(new Error('Thiếu thông tin bắt buộc: toRoomId, transferDate.')); // Hoặc AppError 400
            }

            // Tìm StudentProfile ID của người yêu cầu
            const studentProfile = await prisma.studentProfile.findUnique({
                where: { userId: studentUserId },
                select: { id: true }
            });
            if (!studentProfile) {
                return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.')); // Hoặc AppError 404
            }


            const createData = {
                studentProfileId: studentProfile.id, // Dùng ID profile
                toRoomId: parseInt(toRoomId),
                transferDate, // Service sẽ chuyển thành Date
                reason
            };

            const newTransfer = await transferService.create(createData);
            res.status(201).json({
                status: 'success',
                data: newTransfer
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }

    // Admin/Staff cập nhật trạng thái yêu cầu
    async updateTransferStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const { status } = req.body; // Chỉ nhận status từ body
            const approverUserId = req.user?.userId; // ID của Staff/Admin đang thực hiện

            if (!status || !Object.values(TransferStatus).includes(status as TransferStatus)) {
                return next(new Error(`Trạng thái chuyển phòng không hợp lệ: ${status}`));
            }
            if (!approverUserId) {
                return next(new Error('Không tìm thấy thông tin người duyệt.')); // Hoặc AppError 401
            }

            // Tìm StaffProfile ID của người duyệt
            const staffProfile = await prisma.staffProfile.findUnique({
                where: { userId: approverUserId },
                select: { id: true }
            });
            if (!staffProfile) {
                // Nếu là Admin không có staff profile thì sao? Cần xử lý logic này
                // Tạm thời báo lỗi nếu không phải staff có profile
                return next(new Error('Không tìm thấy hồ sơ nhân viên của người duyệt.')); // Hoặc AppError 404/403
            }


            const updateData = {
                status: status as TransferStatus,
                // Chỉ gán approvedById nếu đang duyệt hoặc hoàn thành
                approvedById: (status === TransferStatus.APPROVED || status === TransferStatus.COMPLETED) ? staffProfile.id : null
            };

            const updatedTransfer = await transferService.updateStatus(id, updateData);
            res.status(200).json({
                status: 'success',
                data: updatedTransfer
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }

    // Admin/Staff (hoặc sinh viên?) xóa yêu cầu (chỉ PENDING/REJECTED)
    async deleteTransfer(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            // Service kiểm tra trạng thái trước khi xóa
            await transferService.delete(id);
            res.status(200).json({
                status: 'success',
                message: 'Yêu cầu chuyển phòng đã được xóa.',
                data: null
            });
        } catch (error) {
            next(error);
        }
    }
}
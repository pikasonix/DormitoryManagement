import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../services/transfer.service';
import { PrismaClient, Prisma, TransferStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

const transferService = new TransferService();

export class TransferController {

    async getAllTransfers(req: Request, res: Response, next: NextFunction) {
        try {
            const { studentProfileId, fromRoomId, toRoomId, status, page, limit, identifier, studentId } = req.query;
            const userId = req.user?.userId;
            const userRole = req.user?.role;

            if (!userId) {
                return next(new Error('Không tìm thấy thông tin người dùng.'));
            }

            const options: Prisma.RoomTransferFindManyArgs = { where: {} };

            // Nếu là sinh viên, chỉ cho xem yêu cầu của chính mình
            if (userRole === Role.STUDENT) {
                const studentProfile = await prisma.studentProfile.findUnique({
                    where: { userId },
                    select: { id: true }
                });

                if (!studentProfile) {
                    return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                }

                options.where!.studentProfileId = studentProfile.id;
            } else {
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
            }

            // Validate và xử lý trạng thái (áp dụng cho cả admin và student)
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
    }    // Admin/Staff cập nhật trạng thái yêu cầu
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

            // Cho phép admin không có staff profile cũng có thể phê duyệt
            const updateData = {
                status: status as TransferStatus,
                // Chỉ gán approvedById nếu có staffProfile và đang duyệt hoặc hoàn thành
                approvedById: staffProfile && (status === TransferStatus.APPROVED || status === TransferStatus.COMPLETED)
                    ? staffProfile.id
                    : null
            }; const updatedTransfer = await transferService.updateStatus(id, updateData);

            // Trả về thông báo tùy chỉnh dựa trên trạng thái
            const successMessage = status === TransferStatus.APPROVED
                ? 'Yêu cầu chuyển phòng đã được phê duyệt thành công'
                : status === TransferStatus.REJECTED
                    ? 'Yêu cầu chuyển phòng đã bị từ chối'
                    : 'Trạng thái yêu cầu chuyển phòng đã được cập nhật';

            res.status(200).json({
                status: 'success',
                message: successMessage,
                data: updatedTransfer
            });
        } catch (error) {
            console.error(`[updateTransferStatus] Error:`, error);
            // Xử lý thông báo lỗi cụ thể
            const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật trạng thái yêu cầu';
            next(new Error(errorMessage)); // Chuyển lỗi từ service hoặc validation
        }
    }

    // Admin/Staff (hoặc sinh viên) xóa yêu cầu (chỉ PENDING/REJECTED)
    async deleteTransfer(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const userId = req.user?.userId;
            const userRole = req.user?.role;

            if (!userId) {
                return next(new Error('Không tìm thấy thông tin người dùng.'));
            }

            // Kiểm tra quyền: Chỉ Admin/Staff hoặc sinh viên sở hữu request đó mới được xóa
            if (userRole === Role.STUDENT) {
                // Nếu là sinh viên, kiểm tra xem request có phải của họ không
                const transfer = await prisma.roomTransfer.findUnique({
                    where: { id },
                    include: { studentProfile: { select: { userId: true } } }
                });

                if (!transfer) {
                    return next(new Error('Không tìm thấy yêu cầu chuyển phòng.'));
                }

                if (transfer.studentProfile?.userId !== userId) {
                    return next(new Error('Bạn không có quyền xóa yêu cầu này.'));
                }

                // Sinh viên chỉ được xóa yêu cầu PENDING hoặc REJECTED
                if (transfer.status !== TransferStatus.PENDING && transfer.status !== TransferStatus.REJECTED) {
                    return next(new Error('Chỉ có thể xóa yêu cầu đang chờ duyệt hoặc đã bị từ chối.'));
                }
            }

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
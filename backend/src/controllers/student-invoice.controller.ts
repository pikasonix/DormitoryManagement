import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { Prisma, InvoiceStatus, PaymentType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const invoiceService = new InvoiceService();

export class StudentInvoiceController {

    // Hàm để lấy danh sách hóa đơn của sinh viên đang đăng nhập
    async getMyInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            const { status, month, year, page, limit } = req.query;

            // Lấy studentProfileId từ user đã xác thực
            const studentProfileId = req.user && typeof req.user === 'object' && 'profileId' in req.user
                ? Number(req.user.profileId)
                : undefined;

            if (!studentProfileId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Không tìm thấy thông tin sinh viên.'
                });
            }

            const options: Prisma.InvoiceFindManyArgs = { where: {} };

            // Lọc hóa đơn theo sinh viên đang đăng nhập
            options.where!.studentProfileId = studentProfileId;

            // Thêm các bộ lọc khác
            if (status) options.where!.status = status as InvoiceStatus;
            if (month) options.where!.billingMonth = parseInt(month as string);
            if (year) options.where!.billingYear = parseInt(year as string);

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;
            options.orderBy = { issueDate: 'desc' };

            // Lấy tổng số bản ghi
            const totalRecords = await prisma.invoice.count({ where: options.where });
            const invoices = await invoiceService.findAll(options);

            res.status(200).json({
                status: 'success',
                results: invoices.length,
                total: totalRecords,
                data: invoices
            });
        } catch (error) {
            next(error);
        }
    }

    // Lấy thông tin chi tiết của một hóa đơn của sinh viên đang đăng nhập
    async getMyInvoiceById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id); const studentProfileId = req.user && typeof req.user === 'object' && 'profileId' in req.user
                ? Number(req.user.profileId)
                : undefined;

            if (!studentProfileId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Không tìm thấy thông tin sinh viên.'
                });
            }

            // Lấy hóa đơn và kiểm tra xem có thuộc về sinh viên hiện tại không
            const invoice = await invoiceService.findById(id);

            if (!invoice) {
                return res.status(404).json({
                    status: 'error',
                    message: `Không tìm thấy hóa đơn với ID ${id}`
                });
            }

            // Kiểm tra xem hóa đơn có thuộc về sinh viên hiện tại hoặc phòng của họ không
            if (invoice.studentProfileId !== studentProfileId) {
                // Nếu không phải hóa đơn cá nhân, kiểm tra xem có phải hóa đơn của phòng mà sinh viên đang ở không
                const student = await prisma.studentProfile.findUnique({
                    where: { id: studentProfileId },
                    select: { roomId: true }
                });

                if (!student?.roomId || invoice.roomId !== student.roomId) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'Bạn không có quyền xem hóa đơn này.'
                    });
                }
            }

            res.status(200).json({
                status: 'success',
                data: invoice
            });
        } catch (error) {
            next(error);
        }
    }
}

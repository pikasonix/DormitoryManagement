import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { Prisma, InvoiceStatus, PaymentType } from '@prisma/client'; // Import Prisma và Enums
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


const invoiceService = new InvoiceService();

export class InvoiceController {

    async getAllInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                studentProfileId, roomId, status, month, year, page, limit,
                invoiceNumber, identifier // Thêm tham số tìm kiếm mới
            } = req.query;

            const options: Prisma.InvoiceFindManyArgs = { where: {} };

            // Xây dựng bộ lọc
            if (studentProfileId) options.where!.studentProfileId = parseInt(studentProfileId as string);
            if (roomId) options.where!.roomId = parseInt(roomId as string);
            if (status) options.where!.status = status as InvoiceStatus; // Cần validate enum
            if (month) options.where!.billingMonth = parseInt(month as string);
            if (year) options.where!.billingYear = parseInt(year as string);

            // Xử lý tìm kiếm theo số hợp đồng
            if (invoiceNumber) {
                const invoiceId = parseInt(invoiceNumber as string);
                if (!isNaN(invoiceId)) {
                    options.where!.id = invoiceId;
                }
            }

            // Xử lý tìm kiếm theo mã SV/phòng
            if (identifier) {
                const searchTerm = (identifier as string).trim();

                // Tìm studentProfile có studentId chứa searchTerm
                const matchingStudents = await prisma.studentProfile.findMany({
                    where: {
                        studentId: {
                            contains: searchTerm
                        }
                    },
                    select: { id: true }
                });

                // Tìm phòng có số phòng chứa searchTerm
                const matchingRooms = await prisma.room.findMany({
                    where: {
                        OR: [
                            { number: { contains: searchTerm } },
                            { building: { name: { contains: searchTerm } } }
                        ]
                    },
                    select: { id: true }
                });

                if (matchingStudents.length > 0 || matchingRooms.length > 0) {
                    options.where!.OR = [
                        ...matchingStudents.map(student => ({ studentProfileId: student.id })),
                        ...matchingRooms.map(room => ({ roomId: room.id }))
                    ];
                } else {
                    // Nếu không tìm thấy kết quả nào, trả về mảng rỗng
                    options.where!.id = -1; // Không có ID hóa đơn nào là -1, đảm bảo không có kết quả trả về
                }
            }

            // Validate Enums nếu cần
            if (status && !Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
                return next(new Error(`Trạng thái hóa đơn không hợp lệ: ${status}`));
            }

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;
            options.orderBy = { issueDate: 'desc' }; // Sắp xếp theo ngày phát hành

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

    async getInvoiceById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const invoice = await invoiceService.findById(id); // Service xử lý not found
            res.status(200).json({
                status: 'success',
                data: invoice
            });
        } catch (error) {
            next(error);
        }
    }

    async createInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const { studentProfileId, roomId, billingMonth, billingYear, dueDate, paymentDeadline, notes, items, status } = req.body;

            // Validation cơ bản đã được service xử lý, nhưng có thể thêm validate ở đây nếu muốn
            if (!items || !Array.isArray(items) || items.length === 0) {
                return next(new Error('Hóa đơn phải có ít nhất một mục (items).'));
            }
            // Validate các items
            for (const item of items) {
                if (!item.type || !item.description || item.amount === undefined || item.amount === null) {
                    return next(new Error('Mỗi mục trong hóa đơn phải có type, description, và amount.'));
                }
                if (!Object.values(PaymentType).includes(item.type as PaymentType)) {
                    return next(new Error(`Loại thanh toán không hợp lệ trong items: ${item.type}`));
                }
                if (isNaN(parseFloat(item.amount))) {
                    return next(new Error(`Số tiền không hợp lệ trong items cho mục: ${item.description}`));
                }
            }


            const createData = {
                studentProfileId,
                roomId,
                billingMonth: parseInt(billingMonth),
                billingYear: parseInt(billingYear),
                dueDate, // Service sẽ chuyển thành Date
                paymentDeadline, // Service sẽ chuyển thành Date
                notes,
                items, // Service sẽ xử lý và tính totalAmount
                status: status as InvoiceStatus // Service sẽ validate enum
            };

            const newInvoice = await invoiceService.create(createData);
            res.status(201).json({
                status: 'success',
                data: newInvoice
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }

    async updateInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            // Chỉ cho phép cập nhật các trường metadata và items
            const { billingMonth, billingYear, dueDate, paymentDeadline, notes, items, status } = req.body;

            // Validate items nếu được cung cấp
            if (items !== undefined) {
                if (!Array.isArray(items)) {
                    return next(new Error('Items phải là một mảng.'));
                }
                for (const item of items) {
                    if (!item.type || !item.description || item.amount === undefined || item.amount === null) {
                        return next(new Error('Mỗi mục trong hóa đơn phải có type, description, và amount.'));
                    }
                    if (!Object.values(PaymentType).includes(item.type as PaymentType)) {
                        return next(new Error(`Loại thanh toán không hợp lệ trong items: ${item.type}`));
                    }
                    if (isNaN(parseFloat(item.amount))) {
                        return next(new Error(`Số tiền không hợp lệ trong items cho mục: ${item.description}`));
                    }
                }
            }

            const updateData = {
                billingMonth: billingMonth ? parseInt(billingMonth) : undefined,
                billingYear: billingYear ? parseInt(billingYear) : undefined,
                dueDate, // Service sẽ chuyển thành Date
                paymentDeadline, // Service sẽ chuyển thành Date
                notes,
                items, // Service sẽ xử lý, tính lại total, xóa/tạo items
                status: status as InvoiceStatus // Service sẽ validate enum
            };

            const updatedInvoice = await invoiceService.update(id, updateData);
            res.status(200).json({
                status: 'success',
                data: updatedInvoice
            });
        } catch (error) {
            next(error); // Chuyển lỗi từ service hoặc validation
        }
    }

    async deleteInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            await invoiceService.delete(id); // Service xử lý not found và transaction xóa
            res.status(200).json({
                status: 'success',
                message: 'Hóa đơn đã được xóa thành công.',
                data: null
            });
        } catch (error) {
            next(error);
        }
    }
}
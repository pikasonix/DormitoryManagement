import { PrismaClient, Prisma, Invoice, InvoiceStatus, PaymentType, InvoiceItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
// import { AppError } from '../types/AppError';

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

// Kiểu dữ liệu cho các mục trong hóa đơn khi tạo/cập nhật
interface InvoiceItemInput {
    type: PaymentType;
    description: string;
    amount: number | string | Decimal; // Chấp nhận nhiều kiểu đầu vào cho số tiền
}

export class InvoiceService {

    /**
     * Tìm kiếm và lấy danh sách hóa đơn.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    async findAll(options?: Prisma.InvoiceFindManyArgs): Promise<Invoice[]> {
        try {
            const invoices = await prisma.invoice.findMany({
                ...options,
                include: { // Include các thông tin liên quan mặc định
                    studentProfile: { // Người nhận hóa đơn (nếu là hóa đơn cá nhân)
                        select: { id: true, fullName: true, studentId: true }
                    },
                    room: { // Phòng nhận hóa đơn (nếu là hóa đơn phòng)
                        select: { id: true, number: true, building: { select: { id: true, name: true } } }
                    },
                    items: true, // Các mục chi tiết trong hóa đơn
                    payments: { // Các thanh toán đã thực hiện cho hóa đơn này
                        select: { id: true, amount: true, paymentDate: true },
                        orderBy: { paymentDate: 'desc' }
                    },
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || { issueDate: 'desc' } // Mặc định sắp xếp theo ngày phát hành mới nhất
            });
            return invoices;
        } catch (error) {
            console.error("[InvoiceService.findAll] Error:", error);
            throw error;
        }
    }

    /**
     * Tìm một hóa đơn bằng ID.
     * @param id ID của Invoice
     * @param options Tùy chọn Prisma findUnique
     * @throws Error nếu không tìm thấy
     */
    async findById(id: number, options?: Prisma.InvoiceFindUniqueArgs): Promise<Invoice | null> {
        if (isNaN(id)) {
            throw new Error('ID hóa đơn không hợp lệ'); // Hoặc AppError 400
        }
        try {
            const invoice = await prisma.invoice.findUnique({
                where: { id },
                ...options,
                include: { // Include chi tiết hơn cho trang chi tiết
                    studentProfile: { include: { user: { select: { email: true, avatar: true } } } },
                    room: { include: { building: true } },
                    items: true,
                    payments: { include: { studentProfile: { select: { id: true, fullName: true } } }, orderBy: { paymentDate: 'desc' } },
                    ...(options?.include || {})
                },
            });

            if (!invoice) {
                throw new Error(`Không tìm thấy hóa đơn với ID ${id}`); // Hoặc AppError 404
            }
            return invoice;
        } catch (error) {
            console.error(`[InvoiceService.findById] Error fetching invoice ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Tạo một hóa đơn mới.
     * @param data Dữ liệu hóa đơn và các mục chi tiết.
     * @throws Error nếu dữ liệu không hợp lệ hoặc lỗi tạo.
     */
    async create(data: {
        studentProfileId?: number | null;
        roomId?: number | null;
        billingMonth: number;
        billingYear: number;
        dueDate: Date | string;
        paymentDeadline: Date | string;
        notes?: string;
        items: InvoiceItemInput[]; // Mảng các mục chi tiết
        status?: InvoiceStatus; // Có thể đặt status ban đầu khác UNPAID
    }): Promise<Invoice> {
        // --- Validation cơ bản ---
        if ((!data.studentProfileId && !data.roomId) || (data.studentProfileId && data.roomId)) {
            throw new Error('Hóa đơn phải thuộc về một Sinh viên hoặc một Phòng, không phải cả hai hoặc không có.'); // Hoặc AppError 400
        }
        if (!data.billingMonth || !data.billingYear || !data.dueDate || !data.paymentDeadline || !data.items || data.items.length === 0) {
            throw new Error('Thiếu thông tin bắt buộc: tháng/năm thanh toán, hạn thanh toán, và ít nhất một mục chi tiết.'); // Hoặc AppError 400
        }
        if (data.studentProfileId && isNaN(parseInt(data.studentProfileId as any))) throw new Error('studentProfileId không hợp lệ.');
        if (data.roomId && isNaN(parseInt(data.roomId as any))) throw new Error('roomId không hợp lệ.');
        // --- Kết thúc Validation ---


        try {
            // Tính tổng số tiền từ các items
            let totalAmount = new Decimal(0);
            const invoiceItemsData: Prisma.InvoiceItemCreateManyInvoiceInput[] = data.items.map(item => {
                const itemAmount = new Decimal(item.amount);
                if (itemAmount.isNaN() || itemAmount.isNegative()) {
                    throw new Error(`Số tiền không hợp lệ cho mục: ${item.description}`);
                }
                // Validate PaymentType enum
                if (!Object.values(PaymentType).includes(item.type as PaymentType)) {
                    throw new Error(`Loại thanh toán không hợp lệ: ${item.type}`);
                }
                totalAmount = totalAmount.add(itemAmount);
                return {
                    type: item.type,
                    description: item.description,
                    amount: itemAmount
                };
            });

            // Tạo hóa đơn và các mục trong một transaction
            const newInvoice = await prisma.invoice.create({
                data: {
                    studentProfileId: data.studentProfileId ? parseInt(data.studentProfileId as any) : null,
                    roomId: data.roomId ? parseInt(data.roomId as any) : null,
                    billingMonth: data.billingMonth,
                    billingYear: data.billingYear,
                    dueDate: new Date(data.dueDate),
                    paymentDeadline: new Date(data.paymentDeadline),
                    totalAmount: totalAmount,
                    paidAmount: 0, // Hóa đơn mới tạo chưa thanh toán
                    status: data.status || InvoiceStatus.UNPAID, // Mặc định là UNPAID
                    notes: data.notes,
                    items: { // Tạo các items lồng nhau
                        createMany: {
                            data: invoiceItemsData,
                            skipDuplicates: false // Không nên có duplicates khi tạo mới
                        }
                    }
                },
                include: { // Include để trả về đủ thông tin
                    studentProfile: { select: { id: true, fullName: true } },
                    room: { select: { id: true, number: true } },
                    items: true,
                    payments: true
                }
            });

            return newInvoice;
        } catch (error) {
            console.error("[InvoiceService.create] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2003') { // Lỗi foreign key (vd: student/room không tồn tại)
                    throw new Error('Không tìm thấy Sinh viên hoặc Phòng được chỉ định.');
                }
                // Xử lý các lỗi Prisma khác nếu cần
            } else if (error instanceof Error && (error.message.includes('Số tiền không hợp lệ') || error.message.includes('Loại thanh toán không hợp lệ'))) {
                throw error; // Ném lại lỗi validation từ items
            }
            throw new Error('Không thể tạo hóa đơn.'); // Lỗi chung
        }
    }

    /**
     * Cập nhật một hóa đơn (chỉ các trường metadata và items).
     * Việc cập nhật paidAmount/status được xử lý khi tạo/sửa/xóa Payment.
     * @param id ID của Invoice
     * @param data Dữ liệu cập nhật (chỉ các trường cho phép và items)
     */
    async update(id: number, data: {
        billingMonth?: number;
        billingYear?: number;
        dueDate?: Date | string;
        paymentDeadline?: Date | string;
        notes?: string;
        items?: InvoiceItemInput[]; // Mảng items mới - sẽ THAY THẾ items cũ
        status?: InvoiceStatus; // Cho phép cập nhật trạng thái thủ công (vd: CANCELLED)
    }): Promise<Invoice> {
        if (isNaN(id)) {
            throw new Error('ID hóa đơn không hợp lệ');
        }
        // Validate status enum nếu có
        if (data.status && !Object.values(InvoiceStatus).includes(data.status as InvoiceStatus)) {
            throw new Error(`Trạng thái hóa đơn không hợp lệ: ${data.status}`);
        }

        try {
            // *** SỬ DỤNG TRANSACTION ***
            const updatedInvoice = await prisma.$transaction(async (tx) => {
                // 1. Chuẩn bị dữ liệu cập nhật cho Invoice
                const invoiceUpdateData: Prisma.InvoiceUpdateInput = {
                    billingMonth: data.billingMonth,
                    billingYear: data.billingYear,
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                    paymentDeadline: data.paymentDeadline ? new Date(data.paymentDeadline) : undefined,
                    notes: data.notes,
                    status: data.status, // Cập nhật status trực tiếp nếu có
                };

                // 2. Xử lý cập nhật Items (Xóa cũ, tạo mới) và tính lại totalAmount nếu items thay đổi
                if (data.items !== undefined) {
                    let newTotalAmount = new Decimal(0);
                    const newItemsData: Prisma.InvoiceItemCreateManyInvoiceInput[] = [];

                    if (Array.isArray(data.items) && data.items.length > 0) {
                        for (const item of data.items) {
                            const itemAmount = new Decimal(item.amount);
                            if (itemAmount.isNaN() || itemAmount.isNegative()) {
                                throw new Error(`Số tiền không hợp lệ cho mục: ${item.description}`);
                            }
                            if (!Object.values(PaymentType).includes(item.type as PaymentType)) {
                                throw new Error(`Loại thanh toán không hợp lệ: ${item.type}`);
                            }
                            newTotalAmount = newTotalAmount.add(itemAmount);
                            newItemsData.push({
                                type: item.type,
                                description: item.description,
                                amount: itemAmount
                            });
                        }
                    } else if (Array.isArray(data.items) && data.items.length === 0) {
                        // Nếu gửi mảng rỗng, nghĩa là xóa hết items và totalAmount = 0
                        newTotalAmount = new Decimal(0);
                    }
                    // Nếu data.items là null hoặc undefined thì không làm gì với items


                    // Cập nhật totalAmount nếu items thay đổi
                    invoiceUpdateData.totalAmount = newTotalAmount;

                    // Xóa items cũ và tạo items mới
                    invoiceUpdateData.items = {
                        deleteMany: {}, // Xóa tất cả items cũ của hóa đơn này
                        createMany: newItemsData.length > 0 ? { data: newItemsData } : undefined // Tạo lại nếu có items mới
                    };

                    // Cần tính lại trạng thái dựa trên totalAmount mới và paidAmount hiện tại
                    const currentInvoice = await tx.invoice.findUnique({ where: { id }, select: { paidAmount: true } });
                    if (currentInvoice) {
                        const currentPaid = currentInvoice.paidAmount;
                        if (newTotalAmount.isZero()) { // Nếu hóa đơn không còn mục nào
                            invoiceUpdateData.status = currentPaid.isZero() ? InvoiceStatus.CANCELLED : InvoiceStatus.PAID; // Coi như đã hủy hoặc đã trả (nếu có paidAmount?)
                            invoiceUpdateData.paidAmount = new Decimal(0); // Reset paidAmount nếu total = 0? Cân nhắc logic
                        } else if (currentPaid.greaterThanOrEqualTo(newTotalAmount)) {
                            invoiceUpdateData.status = InvoiceStatus.PAID;
                        } else if (currentPaid.isPositive()) {
                            invoiceUpdateData.status = InvoiceStatus.PARTIALLY_PAID;
                        } else {
                            invoiceUpdateData.status = InvoiceStatus.UNPAID;
                        }
                        // Chỉ ghi đè status nếu không được cung cấp thủ công trong data
                        if (data.status === undefined) {
                            invoiceUpdateData.status = invoiceUpdateData.status; // Gán status đã tính toán
                        } else {
                            invoiceUpdateData.status = data.status; // Ưu tiên status từ request
                        }
                    }


                } else if (data.status !== undefined) {
                    // Nếu chỉ cập nhật status mà không cập nhật items
                    invoiceUpdateData.status = data.status;
                }


                // 3. Thực hiện cập nhật Invoice
                const invoiceAfterUpdate = await tx.invoice.update({
                    where: { id },
                    data: invoiceUpdateData,
                    include: { // Include để trả về response
                        studentProfile: { select: { id: true, fullName: true } },
                        room: { select: { id: true, number: true } },
                        items: true,
                        payments: true
                    }
                });

                return invoiceAfterUpdate;
            });
            // *** KẾT THÚC TRANSACTION ***

            return updatedInvoice;
        } catch (error) {
            console.error(`[InvoiceService.update] Error updating invoice ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
            } else if (error instanceof Error && (error.message.includes('Số tiền không hợp lệ') || error.message.includes('Loại thanh toán không hợp lệ'))) {
                throw error; // Ném lại lỗi validation từ items
            }
            throw new Error(`Không thể cập nhật hóa đơn với ID ${id}.`);
        }
    }

    /**
     * Xóa một hóa đơn và các mục liên quan.
     * @param id ID của Invoice cần xóa
     * @throws Error nếu không tìm thấy hoặc lỗi xóa
     */
    async delete(id: number): Promise<void> {
        if (isNaN(id)) {
            throw new Error('ID hóa đơn không hợp lệ');
        }
        try {
            // *** SỬ DỤNG TRANSACTION ***
            // Đảm bảo xóa Payments và Items trước khi xóa Invoice (hoặc dùng onDelete: Cascade)
            await prisma.$transaction(async (tx) => {
                // 1. Tìm hóa đơn để đảm bảo tồn tại
                const invoiceExists = await tx.invoice.findUnique({ where: { id } });
                if (!invoiceExists) {
                    throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
                }

                // 2. Xóa các Payments liên quan (Nếu không có onDelete: Cascade từ Payment->Invoice)
                await tx.payment.deleteMany({ where: { invoiceId: id } });

                // 3. Xóa các InvoiceItems liên quan (Thường có onDelete: Cascade từ Item->Invoice nên bước này có thể không cần)
                // await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

                // 4. Xóa Invoice
                await tx.invoice.delete({ where: { id } });

                // Transaction thành công
            });
            // *** KẾT THÚC TRANSACTION ***
        } catch (error) {
            console.error(`[InvoiceService.delete] Error deleting invoice ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
            }
            // Xử lý lỗi foreign key nếu có (P2003) - ít khả năng xảy ra nếu đã xóa payments/items
            throw new Error(`Không thể xóa hóa đơn với ID ${id}.`);
        }
    }
}
import { PrismaClient, Prisma, Invoice, InvoiceStatus, PaymentType, InvoiceItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

interface InvoiceItemInput {
    type: PaymentType;
    description: string;
    amount: number | string | Decimal;
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
                include: {
                    studentProfile: {
                        select: { id: true, fullName: true, studentId: true }
                    },
                    room: {
                        select: { id: true, number: true, building: { select: { id: true, name: true } } }
                    },
                    items: true,
                    payments: {
                        select: { id: true, amount: true, paymentDate: true },
                        orderBy: { paymentDate: 'desc' }
                    },
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || { issueDate: 'desc' }
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
            throw new Error('ID hóa đơn không hợp lệ');
        }
        try {
            const invoice = await prisma.invoice.findUnique({
                where: { id },
                ...options,
                include: {
                    studentProfile: { include: { user: { select: { email: true, avatar: true } } } },
                    room: { include: { building: true } },
                    items: true,
                    payments: { include: { studentProfile: { select: { id: true, fullName: true } } }, orderBy: { paymentDate: 'desc' } },
                    ...(options?.include || {})
                },
            });

            if (!invoice) {
                throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
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
        items: InvoiceItemInput[];
        status?: InvoiceStatus;
    }): Promise<Invoice> {
        if ((!data.studentProfileId && !data.roomId) || (data.studentProfileId && data.roomId)) {
            throw new Error('Hóa đơn phải thuộc về một Sinh viên hoặc một Phòng, không phải cả hai hoặc không có.');
        }
        if (!data.billingMonth || !data.billingYear || !data.dueDate || !data.paymentDeadline || !data.items || data.items.length === 0) {
            throw new Error('Thiếu thông tin bắt buộc: tháng/năm thanh toán, hạn thanh toán, và ít nhất một mục chi tiết.');
        }
        if (data.studentProfileId && isNaN(parseInt(data.studentProfileId as any))) throw new Error('studentProfileId không hợp lệ.');
        if (data.roomId && isNaN(parseInt(data.roomId as any))) throw new Error('roomId không hợp lệ.');

        try {
            let totalAmount = new Decimal(0);
            const invoiceItemsData: Prisma.InvoiceItemCreateManyInvoiceInput[] = data.items.map(item => {
                const itemAmount = new Decimal(item.amount);
                if (itemAmount.isNaN() || itemAmount.isNegative()) {
                    throw new Error(`Số tiền không hợp lệ cho mục: ${item.description}`);
                }
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

            const newInvoice = await prisma.invoice.create({
                data: {
                    studentProfileId: data.studentProfileId ? parseInt(data.studentProfileId as any) : null,
                    roomId: data.roomId ? parseInt(data.roomId as any) : null,
                    billingMonth: data.billingMonth,
                    billingYear: data.billingYear,
                    dueDate: new Date(data.dueDate),
                    paymentDeadline: new Date(data.paymentDeadline),
                    totalAmount: totalAmount,
                    paidAmount: 0,
                    status: data.status || InvoiceStatus.UNPAID,
                    notes: data.notes,
                    items: {
                        createMany: {
                            data: invoiceItemsData,
                            skipDuplicates: false
                        }
                    }
                },
                include: {
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
                if (error.code === 'P2003') {
                    throw new Error('Không tìm thấy Sinh viên hoặc Phòng được chỉ định.');
                }
            } else if (error instanceof Error && (error.message.includes('Số tiền không hợp lệ') || error.message.includes('Loại thanh toán không hợp lệ'))) {
                throw error;
            }
            throw new Error('Không thể tạo hóa đơn.');
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
        items?: InvoiceItemInput[];
        status?: InvoiceStatus;
    }): Promise<Invoice> {
        if (isNaN(id)) {
            throw new Error('ID hóa đơn không hợp lệ');
        }
        if (data.status && !Object.values(InvoiceStatus).includes(data.status as InvoiceStatus)) {
            throw new Error(`Trạng thái hóa đơn không hợp lệ: ${data.status}`);
        }

        try {
            const updatedInvoice = await prisma.$transaction(async (tx) => {
                const invoiceUpdateData: Prisma.InvoiceUpdateInput = {
                    billingMonth: data.billingMonth,
                    billingYear: data.billingYear,
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                    paymentDeadline: data.paymentDeadline ? new Date(data.paymentDeadline) : undefined,
                    notes: data.notes,
                    status: data.status,
                };

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
                        newTotalAmount = new Decimal(0);
                    }

                    invoiceUpdateData.totalAmount = newTotalAmount;

                    invoiceUpdateData.items = {
                        deleteMany: {},
                        createMany: newItemsData.length > 0 ? { data: newItemsData } : undefined
                    };

                    const currentInvoice = await tx.invoice.findUnique({ where: { id }, select: { paidAmount: true } });
                    if (currentInvoice) {
                        const currentPaid = currentInvoice.paidAmount;
                        if (newTotalAmount.isZero()) {
                            invoiceUpdateData.status = currentPaid.isZero() ? InvoiceStatus.CANCELLED : InvoiceStatus.PAID;
                            invoiceUpdateData.paidAmount = new Decimal(0);
                        } else if (currentPaid.greaterThanOrEqualTo(newTotalAmount)) {
                            invoiceUpdateData.status = InvoiceStatus.PAID;
                        } else if (currentPaid.isPositive()) {
                            invoiceUpdateData.status = InvoiceStatus.PARTIALLY_PAID;
                        } else {
                            invoiceUpdateData.status = InvoiceStatus.UNPAID;
                        }

                        if (data.status === undefined) {
                            invoiceUpdateData.status = invoiceUpdateData.status;
                        } else {
                            invoiceUpdateData.status = data.status;
                        }
                    }
                } else if (data.status !== undefined) {
                    invoiceUpdateData.status = data.status;
                }

                const invoiceAfterUpdate = await tx.invoice.update({
                    where: { id },
                    data: invoiceUpdateData,
                    include: {
                        studentProfile: { select: { id: true, fullName: true } },
                        room: { select: { id: true, number: true } },
                        items: true,
                        payments: true
                    }
                });

                return invoiceAfterUpdate;
            });

            return updatedInvoice;
        } catch (error) {
            console.error(`[InvoiceService.update] Error updating invoice ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
            } else if (error instanceof Error && (error.message.includes('Số tiền không hợp lệ') || error.message.includes('Loại thanh toán không hợp lệ'))) {
                throw error;
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
            await prisma.$transaction(async (tx) => {
                const invoiceExists = await tx.invoice.findUnique({ where: { id } });
                if (!invoiceExists) {
                    throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
                }

                await tx.payment.deleteMany({ where: { invoiceId: id } });

                await tx.invoice.delete({ where: { id } });
            });
        } catch (error) {
            console.error(`[InvoiceService.delete] Error deleting invoice ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
            }
            throw new Error(`Không thể xóa hóa đơn với ID ${id}.`);
        }
    }
}
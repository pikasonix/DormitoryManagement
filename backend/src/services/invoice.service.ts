import { PrismaClient, Prisma, Invoice, InvoiceStatus, PaymentType, InvoiceItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

interface InvoiceItemInput {
    type: PaymentType;
    description: string;
    amount: number | string | Decimal;
}

export class InvoiceService {
    private prisma = new PrismaClient();

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
    }    /**
     * Tạo một hóa đơn mới.
     * @param data Dữ liệu hóa đơn và các mục chi tiết.
     * @throws Error nếu dữ liệu không hợp lệ hoặc lỗi tạo.
     */
    async create(data: {
        studentProfileId?: number | null;
        studentCode?: string | null;
        roomId?: number | null;
        roomNumber?: string | null;
        buildingName?: string | null;
        billingMonth: number;
        billingYear: number;
        dueDate: Date | string;
        paymentDeadline: Date | string;
        notes?: string;
        items: InvoiceItemInput[];
        status?: InvoiceStatus;
    }): Promise<Invoice> {        // Kiểm tra xem có ít nhất một thông tin sinh viên hoặc phòng
        const hasStudentInfo = data.studentProfileId || data.studentCode;
        const hasRoomInfo = data.roomId || (data.roomNumber && data.buildingName);

        console.log('Invoice Service - hasStudentInfo:', hasStudentInfo);
        console.log('Invoice Service - hasRoomInfo:', hasRoomInfo);
        console.log('Invoice Service - studentProfileId:', data.studentProfileId);
        console.log('Invoice Service - studentCode:', data.studentCode);
        console.log('Invoice Service - roomId:', data.roomId);
        console.log('Invoice Service - roomNumber:', data.roomNumber);
        console.log('Invoice Service - buildingName:', data.buildingName);

        if ((!hasStudentInfo && !hasRoomInfo) || (hasStudentInfo && hasRoomInfo)) {
            throw new Error('Hóa đơn phải thuộc về một Sinh viên hoặc một Phòng, không phải cả hai hoặc không có.');
        }

        if (!data.billingMonth || !data.billingYear || !data.dueDate || !data.paymentDeadline || !data.items || data.items.length === 0) {
            throw new Error('Thiếu thông tin bắt buộc: tháng/năm thanh toán, hạn thanh toán, và ít nhất một mục chi tiết.');
        }

        try {
            let studentProfileId: number | null = null;
            let roomId: number | null = null;

            // Tìm sinh viên theo mã sinh viên hoặc ID
            if (hasStudentInfo) {
                if (data.studentCode) {
                    const student = await prisma.studentProfile.findFirst({
                        where: { studentId: data.studentCode }
                    });
                    if (!student) {
                        throw new Error(`Không tìm thấy sinh viên với mã: ${data.studentCode}`);
                    }
                    studentProfileId = student.id;
                } else if (data.studentProfileId) {
                    if (isNaN(parseInt(data.studentProfileId as any))) {
                        throw new Error('studentProfileId không hợp lệ.');
                    }
                    const student = await prisma.studentProfile.findUnique({
                        where: { id: parseInt(data.studentProfileId as any) }
                    });
                    if (!student) {
                        throw new Error(`Không tìm thấy sinh viên với ID: ${data.studentProfileId}`);
                    }
                    studentProfileId = student.id;
                }
            }

            // Tìm phòng theo số phòng + tòa nhà hoặc ID
            if (hasRoomInfo) {
                if (data.roomNumber && data.buildingName) {
                    const room = await prisma.room.findFirst({
                        where: {
                            number: data.roomNumber,
                            building: {
                                name: data.buildingName
                            }
                        },
                        include: { building: true }
                    });
                    if (!room) {
                        throw new Error(`Không tìm thấy phòng ${data.roomNumber} trong tòa nhà ${data.buildingName}`);
                    }
                    roomId = room.id;
                } else if (data.roomId) {
                    if (isNaN(parseInt(data.roomId as any))) {
                        throw new Error('roomId không hợp lệ.');
                    }
                    const room = await prisma.room.findUnique({
                        where: { id: parseInt(data.roomId as any) }
                    });
                    if (!room) {
                        throw new Error(`Không tìm thấy phòng với ID: ${data.roomId}`);
                    }
                    roomId = room.id;
                }
            }

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
                    studentProfileId: studentProfileId,
                    roomId: roomId,
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
                    studentProfile: { select: { id: true, fullName: true, studentId: true } },
                    room: {
                        select: {
                            id: true,
                            number: true,
                            building: { select: { id: true, name: true } }
                        }
                    },
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
            } else if (error instanceof Error && (
                error.message.includes('Số tiền không hợp lệ') ||
                error.message.includes('Loại thanh toán không hợp lệ') ||
                error.message.includes('Không tìm thấy sinh viên') ||
                error.message.includes('Không tìm thấy phòng')
            )) {
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

    /**
     * Tạo hóa đơn hàng loạt cho tất cả sinh viên trong tháng
     * @param month Tháng tạo hóa đơn (1-12)
     * @param year Năm tạo hóa đơn
     * @returns Thông tin về số lượng hóa đơn đã tạo
     */
    async createBulkMonthlyInvoices(month: number, year: number): Promise<{
        totalCreated: number;
        roomFeeCount: number;
        parkingCount: number;
        utilityCount: number;
        details: Array<{
            type: string;
            count: number;
            invoiceIds: number[];
        }>;
    }> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const result = {
                    totalCreated: 0,
                    roomFeeCount: 0,
                    parkingCount: 0,
                    utilityCount: 0,
                    details: [] as Array<{
                        type: string;
                        count: number;
                        invoiceIds: number[];
                    }>
                };

                // 1. Tạo hóa đơn tiền phòng cho tất cả sinh viên đang thuê phòng
                const activeStudents = await tx.studentProfile.findMany({
                    where: {
                        status: 'RENTING',
                        roomId: { not: null }
                    },
                    include: {
                        room: true
                    }
                });

                const roomFeeInvoiceIds: number[] = [];
                for (const student of activeStudents) {
                    if (student.room) {
                        const roomFeeInvoice = await tx.invoice.create({
                            data: {
                                studentProfileId: student.id,
                                billingMonth: month,
                                billingYear: year,
                                issueDate: new Date(year, month - 1, 1),
                                dueDate: new Date(year, month - 1, 15),
                                paymentDeadline: new Date(year, month - 1, 25),
                                totalAmount: student.room.roomFee,
                                status: 'UNPAID',
                                items: {
                                    create: {
                                        type: 'ROOM_FEE',
                                        description: `Tiền phòng T${month}/${year} - Phòng ${student.room.number}`,
                                        amount: student.room.roomFee
                                    }
                                }
                            }
                        });
                        roomFeeInvoiceIds.push(roomFeeInvoice.id);
                        result.roomFeeCount++;
                    }
                }

                result.details.push({
                    type: 'ROOM_FEE',
                    count: result.roomFeeCount,
                    invoiceIds: roomFeeInvoiceIds
                });

                // 2. Tạo hóa đơn phí gửi xe cho những sinh viên có đăng ký xe
                const parkingFeeRates = await tx.feeRate.findMany({
                    where: {
                        feeType: 'PARKING',
                        isActive: true
                    }
                }); const vehicleRegistrations = await tx.vehicleRegistration.findMany({
                    where: {
                        isActive: true,
                        studentProfile: {
                            status: 'RENTING',
                            roomId: { not: null }
                        }
                    },
                    include: {
                        studentProfile: true
                    }
                });

                const parkingInvoiceIds: number[] = [];
                for (const registration of vehicleRegistrations) {
                    const applicableFeeRate = parkingFeeRates.find(rate =>
                        rate.vehicleType === registration.vehicleType
                    );

                    if (applicableFeeRate) {
                        const parkingInvoice = await tx.invoice.create({
                            data: {
                                studentProfileId: registration.studentProfileId,
                                billingMonth: month,
                                billingYear: year,
                                issueDate: new Date(year, month - 1, 1),
                                dueDate: new Date(year, month - 1, 15),
                                paymentDeadline: new Date(year, month - 1, 25),
                                totalAmount: applicableFeeRate.unitPrice,
                                status: 'UNPAID',
                                items: {
                                    create: {
                                        type: 'PARKING',
                                        description: `Phí gửi xe T${month}/${year} - ${registration.vehicleType} (${registration.licensePlate})`,
                                        amount: applicableFeeRate.unitPrice
                                    }
                                }
                            }
                        });
                        parkingInvoiceIds.push(parkingInvoice.id);
                        result.parkingCount++;
                    }
                }

                result.details.push({
                    type: 'PARKING',
                    count: result.parkingCount,
                    invoiceIds: parkingInvoiceIds
                });

                // 3. Tạo hóa đơn tiền điện/nước cho các phòng có chỉ số
                const electricityFeeRate = await tx.feeRate.findFirst({
                    where: { feeType: 'ELECTRICITY', isActive: true }
                });

                const waterFeeRate = await tx.feeRate.findFirst({
                    where: { feeType: 'WATER', isActive: true }
                });

                const utilityInvoiceIds: number[] = [];

                if (electricityFeeRate || waterFeeRate) {
                    // Lấy các phòng có chỉ số trong tháng hiện tại
                    const roomsWithReadings = await tx.utilityMeterReading.findMany({
                        where: {
                            billingMonth: month,
                            billingYear: year
                        },
                        include: {
                            room: true
                        },
                        distinct: ['roomId']
                    });

                    for (const reading of roomsWithReadings) {
                        // Lấy chỉ số điện và nước của phòng trong tháng
                        const electricityReading = await tx.utilityMeterReading.findFirst({
                            where: {
                                roomId: reading.roomId,
                                type: 'ELECTRICITY',
                                billingMonth: month,
                                billingYear: year
                            },
                            orderBy: { readingDate: 'desc' }
                        });

                        const waterReading = await tx.utilityMeterReading.findFirst({
                            where: {
                                roomId: reading.roomId,
                                type: 'WATER',
                                billingMonth: month,
                                billingYear: year
                            },
                            orderBy: { readingDate: 'desc' }
                        });

                        if (electricityReading || waterReading) {
                            // Lấy chỉ số tháng trước để tính tiêu thụ
                            const prevMonth = month === 1 ? 12 : month - 1;
                            const prevYear = month === 1 ? year - 1 : year;

                            let totalUtilityAmount = new Decimal(0);
                            const utilityItems: any[] = [];

                            // Tính tiền điện
                            if (electricityReading && electricityFeeRate) {
                                const prevElectricityReading = await tx.utilityMeterReading.findFirst({
                                    where: {
                                        roomId: reading.roomId,
                                        type: 'ELECTRICITY',
                                        billingMonth: prevMonth,
                                        billingYear: prevYear
                                    },
                                    orderBy: { readingDate: 'desc' }
                                });

                                const consumption = prevElectricityReading
                                    ? new Decimal(electricityReading.indexValue).sub(new Decimal(prevElectricityReading.indexValue))
                                    : new Decimal(electricityReading.indexValue);

                                const electricityAmount = consumption.mul(electricityFeeRate.unitPrice);
                                totalUtilityAmount = totalUtilityAmount.add(electricityAmount);

                                utilityItems.push({
                                    type: 'ELECTRICITY',
                                    description: `Tiền điện T${month}/${year} - Phòng ${reading.room?.number} (${consumption}kWh)`,
                                    amount: electricityAmount
                                });
                            }

                            // Tính tiền nước
                            if (waterReading && waterFeeRate) {
                                const prevWaterReading = await tx.utilityMeterReading.findFirst({
                                    where: {
                                        roomId: reading.roomId,
                                        type: 'WATER',
                                        billingMonth: prevMonth,
                                        billingYear: prevYear
                                    },
                                    orderBy: { readingDate: 'desc' }
                                });

                                const consumption = prevWaterReading
                                    ? new Decimal(waterReading.indexValue).sub(new Decimal(prevWaterReading.indexValue))
                                    : new Decimal(waterReading.indexValue);

                                const waterAmount = consumption.mul(waterFeeRate.unitPrice);
                                totalUtilityAmount = totalUtilityAmount.add(waterAmount);

                                utilityItems.push({
                                    type: 'WATER',
                                    description: `Tiền nước T${month}/${year} - Phòng ${reading.room?.number} (${consumption}m³)`,
                                    amount: waterAmount
                                });
                            }

                            if (utilityItems.length > 0 && totalUtilityAmount.gt(0)) {
                                const utilityInvoice = await tx.invoice.create({
                                    data: {
                                        roomId: reading.roomId,
                                        billingMonth: month,
                                        billingYear: year,
                                        issueDate: new Date(year, month - 1, 5),
                                        dueDate: new Date(year, month - 1, 20),
                                        paymentDeadline: new Date(year, month - 1, 30),
                                        totalAmount: totalUtilityAmount,
                                        status: 'UNPAID',
                                        items: {
                                            create: utilityItems
                                        }
                                    }
                                });
                                utilityInvoiceIds.push(utilityInvoice.id);
                                result.utilityCount++;
                            }
                        }
                    }
                }

                result.details.push({
                    type: 'UTILITY',
                    count: result.utilityCount,
                    invoiceIds: utilityInvoiceIds
                });

                result.totalCreated = result.roomFeeCount + result.parkingCount + result.utilityCount;

                return result;
            });
        } catch (error) {
            console.error(`[InvoiceService.createBulkMonthlyInvoices] Error creating bulk invoices for ${month}/${year}:`, error);
            throw new Error(`Không thể tạo hóa đơn hàng loạt cho tháng ${month}/${year}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
    }

    /**
     * Tạo hóa đơn tiền phòng cho tháng
     * @param month Tháng tạo hóa đơn (1-12)
     * @param year Năm tạo hóa đơn
     * @returns Thông tin về số lượng hóa đơn tiền phòng đã tạo
     */
    async createRoomFeeInvoices(month: number, year: number): Promise<{
        totalCreated: number;
        invoiceIds: number[];
        details: Array<{
            studentId: number;
            studentName: string;
            roomNumber: string;
            amount: number;
            invoiceId: number;
        }>;
    }> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const result = {
                    totalCreated: 0,
                    invoiceIds: [] as number[],
                    details: [] as Array<{
                        studentId: number;
                        studentName: string;
                        roomNumber: string;
                        amount: number;
                        invoiceId: number;
                    }>
                };

                // Lấy tất cả sinh viên đang thuê phòng
                const activeStudents = await tx.studentProfile.findMany({
                    where: {
                        status: 'RENTING',
                        roomId: { not: null }
                    },
                    include: {
                        room: true
                    }
                });

                for (const student of activeStudents) {
                    if (student.room) {
                        const roomFeeInvoice = await tx.invoice.create({
                            data: {
                                studentProfileId: student.id,
                                billingMonth: month,
                                billingYear: year,
                                issueDate: new Date(year, month - 1, 1),
                                dueDate: new Date(year, month - 1, 15),
                                paymentDeadline: new Date(year, month - 1, 25),
                                totalAmount: student.room.roomFee,
                                status: 'UNPAID',
                                items: {
                                    create: {
                                        type: 'ROOM_FEE',
                                        description: `Tiền phòng T${month}/${year} - Phòng ${student.room.number}`,
                                        amount: student.room.roomFee
                                    }
                                }
                            }
                        });

                        result.invoiceIds.push(roomFeeInvoice.id);
                        result.details.push({
                            studentId: student.id,
                            studentName: student.fullName,
                            roomNumber: student.room.number,
                            amount: Number(student.room.roomFee),
                            invoiceId: roomFeeInvoice.id
                        });
                        result.totalCreated++;
                    }
                }

                return result;
            });
        } catch (error) {
            console.error(`[InvoiceService.createRoomFeeInvoices] Error creating room fee invoices for ${month}/${year}:`, error);
            throw new Error(`Không thể tạo hóa đơn tiền phòng cho tháng ${month}/${year}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
    }

    /**
     * Tạo hóa đơn phí gửi xe cho tháng
     * @param month Tháng tạo hóa đơn (1-12)
     * @param year Năm tạo hóa đơn
     * @returns Thông tin về số lượng hóa đơn phí gửi xe đã tạo
     */
    async createParkingFeeInvoices(month: number, year: number): Promise<{
        totalCreated: number;
        invoiceIds: number[];
        details: Array<{
            studentId: number;
            studentName: string;
            vehicleType: string;
            licensePlate: string;
            amount: number;
            invoiceId: number;
        }>;
    }> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const result = {
                    totalCreated: 0,
                    invoiceIds: [] as number[],
                    details: [] as Array<{
                        studentId: number;
                        studentName: string;
                        vehicleType: string;
                        licensePlate: string;
                        amount: number;
                        invoiceId: number;
                    }>
                };

                // Lấy bảng giá phí gửi xe
                const parkingFeeRates = await tx.feeRate.findMany({
                    where: {
                        feeType: 'PARKING',
                        isActive: true
                    }
                });

                // Lấy tất cả đăng ký xe còn hiệu lực
                const vehicleRegistrations = await tx.vehicleRegistration.findMany({
                    where: {
                        isActive: true,
                        studentProfile: {
                            status: 'RENTING',
                            roomId: { not: null }
                        }
                    },
                    include: {
                        studentProfile: true
                    }
                });

                for (const registration of vehicleRegistrations) {
                    const applicableFeeRate = parkingFeeRates.find(rate =>
                        rate.vehicleType === registration.vehicleType
                    );

                    if (applicableFeeRate) {
                        const parkingInvoice = await tx.invoice.create({
                            data: {
                                studentProfileId: registration.studentProfileId,
                                billingMonth: month,
                                billingYear: year,
                                issueDate: new Date(year, month - 1, 1),
                                dueDate: new Date(year, month - 1, 15),
                                paymentDeadline: new Date(year, month - 1, 25),
                                totalAmount: applicableFeeRate.unitPrice,
                                status: 'UNPAID',
                                items: {
                                    create: {
                                        type: 'PARKING',
                                        description: `Phí gửi xe T${month}/${year} - ${registration.vehicleType} (${registration.licensePlate})`,
                                        amount: applicableFeeRate.unitPrice
                                    }
                                }
                            }
                        });

                        result.invoiceIds.push(parkingInvoice.id);
                        result.details.push({
                            studentId: registration.studentProfileId,
                            studentName: registration.studentProfile.fullName,
                            vehicleType: registration.vehicleType,
                            licensePlate: registration.licensePlate,
                            amount: Number(applicableFeeRate.unitPrice),
                            invoiceId: parkingInvoice.id
                        });
                        result.totalCreated++;
                    }
                }

                return result;
            });
        } catch (error) {
            console.error(`[InvoiceService.createParkingFeeInvoices] Error creating parking fee invoices for ${month}/${year}:`, error);
            throw new Error(`Không thể tạo hóa đơn phí gửi xe cho tháng ${month}/${year}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
    }

    /**
     * Tạo hóa đơn tiền điện/nước cho tháng
     * @param month Tháng tạo hóa đơn (1-12)
     * @param year Năm tạo hóa đơn
     * @returns Thông tin về số lượng hóa đơn tiện ích đã tạo
     */
    async createUtilityInvoices(month: number, year: number): Promise<{
        totalCreated: number;
        invoiceIds: number[];
        details: Array<{
            roomId: number;
            roomNumber: string;
            electricityConsumption?: number;
            electricityAmount?: number;
            waterConsumption?: number;
            waterAmount?: number;
            totalAmount: number;
            invoiceId: number;
        }>;
    }> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const result = {
                    totalCreated: 0,
                    invoiceIds: [] as number[],
                    details: [] as Array<{
                        roomId: number;
                        roomNumber: string;
                        electricityConsumption?: number;
                        electricityAmount?: number;
                        waterConsumption?: number;
                        waterAmount?: number;
                        totalAmount: number;
                        invoiceId: number;
                    }>
                };

                // Lấy bảng giá điện và nước
                const electricityFeeRate = await tx.feeRate.findFirst({
                    where: { feeType: 'ELECTRICITY', isActive: true }
                });

                const waterFeeRate = await tx.feeRate.findFirst({
                    where: { feeType: 'WATER', isActive: true }
                });

                if (!electricityFeeRate && !waterFeeRate) {
                    return result; // Không có bảng giá nào
                }

                // Lấy các phòng có chỉ số trong tháng hiện tại
                const roomsWithReadings = await tx.utilityMeterReading.findMany({
                    where: {
                        billingMonth: month,
                        billingYear: year
                    },
                    include: {
                        room: true
                    },
                    distinct: ['roomId']
                });

                // Tháng trước để tính tiêu thụ
                const prevMonth = month === 1 ? 12 : month - 1;
                const prevYear = month === 1 ? year - 1 : year;

                for (const reading of roomsWithReadings) {
                    let totalUtilityAmount = new Decimal(0);
                    const utilityItems: any[] = [];
                    const detail: any = {
                        roomId: reading.roomId,
                        roomNumber: reading.room?.number || '',
                        totalAmount: 0,
                        invoiceId: 0
                    };

                    // Tính tiền điện
                    if (electricityFeeRate) {
                        const electricityReading = await tx.utilityMeterReading.findFirst({
                            where: {
                                roomId: reading.roomId,
                                type: 'ELECTRICITY',
                                billingMonth: month,
                                billingYear: year
                            },
                            orderBy: { readingDate: 'desc' }
                        });

                        if (electricityReading) {
                            const prevElectricityReading = await tx.utilityMeterReading.findFirst({
                                where: {
                                    roomId: reading.roomId,
                                    type: 'ELECTRICITY',
                                    billingMonth: prevMonth,
                                    billingYear: prevYear
                                },
                                orderBy: { readingDate: 'desc' }
                            });

                            const consumption = prevElectricityReading
                                ? new Decimal(electricityReading.indexValue).sub(new Decimal(prevElectricityReading.indexValue))
                                : new Decimal(electricityReading.indexValue);

                            const electricityAmount = consumption.mul(electricityFeeRate.unitPrice);
                            totalUtilityAmount = totalUtilityAmount.add(electricityAmount);

                            detail.electricityConsumption = Number(consumption);
                            detail.electricityAmount = Number(electricityAmount);

                            utilityItems.push({
                                type: 'ELECTRICITY',
                                description: `Tiền điện T${month}/${year} - Phòng ${reading.room?.number} (${consumption}kWh)`,
                                amount: electricityAmount
                            });
                        }
                    }

                    // Tính tiền nước
                    if (waterFeeRate) {
                        const waterReading = await tx.utilityMeterReading.findFirst({
                            where: {
                                roomId: reading.roomId,
                                type: 'WATER',
                                billingMonth: month,
                                billingYear: year
                            },
                            orderBy: { readingDate: 'desc' }
                        });

                        if (waterReading) {
                            const prevWaterReading = await tx.utilityMeterReading.findFirst({
                                where: {
                                    roomId: reading.roomId,
                                    type: 'WATER',
                                    billingMonth: prevMonth,
                                    billingYear: prevYear
                                },
                                orderBy: { readingDate: 'desc' }
                            });

                            const consumption = prevWaterReading
                                ? new Decimal(waterReading.indexValue).sub(new Decimal(prevWaterReading.indexValue))
                                : new Decimal(waterReading.indexValue);

                            const waterAmount = consumption.mul(waterFeeRate.unitPrice);
                            totalUtilityAmount = totalUtilityAmount.add(waterAmount);

                            detail.waterConsumption = Number(consumption);
                            detail.waterAmount = Number(waterAmount);

                            utilityItems.push({
                                type: 'WATER',
                                description: `Tiền nước T${month}/${year} - Phòng ${reading.room?.number} (${consumption}m³)`,
                                amount: waterAmount
                            });
                        }
                    }

                    // Tạo hóa đơn nếu có items
                    if (utilityItems.length > 0 && totalUtilityAmount.gt(0)) {
                        const utilityInvoice = await tx.invoice.create({
                            data: {
                                roomId: reading.roomId,
                                billingMonth: month,
                                billingYear: year,
                                issueDate: new Date(year, month - 1, 5),
                                dueDate: new Date(year, month - 1, 20),
                                paymentDeadline: new Date(year, month - 1, 30),
                                totalAmount: totalUtilityAmount,
                                status: 'UNPAID',
                                items: {
                                    create: utilityItems
                                }
                            }
                        });

                        detail.totalAmount = Number(totalUtilityAmount);
                        detail.invoiceId = utilityInvoice.id;

                        result.invoiceIds.push(utilityInvoice.id);
                        result.details.push(detail);
                        result.totalCreated++;
                    }
                }

                return result;
            });
        } catch (error) {
            console.error(`[InvoiceService.createUtilityInvoices] Error creating utility invoices for ${month}/${year}:`, error);
            throw new Error(`Không thể tạo hóa đơn tiện ích cho tháng ${month}/${year}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
    }
}
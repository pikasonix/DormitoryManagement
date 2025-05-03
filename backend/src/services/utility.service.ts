import { PrismaClient, Prisma, UtilityMeterReading, UtilityType, Room } from '@prisma/client';

const prisma = new PrismaClient();

export class UtilityService {

    /**
     * Tìm kiếm và lấy danh sách các lần ghi chỉ số điện/nước.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    async findAllReadings(options?: Prisma.UtilityMeterReadingFindManyArgs): Promise<UtilityMeterReading[]> {
        try {
            const readings = await prisma.utilityMeterReading.findMany({
                ...options,
                include: {
                    room: {
                        select: { id: true, number: true, building: { select: { id: true, name: true } } }
                    },
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || [{ readingDate: 'desc' }, { roomId: 'asc' }]
            });
            return readings;
        } catch (error) {
            console.error("[UtilityService.findAllReadings] Error:", error);
            throw error;
        }
    }

    /**
     * Tìm một lần ghi chỉ số bằng ID.
     * @param id ID của UtilityMeterReading
     * @param options Tùy chọn Prisma findUnique
     * @throws Error nếu không tìm thấy
     */
    async findReadingById(id: number, options?: Prisma.UtilityMeterReadingFindUniqueArgs): Promise<UtilityMeterReading | null> {
        if (isNaN(id)) {
            throw new Error('ID bản ghi chỉ số không hợp lệ');
        }
        try {
            const reading = await prisma.utilityMeterReading.findUnique({
                where: { id },
                ...options,
                include: {
                    room: { include: { building: true } },
                    ...(options?.include || {})
                },
            });

            if (!reading) {
                throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
            }
            return reading;
        } catch (error) {
            console.error(`[UtilityService.findReadingById] Error fetching reading ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Tạo một bản ghi chỉ số điện/nước mới.
     * @param data Dữ liệu ghi chỉ số.
     * @throws Error nếu dữ liệu không hợp lệ hoặc lỗi tạo.
     */
    async createReading(data: {
        roomId: number;
        type: UtilityType;
        readingDate: Date | string;
        indexValue: number;
        billingMonth: number;
        billingYear: number;
        notes?: string;
    }): Promise<UtilityMeterReading> {
        if (!data.roomId || !data.type || !data.readingDate || data.indexValue === undefined || data.indexValue === null || !data.billingMonth || !data.billingYear) {
            throw new Error('Thiếu thông tin bắt buộc: roomId, type, readingDate, indexValue, billingMonth, billingYear.');
        }
        if (isNaN(parseInt(data.roomId as any)) || isNaN(parseFloat(data.indexValue as any)) || isNaN(parseInt(data.billingMonth as any)) || isNaN(parseInt(data.billingYear as any))) {
            throw new Error('roomId, indexValue, billingMonth, billingYear phải là số.');
        }
        if (!Object.values(UtilityType).includes(data.type as UtilityType)) {
            throw new Error(`Loại công tơ không hợp lệ: ${data.type}`);
        }

        try {
            const roomExists = await prisma.room.findUnique({ where: { id: data.roomId } });
            if (!roomExists) {
                throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
            }

            const newReading = await prisma.utilityMeterReading.create({
                data: {
                    roomId: data.roomId,
                    type: data.type,
                    readingDate: new Date(data.readingDate),
                    indexValue: parseFloat(data.indexValue as any),
                    billingMonth: data.billingMonth,
                    billingYear: data.billingYear,
                    notes: data.notes
                },
                include: {
                    room: { select: { id: true, number: true, building: { select: { name: true } } } }
                }
            });
            return newReading;
        } catch (error) {
            console.error("[UtilityService.createReading] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
            }
            throw error;
        }
    }

    /**
     * Cập nhật một bản ghi chỉ số điện/nước.
     * @param id ID của UtilityMeterReading
     * @param data Dữ liệu cập nhật.
     * @throws Error nếu không tìm thấy hoặc lỗi cập nhật.
     */
    async updateReading(id: number, data: {
        readingDate?: Date | string;
        indexValue?: number;
        notes?: string;
    }): Promise<UtilityMeterReading> {
        if (isNaN(id)) {
            throw new Error('ID bản ghi chỉ số không hợp lệ');
        }
        if (data.indexValue !== undefined && data.indexValue !== null && isNaN(parseFloat(data.indexValue as any))) {
            throw new Error('indexValue phải là số.');
        }

        try {
            const updatedReading = await prisma.utilityMeterReading.update({
                where: { id },
                data: {
                    readingDate: data.readingDate ? new Date(data.readingDate) : undefined,
                    indexValue: data.indexValue !== undefined ? parseFloat(data.indexValue as any) : undefined,
                    notes: data.notes,
                },
                include: { room: { select: { number: true, building: { select: { name: true } } } } }
            });
            return updatedReading;
        } catch (error) {
            console.error(`[UtilityService.updateReading] Error updating reading ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Xóa một bản ghi chỉ số điện/nước.
     * @param id ID của UtilityMeterReading cần xóa
     * @throws Error nếu không tìm thấy hoặc lỗi xóa.
     */
    async deleteReading(id: number): Promise<void> {
        if (isNaN(id)) {
            throw new Error('ID bản ghi chỉ số không hợp lệ');
        }
        try {
            await prisma.utilityMeterReading.delete({
                where: { id }
            });
        } catch (error) {
            console.error(`[UtilityService.deleteReading] Error deleting reading ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Lấy chỉ số gần nhất của một loại công tơ cho một phòng.
     * Hữu ích để tính toán tiêu thụ cho hóa đơn tháng mới.
     * @param roomId ID phòng
     * @param type Loại công tơ (ELECTRICITY/WATER)
     * @param beforeDate Ngày cần lấy chỉ số *trước* đó (thường là ngày đầu tháng hiện tại)
     */
    async getLatestReadingBeforeDate(roomId: number, type: UtilityType, beforeDate: Date): Promise<UtilityMeterReading | null> {
        try {
            return await prisma.utilityMeterReading.findFirst({
                where: {
                    roomId: roomId,
                    type: type,
                    readingDate: {
                        lt: beforeDate
                    }
                },
                orderBy: {
                    readingDate: 'desc'
                }
            });
        } catch (error) {
            console.error(`[UtilityService.getLatestReadingBeforeDate] Error for room ${roomId}, type ${type}:`, error);
            throw error;
        }
    }
}
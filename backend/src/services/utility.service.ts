import { PrismaClient, Prisma, UtilityMeterReading, UtilityType, Room } from '@prisma/client';
// import { AppError } from '../types/AppError';

// Lưu ý: Nên sử dụng instance PrismaClient singleton
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
                include: { // Include thông tin phòng và tòa nhà mặc định
                    room: {
                        select: { id: true, number: true, building: { select: { id: true, name: true } } }
                    },
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || [{ readingDate: 'desc' }, { roomId: 'asc' }] // Mặc định sắp xếp theo ngày ghi, phòng
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
            throw new Error('ID bản ghi chỉ số không hợp lệ'); // Hoặc AppError 400
        }
        try {
            const reading = await prisma.utilityMeterReading.findUnique({
                where: { id },
                ...options,
                include: { // Include chi tiết phòng
                    room: { include: { building: true } },
                    ...(options?.include || {})
                },
            });

            if (!reading) {
                throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`); // Hoặc AppError 404
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
        type: UtilityType; // Enum UtilityType
        readingDate: Date | string;
        indexValue: number;
        billingMonth: number;
        billingYear: number;
        notes?: string;
    }): Promise<UtilityMeterReading> {
        // --- Validation ---
        if (!data.roomId || !data.type || !data.readingDate || data.indexValue === undefined || data.indexValue === null || !data.billingMonth || !data.billingYear) {
            throw new Error('Thiếu thông tin bắt buộc: roomId, type, readingDate, indexValue, billingMonth, billingYear.'); // Hoặc AppError 400
        }
        if (isNaN(parseInt(data.roomId as any)) || isNaN(parseFloat(data.indexValue as any)) || isNaN(parseInt(data.billingMonth as any)) || isNaN(parseInt(data.billingYear as any))) {
            throw new Error('roomId, indexValue, billingMonth, billingYear phải là số.'); // Hoặc AppError 400
        }
        if (!Object.values(UtilityType).includes(data.type as UtilityType)) {
            throw new Error(`Loại công tơ không hợp lệ: ${data.type}`); // Hoặc AppError 400
        }
        // --- Kết thúc Validation ---

        try {
            // Kiểm tra phòng tồn tại
            const roomExists = await prisma.room.findUnique({ where: { id: data.roomId } });
            if (!roomExists) {
                throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`); // Hoặc AppError 404
            }

            // (Optional) Kiểm tra xem đã có bản ghi cho phòng/tháng/năm/loại này chưa?
            // const existingReading = await prisma.utilityMeterReading.findFirst({
            //     where: {
            //         roomId: data.roomId,
            //         type: data.type,
            //         billingMonth: data.billingMonth,
            //         billingYear: data.billingYear
            //     }
            // });
            // if (existingReading) {
            //      throw new Error(`Đã tồn tại bản ghi ${data.type} cho phòng ${roomExists.number} tháng ${data.billingMonth}/${data.billingYear}.`); // Hoặc AppError 409
            // }


            const newReading = await prisma.utilityMeterReading.create({
                data: {
                    roomId: data.roomId,
                    type: data.type,
                    readingDate: new Date(data.readingDate),
                    indexValue: parseFloat(data.indexValue as any), // Đảm bảo là số float
                    billingMonth: data.billingMonth,
                    billingYear: data.billingYear,
                    notes: data.notes
                },
                include: { // Include phòng để trả về
                    room: { select: { id: true, number: true, building: { select: { name: true } } } }
                }
            });
            return newReading;
        } catch (error) {
            console.error("[UtilityService.createReading] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') { // Lỗi foreign key
                throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
            }
            throw error; // Ném lại lỗi khác
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
        // Thường không cho phép thay đổi roomId, type, billingMonth, billingYear sau khi đã tạo
    }): Promise<UtilityMeterReading> {
        if (isNaN(id)) {
            throw new Error('ID bản ghi chỉ số không hợp lệ');
        }
        // --- Validation ---
        if (data.indexValue !== undefined && data.indexValue !== null && isNaN(parseFloat(data.indexValue as any))) {
            throw new Error('indexValue phải là số.'); // Hoặc AppError 400
        }
        // --- Kết thúc Validation ---

        try {
            const updatedReading = await prisma.utilityMeterReading.update({
                where: { id },
                data: {
                    readingDate: data.readingDate ? new Date(data.readingDate) : undefined,
                    indexValue: data.indexValue !== undefined ? parseFloat(data.indexValue as any) : undefined,
                    notes: data.notes,
                    // Không cho phép cập nhật các trường khóa logic khác
                },
                include: { room: { select: { number: true, building: { select: { name: true } } } } }
            });
            return updatedReading;
        } catch (error) {
            console.error(`[UtilityService.updateReading] Error updating reading ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`); // Hoặc AppError 404
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
            // Kiểm tra tồn tại trước khi xóa (P2025 sẽ báo lỗi nếu không tìm thấy)
            await prisma.utilityMeterReading.delete({
                where: { id }
            });
            // Không cần trả về gì khi xóa thành công
        } catch (error) {
            console.error(`[UtilityService.deleteReading] Error deleting reading ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`); // Hoặc AppError 404
            }
            // Xử lý lỗi foreign key nếu có (ít khả năng)
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
                        lt: beforeDate // Lấy ngày ghi nhỏ hơn ngày bắt đầu kỳ mới
                    }
                },
                orderBy: {
                    readingDate: 'desc' // Lấy cái gần nhất
                }
            });
        } catch (error) {
            console.error(`[UtilityService.getLatestReadingBeforeDate] Error for room ${roomId}, type ${type}:`, error);
            throw error;
        }
    }
}
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilityService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UtilityService {
    /**
     * Tìm kiếm và lấy danh sách các lần ghi chỉ số điện/nước.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    findAllReadings(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const readings = yield prisma.utilityMeterReading.findMany(Object.assign(Object.assign({}, options), { include: Object.assign({ room: {
                            select: { id: true, number: true, building: { select: { id: true, name: true } } }
                        } }, ((options === null || options === void 0 ? void 0 : options.include) || {})), orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) || [{ readingDate: 'desc' }, { roomId: 'asc' }] }));
                return readings;
            }
            catch (error) {
                console.error("[UtilityService.findAllReadings] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm một lần ghi chỉ số bằng ID.
     * @param id ID của UtilityMeterReading
     * @param options Tùy chọn Prisma findUnique
     * @throws Error nếu không tìm thấy
     */
    findReadingById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID bản ghi chỉ số không hợp lệ');
            }
            try {
                const reading = yield prisma.utilityMeterReading.findUnique(Object.assign(Object.assign({ where: { id } }, options), { include: Object.assign({ room: { include: { building: true } } }, ((options === null || options === void 0 ? void 0 : options.include) || {})) }));
                if (!reading) {
                    throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
                }
                return reading;
            }
            catch (error) {
                console.error(`[UtilityService.findReadingById] Error fetching reading ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Tạo một bản ghi chỉ số điện/nước mới.
     * @param data Dữ liệu ghi chỉ số.
     * @throws Error nếu dữ liệu không hợp lệ hoặc lỗi tạo.
     */
    createReading(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data.roomId || !data.type || !data.readingDate || data.indexValue === undefined || data.indexValue === null || !data.billingMonth || !data.billingYear) {
                throw new Error('Thiếu thông tin bắt buộc: roomId, type, readingDate, indexValue, billingMonth, billingYear.');
            }
            if (isNaN(parseInt(data.roomId)) || isNaN(parseFloat(data.indexValue)) || isNaN(parseInt(data.billingMonth)) || isNaN(parseInt(data.billingYear))) {
                throw new Error('roomId, indexValue, billingMonth, billingYear phải là số.');
            }
            if (!Object.values(client_1.UtilityType).includes(data.type)) {
                throw new Error(`Loại công tơ không hợp lệ: ${data.type}`);
            }
            try {
                const roomExists = yield prisma.room.findUnique({ where: { id: data.roomId } });
                if (!roomExists) {
                    throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
                }
                const newReading = yield prisma.utilityMeterReading.create({
                    data: {
                        roomId: data.roomId,
                        type: data.type,
                        readingDate: new Date(data.readingDate),
                        indexValue: parseFloat(data.indexValue),
                        billingMonth: data.billingMonth,
                        billingYear: data.billingYear,
                        notes: data.notes
                    },
                    include: {
                        room: { select: { id: true, number: true, building: { select: { name: true } } } }
                    }
                });
                return newReading;
            }
            catch (error) {
                console.error("[UtilityService.createReading] Error:", error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                    throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
                }
                throw error;
            }
        });
    }
    /**
     * Cập nhật một bản ghi chỉ số điện/nước.
     * @param id ID của UtilityMeterReading
     * @param data Dữ liệu cập nhật.
     * @throws Error nếu không tìm thấy hoặc lỗi cập nhật.
     */
    updateReading(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID bản ghi chỉ số không hợp lệ');
            }
            if (data.indexValue !== undefined && data.indexValue !== null && isNaN(parseFloat(data.indexValue))) {
                throw new Error('indexValue phải là số.');
            }
            try {
                const updatedReading = yield prisma.utilityMeterReading.update({
                    where: { id },
                    data: {
                        readingDate: data.readingDate ? new Date(data.readingDate) : undefined,
                        indexValue: data.indexValue !== undefined ? parseFloat(data.indexValue) : undefined,
                        notes: data.notes,
                    },
                    include: { room: { select: { number: true, building: { select: { name: true } } } } }
                });
                return updatedReading;
            }
            catch (error) {
                console.error(`[UtilityService.updateReading] Error updating reading ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Xóa một bản ghi chỉ số điện/nước.
     * @param id ID của UtilityMeterReading cần xóa
     * @throws Error nếu không tìm thấy hoặc lỗi xóa.
     */
    deleteReading(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID bản ghi chỉ số không hợp lệ');
            }
            try {
                yield prisma.utilityMeterReading.delete({
                    where: { id }
                });
            }
            catch (error) {
                console.error(`[UtilityService.deleteReading] Error deleting reading ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy bản ghi chỉ số với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Lấy chỉ số gần nhất của một loại công tơ cho một phòng.
     * Hữu ích để tính toán tiêu thụ cho hóa đơn tháng mới.
     * @param roomId ID phòng
     * @param type Loại công tơ (ELECTRICITY/WATER)
     * @param beforeDate Ngày cần lấy chỉ số *trước* đó (thường là ngày đầu tháng hiện tại)
     */
    getLatestReadingBeforeDate(roomId, type, beforeDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield prisma.utilityMeterReading.findFirst({
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
            }
            catch (error) {
                console.error(`[UtilityService.getLatestReadingBeforeDate] Error for room ${roomId}, type ${type}:`, error);
                throw error;
            }
        });
    }
}
exports.UtilityService = UtilityService;

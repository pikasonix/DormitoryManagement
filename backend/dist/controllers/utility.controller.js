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
exports.UtilityController = void 0;
const utility_service_1 = require("../services/utility.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const utilityService = new utility_service_1.UtilityService();
class UtilityController {
    getAllReadings(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { roomId, type, month, year, page, limit, search, roomNumber } = req.query;
                console.log('Utility API called with query params:', req.query);
                const options = { where: {} };
                // Xây dựng bộ lọc
                if (roomId)
                    options.where.roomId = parseInt(roomId);
                // Tìm kiếm theo số phòng nâng cao
                if (roomNumber) {
                    const roomSearch = roomNumber;
                    // Kiểm tra xem có phải pattern "306 (B3)" không
                    const roomWithBuildingPattern = /(\d+)\s*\(([^)]+)\)/;
                    const matchRoomWithBuilding = roomSearch.match(roomWithBuildingPattern);
                    if (matchRoomWithBuilding) {
                        // Pattern "306 (B3)" - tìm theo cả số phòng và tòa nhà
                        const roomNum = matchRoomWithBuilding[1]; // "306"
                        const buildingName = matchRoomWithBuilding[2]; // "B3"
                        options.where.room = {
                            number: {
                                contains: roomNum,
                                mode: 'insensitive'
                            },
                            building: {
                                name: {
                                    contains: buildingName,
                                    mode: 'insensitive'
                                }
                            }
                        };
                    }
                    else if (/^\D+$/.test(roomSearch)) {
                        // Pattern chỉ có chữ cái (không có số) - có thể là tên tòa nhà "B3"
                        options.where.room = {
                            building: {
                                name: {
                                    contains: roomSearch,
                                    mode: 'insensitive'
                                }
                            }
                        };
                    }
                    else {
                        // Mặc định - chỉ tìm theo số phòng
                        options.where.room = {
                            number: {
                                contains: roomSearch,
                                mode: 'insensitive'
                            }
                        };
                    }
                }
                // Tìm kiếm chung
                if (search) {
                    options.where.OR = [
                        { room: { number: { contains: search, mode: 'insensitive' } } },
                        { notes: { contains: search, mode: 'insensitive' } }
                    ];
                }
                // Tìm theo loại công tơ
                if (type) {
                    // Handle the case where type might be stringified object
                    let typeValue = type;
                    // If it's a string that looks like an object representation
                    if (typeof type === 'string' && type.includes('[object')) {
                        console.warn(`Received malformed type parameter: ${type}, defaulting to empty search`);
                        // Skip the type filter if it's malformed
                        typeValue = '';
                    }
                    if (typeValue === 'OTHER') {
                        // Xử lý trường hợp 'OTHER' (loại khác không phải điện, nước)
                        options.where.type = {
                            notIn: ['ELECTRICITY', 'WATER']
                        };
                    }
                    else if (typeValue && Object.values(client_1.UtilityType).includes(typeValue)) {
                        options.where.type = typeValue;
                    }
                    else if (typeValue && typeValue !== '') {
                        console.warn(`Invalid utility type: ${typeValue}`);
                        // Don't throw an error for invalid types, just log a warning and continue without filtering by type
                    }
                }
                // Tìm kiếm theo tháng/năm
                if (month && !isNaN(parseInt(month))) {
                    options.where.billingMonth = parseInt(month);
                }
                if (year && !isNaN(parseInt(year))) {
                    options.where.billingYear = parseInt(year);
                }
                // Phân trang
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 20; // Mặc định 20 item/trang
                options.skip = (pageNum - 1) * limitNum;
                options.take = limitNum;
                options.orderBy = [{ readingDate: 'desc' }, { roomId: 'asc' }]; // Sắp xếp
                console.log('Query options:', JSON.stringify(options, null, 2));
                // Lấy tổng số bản ghi
                const totalRecords = yield prisma.utilityMeterReading.count({ where: options.where });
                console.log(`Total matching records: ${totalRecords}`);
                const readings = yield utilityService.findAllReadings(options);
                console.log(`Returned readings: ${readings.length}`);
                // Check if there's any data in the database at all
                const totalAllReadings = yield prisma.utilityMeterReading.count();
                console.log(`Total readings in database: ${totalAllReadings}`);
                res.status(200).json({
                    status: 'success',
                    results: readings.length,
                    total: totalRecords,
                    data: readings
                });
            }
            catch (error) {
                console.error('Error in getAllReadings:', error);
                next(error);
            }
        });
    }
    getReadingById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const reading = yield utilityService.findReadingById(id); // Service xử lý not found
                res.status(200).json({
                    status: 'success',
                    data: reading
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    createReading(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { roomId, type, readingDate, indexValue, billingMonth, billingYear, notes } = req.body;
                // --- Validation cơ bản (Service cũng validate, nhưng thêm ở đây để báo lỗi sớm) ---
                if (!roomId || !type || !readingDate || indexValue === undefined || indexValue === null || !billingMonth || !billingYear) {
                    return next(new Error('Thiếu thông tin bắt buộc: roomId, type, readingDate, indexValue, billingMonth, billingYear.'));
                }
                if (!Object.values(client_1.UtilityType).includes(type)) {
                    return next(new Error(`Loại công tơ không hợp lệ: ${type}`));
                }
                try { // Validate date format
                    new Date(readingDate);
                }
                catch (_a) {
                    return next(new Error('Định dạng readingDate không hợp lệ.'));
                }
                // --- Kết thúc Validation ---
                const createData = {
                    roomId: parseInt(roomId),
                    type: type,
                    readingDate, // Service sẽ chuyển thành Date
                    indexValue: parseFloat(indexValue),
                    billingMonth: parseInt(billingMonth),
                    billingYear: parseInt(billingYear),
                    notes
                };
                const newReading = yield utilityService.createReading(createData);
                res.status(201).json({
                    status: 'success',
                    data: newReading
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    updateReading(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                // Chỉ cho phép cập nhật một số trường
                const { readingDate, indexValue, notes } = req.body;
                // --- Validation ---
                if (indexValue !== undefined && indexValue !== null && isNaN(parseFloat(indexValue))) {
                    return next(new Error('indexValue phải là số.'));
                }
                if (readingDate) {
                    try {
                        new Date(readingDate);
                    }
                    catch (_a) {
                        return next(new Error('Định dạng readingDate không hợp lệ.'));
                    }
                }
                // --- Kết thúc Validation ---
                const updateData = {
                    readingDate, // Service sẽ chuyển thành Date nếu có
                    indexValue: indexValue !== undefined && indexValue !== null ? parseFloat(indexValue) : undefined,
                    notes
                };
                const updatedReading = yield utilityService.updateReading(id, updateData);
                res.status(200).json({
                    status: 'success',
                    data: updatedReading
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    deleteReading(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                yield utilityService.deleteReading(id); // Service xử lý not found
                res.status(200).json({
                    status: 'success',
                    message: 'Bản ghi chỉ số đã được xóa thành công.',
                    data: null
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.UtilityController = UtilityController;

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
exports.DashboardController = void 0;
const client_1 = require("@prisma/client");
const dashboard_service_1 = require("../services/dashboard.service");
// Lưu ý: Nên sử dụng một instance PrismaClient duy nhất (singleton)
// được khởi tạo ở một file khác (vd: src/utils/prisma.ts) và import vào đây.
const prisma = new client_1.PrismaClient();
const dashboardService = new dashboard_service_1.DashboardService();
class DashboardController {
    // Lấy các số liệu thống kê tổng quan
    getStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
                const buildingId = req.query.buildingId ? parseInt(req.query.buildingId) : undefined;
                // Sử dụng service để lấy dữ liệu thống kê, truyền buildingId để lọc nếu cần
                const stats = yield dashboardService.getStats(buildingId);
                // Lấy thêm thông tin về số phòng trống
                const availableRoomFilter = { status: 'AVAILABLE' };
                // Nếu có buildingId, lọc theo tòa nhà
                if (buildingId) {
                    availableRoomFilter.buildingId = buildingId;
                }
                const availableRooms = yield prisma.room.count({
                    where: availableRoomFilter
                });
                // Lấy thông tin về hóa đơn chưa thanh toán
                // Đối với hóa đơn, cần join để lấy theo buildingId từ phòng
                const unpaidInvoiceFilter = { status: 'UNPAID' };
                // Cách đếm hóa đơn khi lọc theo tòa nhà
                let unpaidInvoices = 0;
                if (buildingId) {
                    // Lấy hóa đơn theo tòa nhà - cần join qua room -> building
                    unpaidInvoices = yield prisma.invoice.count({
                        where: {
                            status: 'UNPAID',
                            room: {
                                buildingId: buildingId
                            }
                        }
                    });
                }
                else {
                    // Không lọc theo tòa nhà
                    unpaidInvoices = yield prisma.invoice.count({
                        where: unpaidInvoiceFilter
                    });
                }
                res.status(200).json({
                    status: 'success',
                    data: Object.assign(Object.assign({}, stats), { availableRooms,
                        unpaidInvoices })
                });
            }
            catch (error) {
                // Chuyển lỗi cho global error handler
                next(error);
            }
        });
    }
    // Lấy thống kê sinh viên theo giới tính
    getStudentsByGender(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
                const buildingId = req.query.buildingId ? parseInt(req.query.buildingId) : undefined;
                // Initialize with proper type
                let formattedStats = [];
                if (buildingId) {
                    // Lấy danh sách ID của các phòng trong tòa nhà
                    const roomIds = yield prisma.room.findMany({
                        where: { buildingId },
                        select: { id: true }
                    }).then(rooms => rooms.map(r => r.id));
                    if (roomIds.length > 0) {
                        // Đếm sinh viên theo giới tính và theo phòng
                        const maleCount = yield prisma.studentProfile.count({
                            where: {
                                gender: 'MALE',
                                roomId: { in: roomIds }
                            }
                        });
                        const femaleCount = yield prisma.studentProfile.count({
                            where: {
                                gender: 'FEMALE',
                                roomId: { in: roomIds }
                            }
                        });
                        // Tạo kết quả thống kê
                        formattedStats = [
                            { gender: 'MALE', count: maleCount },
                            { gender: 'FEMALE', count: femaleCount }
                        ];
                    }
                }
                else {
                    // Lấy thống kê sinh viên theo giới tính, không lọc
                    const stats = yield prisma.studentProfile.groupBy({
                        by: ['gender'],
                        _count: {
                            gender: true // Đếm theo field gender
                        },
                    });
                    // Định dạng lại kết quả cho dễ hiểu hơn
                    formattedStats = stats.map(item => ({
                        gender: item.gender || 'UNKNOWN',
                        count: item._count.gender
                    }));
                }
                res.status(200).json({
                    status: 'success',
                    data: formattedStats
                });
            }
            catch (error) {
                // Chuyển lỗi cho global error handler
                next(error);
            }
        });
    }
    // Lấy tình trạng sử dụng phòng
    getRoomsOccupancy(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
                const buildingId = req.query.buildingId ? parseInt(req.query.buildingId) : undefined;
                // Xây dựng các filter dựa trên buildingId
                const roomFilter = {};
                if (buildingId) {
                    roomFilter.buildingId = buildingId;
                }
                // Lấy thông tin phòng bao gồm cả actualOccupancy
                const rooms = yield prisma.room.findMany({
                    where: roomFilter,
                    select: {
                        id: true,
                        number: true,
                        capacity: true,
                        actualOccupancy: true, // Sử dụng trường này thay vì _count
                        status: true,
                        building: {
                            select: {
                                name: true
                            }
                        }
                    },
                    orderBy: [
                        { building: { name: 'asc' } },
                        { number: 'asc' }
                    ]
                });
                // Có thể map lại nếu cần định dạng khác, nhưng trả về trực tiếp cũng ổn
                // const occupancy = rooms.map(room => ({
                //   id: room.id,
                //   buildingName: room.building.name,
                //   number: room.number,
                //   capacity: room.capacity,
                //   occupied: room.actualOccupancy, // Sử dụng actualOccupancy
                //   status: room.status
                // }));
                res.status(200).json({
                    status: 'success',
                    results: rooms.length,
                    data: rooms // Trả về trực tiếp danh sách phòng với thông tin occupancy
                });
            }
            catch (error) {
                // Chuyển lỗi cho global error handler
                next(error);
            }
        });
    }
    // Lấy các hoạt động gần đây (ví dụ: sinh viên mới được tạo)
    getRecentActivities(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
                const buildingId = req.query.buildingId ? parseInt(req.query.buildingId) : undefined;
                // Xây dựng các filter dựa trên buildingId
                let studentFilter = {};
                // Nếu có buildingId, lọc sinh viên theo phòng thuộc tòa nhà
                if (buildingId) {
                    // Lấy danh sách ID của các phòng trong tòa nhà
                    const roomIds = yield prisma.room.findMany({
                        where: { buildingId },
                        select: { id: true }
                    }).then(rooms => rooms.map(r => r.id));
                    // Lọc sinh viên theo phòng thuộc tòa nhà
                    if (roomIds.length > 0) {
                        studentFilter = { roomId: { in: roomIds } };
                    }
                }
                // Đổi prisma.resident thành prisma.studentProfile
                // Đổi select name thành fullName
                const recentStudents = yield prisma.studentProfile.findMany({
                    where: studentFilter,
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        fullName: true, // Đổi từ name
                        createdAt: true,
                        updatedAt: true,
                        room: {
                            select: {
                                number: true,
                                building: {
                                    select: { name: true }
                                }
                            }
                        },
                        user: {
                            select: { email: true }
                        }
                    }
                });
                res.status(200).json({
                    status: 'success',
                    results: recentStudents.length,
                    data: recentStudents
                });
            }
            catch (error) {
                // Chuyển lỗi cho global error handler
                next(error);
            }
        });
    }
    // Lấy thống kê phòng theo trạng thái
    getRoomStatistics(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
                const buildingId = req.query.buildingId ? parseInt(req.query.buildingId) : undefined;
                // Xây dựng filter dựa trên buildingId
                const roomFilter = {};
                if (buildingId) {
                    roomFilter.buildingId = buildingId;
                }
                // Đếm phòng theo từng trạng thái
                const [available, full, underMaintenance] = yield Promise.all([
                    prisma.room.count({
                        where: Object.assign(Object.assign({}, roomFilter), { status: 'AVAILABLE' })
                    }),
                    prisma.room.count({
                        where: Object.assign(Object.assign({}, roomFilter), { status: 'FULL' })
                    }),
                    prisma.room.count({
                        where: Object.assign(Object.assign({}, roomFilter), { status: 'UNDER_MAINTENANCE' })
                    })
                ]);
                res.status(200).json({
                    status: 'success',
                    data: {
                        available,
                        full,
                        maintenance: underMaintenance
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.DashboardController = DashboardController;

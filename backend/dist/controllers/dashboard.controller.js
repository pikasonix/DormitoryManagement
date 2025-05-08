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
// Lưu ý: Nên sử dụng một instance PrismaClient duy nhất (singleton)
// được khởi tạo ở một file khác (vd: src/utils/prisma.ts) và import vào đây.
const prisma = new client_1.PrismaClient();
class DashboardController {
    // Lấy các số liệu thống kê tổng quan
    getStats(_req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Đổi prisma.resident thành prisma.studentProfile
                const [totalStudents, totalRooms, totalUsers, totalBuildings] = yield Promise.all([
                    prisma.studentProfile.count(), // Đổi tên biến và model
                    prisma.room.count(),
                    prisma.user.count(),
                    prisma.building.count() // Thêm số lượng tòa nhà nếu cần
                ]);
                res.status(200).json({
                    status: 'success',
                    data: {
                        totalStudents, // Đổi tên key
                        totalRooms,
                        totalUsers,
                        totalBuildings
                    }
                });
            }
            catch (error) {
                // Chuyển lỗi cho global error handler
                next(error);
            }
        });
    }
    // Lấy thống kê sinh viên theo giới tính
    getStudentsByGender(_req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Đổi prisma.resident thành prisma.studentProfile
                const stats = yield prisma.studentProfile.groupBy({
                    by: ['gender'],
                    _count: {
                        gender: true // Đếm theo field gender
                    },
                });
                // Định dạng lại kết quả cho dễ hiểu hơn (tùy chọn)
                const formattedStats = stats.map(item => ({
                    gender: item.gender,
                    count: item._count.gender
                }));
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
    getRoomsOccupancy(_req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Lấy thông tin phòng bao gồm cả actualOccupancy
                const rooms = yield prisma.room.findMany({
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
    getRecentActivities(_req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Đổi prisma.resident thành prisma.studentProfile
                // Đổi select name thành fullName
                const recentStudents = yield prisma.studentProfile.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        fullName: true, // Đổi từ name
                        createdAt: true,
                        updatedAt: true,
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
}
exports.DashboardController = DashboardController;

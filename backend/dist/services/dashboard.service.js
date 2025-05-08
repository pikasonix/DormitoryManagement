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
exports.DashboardService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DashboardService {
    /**
     * Lấy các số liệu thống kê tổng quan cho dashboard.
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalStudents, totalRooms, maleStudents, femaleStudents, totalBuildings, pendingMaintenance] = yield Promise.all([
                prisma.studentProfile.count(),
                prisma.room.count(),
                prisma.studentProfile.count({ where: { gender: 'MALE' } }),
                prisma.studentProfile.count({ where: { gender: 'FEMALE' } }),
                prisma.building.count(),
                prisma.maintenance.count({ where: { status: 'PENDING' } })
            ]);
            return {
                totalStudents,
                totalRooms,
                totalBuildings,
                maleStudents,
                femaleStudents,
                pendingMaintenance
            };
        });
    }
    /**
     * Thống kê sinh viên theo giới tính.
     */
    getStudentsByGender() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield prisma.studentProfile.groupBy({
                by: ['gender'],
                _count: {
                    gender: true
                },
            });
            return stats.map(item => ({
                gender: item.gender,
                count: item._count.gender
            }));
        });
    }
    /**
     * Thống kê sinh viên theo Khoa/Viện.
     */
    getStudentsByFaculty() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield prisma.studentProfile.groupBy({
                by: ['faculty'],
                _count: {
                    faculty: true
                },
                orderBy: {
                    _count: {
                        faculty: 'desc'
                    }
                }
            });
            return stats.map(item => ({
                faculty: item.faculty || 'Chưa xác định',
                count: item._count.faculty
            }));
        });
    }
    /**
     * Lấy danh sách sinh viên được tạo gần đây.
     * @param limit Số lượng sinh viên cần lấy (mặc định 5)
     */
    getRecentStudents() {
        return __awaiter(this, arguments, void 0, function* (limit = 5) {
            return prisma.studentProfile.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    fullName: true,
                    faculty: true,
                    gender: true,
                    createdAt: true,
                    user: {
                        select: { email: true }
                    },
                    room: {
                        select: {
                            number: true,
                            building: { select: { name: true } }
                        }
                    }
                }
            });
        });
    }
    /**
     * Lấy thông tin về tình trạng sử dụng phòng.
     */
    getRoomOccupancy() {
        return __awaiter(this, void 0, void 0, function* () {
            const rooms = yield prisma.room.findMany({
                select: {
                    id: true,
                    number: true,
                    capacity: true,
                    actualOccupancy: true,
                    status: true,
                    building: {
                        select: { name: true }
                    }
                },
                orderBy: [
                    { building: { name: 'asc' } },
                    { number: 'asc' }
                ]
            });
            return rooms.map(room => ({
                roomId: room.id,
                buildingName: room.building.name,
                roomNumber: room.number,
                capacity: room.capacity,
                occupied: room.actualOccupancy,
                available: room.capacity - room.actualOccupancy,
                status: room.status
            }));
        });
    }
    /**
    * Lấy thống kê báo cáo bảo trì theo trạng thái.
    */
    getMaintenanceStatsByStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield prisma.maintenance.groupBy({
                by: ['status'],
                _count: {
                    status: true
                },
            });
            return stats.map(item => ({
                status: item.status,
                count: item._count.status
            }));
        });
    }
}
exports.DashboardService = DashboardService;

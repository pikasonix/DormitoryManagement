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
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalResidents, totalRooms, maleResidents, femaleResidents] = yield Promise.all([
                prisma.resident.count(),
                prisma.room.count(),
                prisma.resident.count({ where: { gender: 'MALE' } }),
                prisma.resident.count({ where: { gender: 'FEMALE' } })
            ]);
            return {
                totalResidents,
                totalRooms,
                maleResidents,
                femaleResidents
            };
        });
    }
    getResidentsByGender() {
        return __awaiter(this, void 0, void 0, function* () {
            const residents = yield prisma.resident.groupBy({
                by: ['gender'],
                _count: true
            });
            return residents.map(item => ({
                gender: item.gender,
                count: item._count
            }));
        });
    }
    getResidentsByEducation() {
        return __awaiter(this, void 0, void 0, function* () {
            const residents = yield prisma.resident.groupBy({
                by: ['education'],
                _count: true
            });
            return residents.map(item => ({
                education: item.education,
                count: item._count
            }));
        });
    }
    getRecentResidents() {
        return __awaiter(this, arguments, void 0, function* (limit = 5) {
            return prisma.resident.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    education: true,
                    gender: true,
                    createdAt: true,
                    room: {
                        select: {
                            number: true
                        }
                    }
                }
            });
        });
    }
    getRoomOccupancy() {
        return __awaiter(this, void 0, void 0, function* () {
            const rooms = yield prisma.room.findMany({
                include: {
                    _count: {
                        select: { residents: true }
                    }
                }
            });
            return rooms.map(room => ({
                roomNumber: room.number,
                capacity: room.capacity,
                occupied: room._count.residents,
                available: room.capacity - room._count.residents
            }));
        });
    }
}
exports.DashboardService = DashboardService;

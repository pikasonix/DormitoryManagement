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
const prisma = new client_1.PrismaClient();
class DashboardController {
    getStats(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [totalResidents, totalRooms, totalUsers] = yield Promise.all([
                    prisma.resident.count(),
                    prisma.room.count(),
                    prisma.user.count()
                ]);
                res.json({
                    totalResidents,
                    totalRooms,
                    totalUsers
                });
            }
            catch (error) {
                res.status(500).json({ message: 'Error getting stats' });
            }
        });
    }
    getResidentsByGender(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield prisma.resident.groupBy({
                    by: ['gender'],
                    _count: true
                });
                res.json(stats);
            }
            catch (error) {
                res.status(500).json({ message: 'Error getting gender stats' });
            }
        });
    }
    getRoomsOccupancy(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const rooms = yield prisma.room.findMany({
                    include: {
                        _count: {
                            select: { residents: true }
                        }
                    }
                });
                const occupancy = rooms.map(room => ({
                    number: room.number,
                    capacity: room.capacity,
                    occupied: room._count.residents
                }));
                res.json(occupancy);
            }
            catch (error) {
                res.status(500).json({ message: 'Error getting room occupancy' });
            }
        });
    }
    getRecentActivities(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const activities = yield prisma.resident.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                        updatedAt: true
                    }
                });
                res.json(activities);
            }
            catch (error) {
                res.status(500).json({ message: 'Error getting activities' });
            }
        });
    }
}
exports.DashboardController = DashboardController;

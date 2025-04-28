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
exports.FacilityController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class FacilityController {
    // Get all facilities
    getAllFacilities(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const facilities = yield prisma.facility.findMany({
                    include: {
                        bookings: {
                            where: {
                                startTime: {
                                    lte: new Date()
                                },
                                endTime: {
                                    gte: new Date()
                                }
                            },
                            include: {
                                resident: true
                            }
                        },
                        maintenanceLogs: {
                            where: {
                                status: 'in_progress'
                            }
                        }
                    }
                });
                res.json(facilities);
            }
            catch (error) {
                console.error('Error getting facilities:', error);
                res.status(500).json({ message: 'Gagal mengambil data fasilitas' });
            }
        });
    }
    // Create facility
    createFacility(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, type, capacity, status, image, description, location, maintenanceSchedule } = req.body;
                const facility = yield prisma.facility.create({
                    data: {
                        name,
                        type,
                        capacity: parseInt(capacity),
                        status,
                        image,
                        description,
                        location,
                        maintenanceSchedule
                    }
                });
                res.status(201).json(facility);
            }
            catch (error) {
                console.error('Error creating facility:', error);
                res.status(500).json({ message: 'Gagal membuat fasilitas baru' });
            }
        });
    }
    // Create booking
    createBooking(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { facilityId, residentId, startTime, endTime, purpose, notes } = req.body;
                // Check if facility is available
                const existingBookings = yield prisma.booking.findMany({
                    where: {
                        facilityId: parseInt(facilityId),
                        OR: [
                            {
                                AND: [
                                    { startTime: { lte: new Date(startTime) } },
                                    { endTime: { gte: new Date(startTime) } }
                                ]
                            },
                            {
                                AND: [
                                    { startTime: { lte: new Date(endTime) } },
                                    { endTime: { gte: new Date(endTime) } }
                                ]
                            }
                        ]
                    }
                });
                if (existingBookings.length > 0) {
                    return res.status(400).json({ message: 'Fasilitas sudah dibooking untuk waktu tersebut' });
                }
                const booking = yield prisma.booking.create({
                    data: {
                        facilityId: parseInt(facilityId),
                        residentId: parseInt(residentId),
                        startTime: new Date(startTime),
                        endTime: new Date(endTime),
                        purpose,
                        notes,
                        status: 'pending'
                    },
                    include: {
                        facility: true,
                        resident: true
                    }
                });
                res.status(201).json(booking);
            }
            catch (error) {
                console.error('Error creating booking:', error);
                res.status(500).json({ message: 'Gagal membuat booking' });
            }
        });
    }
    // Create maintenance log
    createMaintenanceLog(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { facilityId, type, description, startDate, status, notes } = req.body;
                const maintenanceLog = yield prisma.maintenanceLog.create({
                    data: {
                        facilityId: parseInt(facilityId),
                        type,
                        description,
                        startDate: new Date(startDate),
                        status,
                        notes
                    },
                    include: {
                        facility: true
                    }
                });
                // Update facility status if maintenance is starting
                if (status === 'in_progress') {
                    yield prisma.facility.update({
                        where: { id: parseInt(facilityId) },
                        data: { status: 'maintenance' }
                    });
                }
                res.status(201).json(maintenanceLog);
            }
            catch (error) {
                console.error('Error creating maintenance log:', error);
                res.status(500).json({ message: 'Gagal membuat log maintenance' });
            }
        });
    }
}
exports.FacilityController = FacilityController;

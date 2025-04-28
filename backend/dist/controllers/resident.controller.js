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
exports.ResidentController = void 0;
const resident_service_1 = require("../services/resident.service");
const client_1 = require("@prisma/client");
const residentService = new resident_service_1.ResidentService();
const prisma = new client_1.PrismaClient();
// Definisikan enum ResidentStatus sesuai dengan schema Prisma
var ResidentStatus;
(function (ResidentStatus) {
    ResidentStatus["NEW"] = "NEW";
    ResidentStatus["ACTIVE"] = "ACTIVE";
    ResidentStatus["ALUMNI"] = "ALUMNI";
})(ResidentStatus || (ResidentStatus = {}));
class ResidentController {
    getAllResidents(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Fetching all residents...');
                const residents = yield prisma.resident.findMany({
                    include: {
                        room: true,
                        documents: true,
                        payments: {
                            orderBy: {
                                date: 'desc'
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });
                console.log(`Found ${residents.length} residents`);
                return res.json(residents);
            }
            catch (error) {
                console.error('Error getting residents:', error);
                return res.status(500).json({ message: 'Gagal mengambil data penghuni' });
            }
        });
    }
    getResident(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const resident = yield prisma.resident.findUnique({
                    where: { id: Number(id) },
                    include: {
                        room: true,
                        documents: true
                    }
                });
                if (!resident) {
                    return res.status(404).json({ message: 'Resident not found' });
                }
                return res.json(resident);
            }
            catch (error) {
                return res.status(500).json({ message: 'Error getting resident' });
            }
        });
    }
    createResident(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let data = JSON.parse(req.body.data);
                // Validasi status
                if (!Object.values(ResidentStatus).includes(data.status)) {
                    throw new Error(`Status tidak valid: ${data.status}`);
                }
                // Format data dengan status yang benar
                const residentData = Object.assign({ name: data.name, nik: data.nik, birthPlace: data.birthPlace, birthDate: data.birthDate, gender: data.gender, address: data.address, phone: data.phone || null, education: data.education, schoolName: data.schoolName, grade: data.grade || null, major: data.major || null, assistance: data.assistance, details: data.details || null, roomId: parseInt(data.roomId), status: data.status, createdAt: new Date() }, (data.status === ResidentStatus.ALUMNI ? {
                    exitDate: new Date(data.exitDate),
                    alumniNotes: data.alumniNotes
                } : {
                    exitDate: null,
                    alumniNotes: null
                }));
                const resident = yield prisma.resident.create({
                    data: residentData,
                    include: {
                        room: true
                    }
                });
                return res.status(201).json({
                    message: 'Penghuni berhasil ditambahkan',
                    data: resident
                });
            }
            catch (error) {
                return res.status(400).json({
                    message: 'Gagal menambahkan penghuni',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });
    }
    updateResident(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const data = JSON.parse(req.body.data);
                const updatedResident = yield residentService.update(parseInt(id), data);
                return res.json(updatedResident);
            }
            catch (error) {
                return res.status(500).json({ message: 'Error updating resident' });
            }
        });
    }
    deleteResident(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                // Validate if resident exists first
                const resident = yield prisma.resident.findUnique({
                    where: { id: Number(id) },
                    include: {
                        documents: true,
                        payments: true,
                        bookings: true
                    }
                });
                if (!resident) {
                    return res.status(404).json({
                        message: 'Penghuni tidak ditemukan'
                    });
                }
                console.log('=== DELETE RESIDENT DEBUG ===');
                console.log('Resident ID:', id);
                console.log('Documents:', resident.documents.length);
                console.log('Payments:', resident.payments.length);
                console.log('Bookings:', resident.bookings.length);
                try {
                    // Delete all related records in a transaction
                    yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                        // Delete related bookings first
                        if (resident.bookings.length > 0) {
                            console.log('Deleting bookings...');
                            yield tx.booking.deleteMany({
                                where: { residentId: Number(id) }
                            });
                        }
                        // Delete related payments
                        if (resident.payments.length > 0) {
                            console.log('Deleting payments...');
                            yield tx.payment.deleteMany({
                                where: { residentId: Number(id) }
                            });
                        }
                        // Delete related documents
                        if (resident.documents.length > 0) {
                            console.log('Deleting documents...');
                            yield tx.document.deleteMany({
                                where: { residentId: Number(id) }
                            });
                        }
                        // Finally delete the resident
                        console.log('Deleting resident...');
                        yield tx.resident.delete({
                            where: { id: Number(id) }
                        });
                    }));
                    console.log('=== DELETE SUCCESS ===');
                    return res.json({ message: 'Penghuni berhasil dihapus' });
                }
                catch (error) {
                    console.error('Transaction error:', error);
                    throw error;
                }
            }
            catch (error) {
                console.error('=== DELETE ERROR DEBUG ===');
                console.error('Error:', error);
                return res.status(500).json({
                    message: 'Gagal menghapus data penghuni',
                    error: process.env.NODE_ENV === 'development' ? error : undefined
                });
            }
        });
    }
}
exports.ResidentController = ResidentController;

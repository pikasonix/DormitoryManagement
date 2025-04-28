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
exports.deletePayment = exports.updatePayment = exports.createPayment = exports.getPaymentById = exports.getPayments = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Get all payments with resident data
const getPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { residentId } = req.query;
        console.log('Getting payments with query:', { residentId });
        // Ambil data resident terlebih dahulu jika ada residentId
        if (residentId) {
            const resident = yield prisma.resident.findUnique({
                where: { id: Number(residentId) },
                include: {
                    room: true,
                    payments: {
                        orderBy: { date: 'desc' }
                    }
                }
            });
            if (!resident) {
                return res.status(404).json({ message: 'Resident tidak ditemukan' });
            }
            // Return payments dari resident
            return res.json(resident.payments.map(payment => (Object.assign(Object.assign({}, payment), { resident: {
                    id: resident.id,
                    name: resident.name,
                    room: resident.room
                } }))));
        }
        // Jika tidak ada residentId, ambil semua payments dengan join
        const payments = yield prisma.payment.findMany({
            include: {
                resident: {
                    include: {
                        room: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        console.log(`Found ${payments.length} payments`);
        res.json(payments);
    }
    catch (error) {
        console.error('Error getting payments:', error.message);
        res.status(500).json({ message: 'Failed to get payments' });
    }
});
exports.getPayments = getPayments;
// Get payment by ID
const getPaymentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log('Getting payment with ID:', id);
        // Pastikan ID valid
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                message: 'ID pembayaran tidak valid',
                received: id
            });
        }
        const payment = yield prisma.payment.findUnique({
            where: {
                id: Number(id)
            },
            include: {
                resident: {
                    include: {
                        room: true
                    }
                }
            }
        });
        if (!payment) {
            console.log('Payment not found with ID:', id);
            return res.status(404).json({ message: 'Pembayaran tidak ditemukan' });
        }
        console.log('Found payment:', payment);
        res.json(payment);
    }
    catch (error) {
        console.error('Error getting payment:', error);
        res.status(500).json({ message: 'Gagal mengambil data pembayaran' });
    }
});
exports.getPaymentById = getPaymentById;
// Create payment
const createPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Creating payment with data:', req.body);
        const { residentId, amount, type, status, notes } = req.body;
        // Validasi input
        if (!residentId || !amount || !type || !status) {
            return res.status(400).json({
                message: 'Data tidak lengkap',
                received: { residentId, amount, type, status, notes }
            });
        }
        const payment = yield prisma.payment.create({
            data: {
                residentId: Number(residentId),
                amount: Number(amount),
                type,
                status,
                notes,
                date: new Date()
            },
            include: {
                resident: true
            }
        });
        console.log('Payment created:', payment);
        res.status(201).json(payment);
    }
    catch (error) {
        console.error('Error creating payment:', error.message);
        res.status(500).json({ message: 'Failed to create payment' });
    }
});
exports.createPayment = createPayment;
// Update payment
const updatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { amount, type, status, notes } = req.body;
        console.log('Updating payment:', { id, body: req.body });
        // Validasi ID
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                message: 'ID pembayaran tidak valid',
                received: id
            });
        }
        // Validasi input
        if (!amount || !type || !status) {
            return res.status(400).json({
                message: 'Data tidak lengkap',
                received: { amount, type, status, notes }
            });
        }
        // Cek apakah payment ada
        const existingPayment = yield prisma.payment.findUnique({
            where: { id: Number(id) }
        });
        if (!existingPayment) {
            console.log('Payment not found with ID:', id);
            return res.status(404).json({ message: 'Pembayaran tidak ditemukan' });
        }
        // Update payment
        const payment = yield prisma.payment.update({
            where: {
                id: Number(id)
            },
            data: {
                amount: Number(amount),
                type,
                status,
                notes: notes || ''
            },
            include: {
                resident: {
                    include: {
                        room: true
                    }
                }
            }
        });
        console.log('Payment updated:', payment);
        res.json(payment);
    }
    catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({
            message: 'Gagal mengupdate pembayaran',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.updatePayment = updatePayment;
// Delete payment
const deletePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.payment.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Pembayaran berhasil dihapus' });
    }
    catch (error) {
        console.error('Error deleting payment:', error.message);
        res.status(500).json({ message: 'Gagal menghapus pembayaran' });
    }
});
exports.deletePayment = deletePayment;

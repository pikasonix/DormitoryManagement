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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
// Create wrapper functions to simulate Sequelize-like behavior if needed
const Payment = {
    // Compatibility methods if needed
    findByPk: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return yield prisma_1.default.payment.findUnique({
            where: { id }
        });
    }),
    findAll: (options) => __awaiter(void 0, void 0, void 0, function* () {
        const where = (options === null || options === void 0 ? void 0 : options.where) || {};
        return yield prisma_1.default.payment.findMany({
            where,
            include: options === null || options === void 0 ? void 0 : options.include
        });
    }),
    create: (data) => __awaiter(void 0, void 0, void 0, function* () {
        // Convert from Sequelize format to Prisma format
        const prismaData = {
            invoiceId: data.invoice_id,
            studentProfileId: data.student_id,
            amount: data.amount,
            paymentMethod: data.payment_method,
            transactionCode: data.transaction_id || '',
            paymentDate: data.payment_date || new Date(),
            notes: typeof data.payment_details === 'object'
                ? JSON.stringify(data.payment_details)
                : data.payment_details || null
        };
        return yield prisma_1.default.payment.create({
            data: prismaData
        });
    }),
    update: (instance, data) => __awaiter(void 0, void 0, void 0, function* () {
        // For compatibility with Sequelize's instance.update() pattern
        if (instance.id) {
            return yield prisma_1.default.payment.update({
                where: { id: instance.id },
                data: {
                    transactionCode: data.transaction_id || data.transactionCode || instance.transactionCode,
                    paymentMethod: data.payment_method || data.paymentMethod || instance.paymentMethod,
                    notes: data.notes || instance.notes
                }
            });
        }
        else {
            throw new Error('Invalid payment instance for update');
        }
    })
};
exports.default = Payment;

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
const Invoice = {
    // Compatibility methods if needed
    findByPk: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return yield prisma_1.default.invoice.findUnique({
            where: { id }
        });
    }),
    findAll: (options) => __awaiter(void 0, void 0, void 0, function* () {
        const where = (options === null || options === void 0 ? void 0 : options.where) || {};
        return yield prisma_1.default.invoice.findMany({
            where,
            include: options === null || options === void 0 ? void 0 : options.include
        });
    }),
    create: (data) => __awaiter(void 0, void 0, void 0, function* () {
        return yield prisma_1.default.invoice.create({
            data
        });
    }),
    update: (data, options) => __awaiter(void 0, void 0, void 0, function* () {
        return yield prisma_1.default.invoice.update({
            where: options.where,
            data
        });
    })
};
exports.default = Invoice;

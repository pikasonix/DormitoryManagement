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
exports.FeeService = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const prisma = new client_1.PrismaClient();
class FeeService {
    getAllFeeRates(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10, feeType, isActive, search = '', } = options;
            const skip = (page - 1) * limit;
            const whereClause = {};
            if (feeType) {
                whereClause.feeType = feeType;
            }
            if (isActive !== undefined) {
                whereClause.isActive = isActive;
            }
            if (search) {
                whereClause.name = {
                    contains: search,
                    mode: 'insensitive',
                };
            }
            const [feeRates, total] = yield Promise.all([
                prisma.feeRate.findMany({
                    where: whereClause,
                    orderBy: { effectiveFrom: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.feeRate.count({ where: whereClause }),
            ]);
            return {
                feeRates,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }
    getFeeRateById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.feeRate.findUnique({
                where: { id },
            });
        });
    }
    createFeeRate(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.feeRate.create({
                data: {
                    name: data.name,
                    feeType: data.feeType,
                    vehicleType: data.vehicleType || null,
                    unitPrice: new library_1.Decimal(data.unitPrice.toString()),
                    unit: data.unit,
                    effectiveFrom: data.effectiveFrom,
                    effectiveTo: data.effectiveTo || null,
                    description: data.description,
                    isActive: data.isActive !== undefined ? data.isActive : true,
                },
            });
        });
    }
    updateFeeRate(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {};
            if (data.name !== undefined)
                updateData.name = data.name;
            if (data.feeType !== undefined)
                updateData.feeType = data.feeType;
            if (data.vehicleType !== undefined)
                updateData.vehicleType = data.vehicleType;
            if (data.unitPrice !== undefined)
                updateData.unitPrice = new library_1.Decimal(data.unitPrice.toString());
            if (data.unit !== undefined)
                updateData.unit = data.unit;
            if (data.effectiveFrom !== undefined)
                updateData.effectiveFrom = data.effectiveFrom;
            if (data.effectiveTo !== undefined)
                updateData.effectiveTo = data.effectiveTo;
            if (data.description !== undefined)
                updateData.description = data.description;
            if (data.isActive !== undefined)
                updateData.isActive = data.isActive;
            return prisma.feeRate.update({
                where: { id },
                data: updateData,
            });
        });
    }
    deleteFeeRate(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.feeRate.delete({
                where: { id },
            });
        });
    }
}
exports.FeeService = FeeService;

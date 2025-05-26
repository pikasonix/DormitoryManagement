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
exports.FeeController = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const prisma = new client_1.PrismaClient();
class FeeController {
    // Get all fee rates
    getAllFeeRates(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10, feeType, isActive, search = '' } = req.query;
                const pageNumber = Number(page);
                const limitNumber = Number(limit);
                const skip = (pageNumber - 1) * limitNumber;
                const whereClause = {};
                if (feeType) {
                    whereClause.feeType = feeType;
                }
                if (isActive !== undefined) {
                    whereClause.isActive = isActive === 'true';
                }
                // Search by name
                if (search) {
                    whereClause.name = {
                        contains: search,
                        mode: 'insensitive'
                    };
                }
                const [feeRates, totalCount] = yield Promise.all([
                    prisma.feeRate.findMany({
                        where: whereClause,
                        orderBy: { effectiveFrom: 'desc' },
                        skip,
                        take: limitNumber
                    }),
                    prisma.feeRate.count({ where: whereClause })
                ]);
                const totalPages = Math.ceil(totalCount / limitNumber);
                res.status(200).json({
                    success: true,
                    data: {
                        feeRates,
                        meta: {
                            page: pageNumber,
                            limit: limitNumber,
                            total: totalCount,
                            totalPages
                        }
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Get fee rate by ID
    getFeeRateById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const feeRateId = parseInt(id);
                if (isNaN(feeRateId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid fee rate ID'
                    });
                }
                const feeRate = yield prisma.feeRate.findUnique({
                    where: { id: feeRateId }
                });
                if (!feeRate) {
                    return res.status(404).json({
                        success: false,
                        message: `Fee rate with ID ${id} not found`
                    });
                }
                res.status(200).json({
                    success: true,
                    data: feeRate
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Create new fee rate
    createFeeRate(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, feeType, vehicleType, unitPrice, unit, effectiveFrom, effectiveTo, description, isActive } = req.body;
                if (!name || !feeType || !unitPrice) {
                    return res.status(400).json({
                        success: false,
                        message: 'Name, fee type, and unit price are required'
                    });
                }
                // Check for existing active fee rate with same type and vehicle type
                if (isActive) {
                    const existingActiveRate = yield prisma.feeRate.findFirst({
                        where: {
                            feeType: feeType,
                            vehicleType: vehicleType || null,
                            isActive: true,
                            effectiveTo: null, // Still active without an end date
                            id: { not: req.params.id ? parseInt(req.params.id) : undefined } // Exclude current rate when updating
                        }
                    });
                    if (existingActiveRate) {
                        return res.status(400).json({
                            success: false,
                            message: 'Another active fee rate of the same type already exists. Please deactivate it first.'
                        });
                    }
                }
                const newFeeRate = yield prisma.feeRate.create({
                    data: {
                        name,
                        feeType: feeType,
                        vehicleType: vehicleType || null,
                        unitPrice: new library_1.Decimal(unitPrice),
                        unit,
                        effectiveFrom: new Date(effectiveFrom),
                        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
                        description,
                        isActive: isActive !== undefined ? isActive : true
                    }
                });
                res.status(201).json({
                    success: true,
                    data: newFeeRate
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    return res.status(400).json({
                        success: false,
                        message: `A fee rate with the same name already exists`
                    });
                }
                next(error);
            }
        });
    }
    // Update fee rate
    updateFeeRate(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const feeRateId = parseInt(id);
                if (isNaN(feeRateId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid fee rate ID'
                    });
                }
                const { name, feeType, vehicleType, unitPrice, unit, effectiveFrom, effectiveTo, description, isActive } = req.body;
                // Check for existing active fee rate with same type and vehicle type
                if (isActive) {
                    const existingActiveRate = yield prisma.feeRate.findFirst({
                        where: {
                            feeType: feeType,
                            vehicleType: vehicleType || null,
                            isActive: true,
                            effectiveTo: null, // Still active without an end date
                            id: { not: feeRateId } // Exclude current rate
                        }
                    });
                    if (existingActiveRate) {
                        return res.status(400).json({
                            success: false,
                            message: 'Another active fee rate of the same type already exists. Please deactivate it first.'
                        });
                    }
                }
                const updatedFeeRate = yield prisma.feeRate.update({
                    where: { id: feeRateId },
                    data: {
                        name: name,
                        feeType: feeType,
                        vehicleType: vehicleType || null,
                        unitPrice: unitPrice ? new library_1.Decimal(unitPrice) : undefined,
                        unit,
                        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
                        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
                        description,
                        isActive
                    }
                });
                res.status(200).json({
                    success: true,
                    data: updatedFeeRate
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2025') {
                        return res.status(404).json({
                            success: false,
                            message: `Fee rate with ID ${req.params.id} not found`
                        });
                    }
                    else if (error.code === 'P2002') {
                        return res.status(400).json({
                            success: false,
                            message: `A fee rate with the same name already exists`
                        });
                    }
                }
                next(error);
            }
        });
    }
    // Delete fee rate
    deleteFeeRate(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const feeRateId = parseInt(id);
                if (isNaN(feeRateId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid fee rate ID'
                    });
                }
                yield prisma.feeRate.delete({
                    where: { id: feeRateId }
                });
                res.status(200).json({
                    success: true,
                    message: 'Fee rate deleted successfully'
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return res.status(404).json({
                        success: false,
                        message: `Fee rate with ID ${req.params.id} not found`
                    });
                }
                next(error);
            }
        });
    }
}
exports.FeeController = FeeController;

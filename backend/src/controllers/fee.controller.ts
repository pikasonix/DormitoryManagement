import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, FeeType, VehicleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class FeeController {
    // Get all fee rates
    async getAllFeeRates(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                page = 1,
                limit = 10,
                feeType,
                isActive,
                search = ''
            } = req.query;

            const pageNumber = Number(page);
            const limitNumber = Number(limit);
            const skip = (pageNumber - 1) * limitNumber;

            const whereClause: Prisma.FeeRateWhereInput = {};

            if (feeType) {
                whereClause.feeType = feeType as FeeType;
            }

            if (isActive !== undefined) {
                whereClause.isActive = isActive === 'true';
            }

            // Search by name
            if (search) {
                whereClause.name = {
                    contains: search as string,
                    mode: 'insensitive'
                };
            }

            const [feeRates, totalCount] = await Promise.all([
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
        } catch (error) {
            next(error);
        }
    }

    // Get fee rate by ID
    async getFeeRateById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const feeRateId = parseInt(id);

            if (isNaN(feeRateId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee rate ID'
                });
            }

            const feeRate = await prisma.feeRate.findUnique({
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
        } catch (error) {
            next(error);
        }
    }

    // Create new fee rate
    async createFeeRate(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                name,
                feeType,
                vehicleType,
                unitPrice,
                unit,
                effectiveFrom,
                effectiveTo,
                description,
                isActive
            } = req.body;

            if (!name || !feeType || !unitPrice) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, fee type, and unit price are required'
                });
            }

            // Check for existing active fee rate with same type and vehicle type
            if (isActive) {
                const existingActiveRate = await prisma.feeRate.findFirst({
                    where: {
                        feeType: feeType as FeeType,
                        vehicleType: vehicleType as VehicleType || null,
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

            const newFeeRate = await prisma.feeRate.create({
                data: {
                    name,
                    feeType: feeType as FeeType,
                    vehicleType: vehicleType as VehicleType || null,
                    unitPrice: new Decimal(unitPrice),
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
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(400).json({
                    success: false,
                    message: `A fee rate with the same name already exists`
                });
            }
            next(error);
        }
    }

    // Update fee rate
    async updateFeeRate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const feeRateId = parseInt(id);

            if (isNaN(feeRateId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee rate ID'
                });
            }

            const {
                name,
                feeType,
                vehicleType,
                unitPrice,
                unit,
                effectiveFrom,
                effectiveTo,
                description,
                isActive
            } = req.body;

            // Check for existing active fee rate with same type and vehicle type
            if (isActive) {
                const existingActiveRate = await prisma.feeRate.findFirst({
                    where: {
                        feeType: feeType as FeeType,
                        vehicleType: vehicleType as VehicleType || null,
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

            const updatedFeeRate = await prisma.feeRate.update({
                where: { id: feeRateId },
                data: {
                    name: name,
                    feeType: feeType as FeeType,
                    vehicleType: vehicleType as VehicleType || null,
                    unitPrice: unitPrice ? new Decimal(unitPrice) : undefined,
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
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    return res.status(404).json({
                        success: false,
                        message: `Fee rate with ID ${req.params.id} not found`
                    });
                } else if (error.code === 'P2002') {
                    return res.status(400).json({
                        success: false,
                        message: `A fee rate with the same name already exists`
                    });
                }
            }
            next(error);
        }
    }

    // Delete fee rate
    async deleteFeeRate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const feeRateId = parseInt(id);

            if (isNaN(feeRateId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee rate ID'
                });
            }

            await prisma.feeRate.delete({
                where: { id: feeRateId }
            });

            res.status(200).json({
                success: true,
                message: 'Fee rate deleted successfully'
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return res.status(404).json({
                    success: false,
                    message: `Fee rate with ID ${req.params.id} not found`
                });
            }
            next(error);
        }
    }
}

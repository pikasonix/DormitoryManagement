import { PrismaClient, Prisma, FeeType, FeeRate, VehicleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class FeeService {
    async getAllFeeRates(options: {
        page?: number;
        limit?: number;
        feeType?: FeeType;
        isActive?: boolean;
        search?: string;
    }): Promise<{ feeRates: FeeRate[]; total: number; page: number; limit: number; totalPages: number }> {
        const {
            page = 1,
            limit = 10,
            feeType,
            isActive,
            search = '',
        } = options;

        const skip = (page - 1) * limit;

        const whereClause: Prisma.FeeRateWhereInput = {};

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

        const [feeRates, total] = await Promise.all([
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
    }

    async getFeeRateById(id: number): Promise<FeeRate | null> {
        return prisma.feeRate.findUnique({
            where: { id },
        });
    }

    async createFeeRate(data: {
        name: string;
        feeType: FeeType;
        vehicleType?: VehicleType | null;
        unitPrice: number | string | Decimal;
        unit?: string;
        effectiveFrom: Date;
        effectiveTo?: Date | null;
        description?: string;
        isActive?: boolean;
    }): Promise<FeeRate> {
        return prisma.feeRate.create({
            data: {
                name: data.name,
                feeType: data.feeType,
                vehicleType: data.vehicleType || null,
                unitPrice: new Decimal(data.unitPrice.toString()),
                unit: data.unit,
                effectiveFrom: data.effectiveFrom,
                effectiveTo: data.effectiveTo || null,
                description: data.description,
                isActive: data.isActive !== undefined ? data.isActive : true,
            },
        });
    }

    async updateFeeRate(
        id: number,
        data: Partial<{
            name: string;
            feeType: FeeType;
            vehicleType: VehicleType | null;
            unitPrice: number | string | Decimal;
            unit: string;
            effectiveFrom: Date;
            effectiveTo: Date | null;
            description: string;
            isActive: boolean;
        }>
    ): Promise<FeeRate> {
        const updateData: Prisma.FeeRateUpdateInput = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.feeType !== undefined) updateData.feeType = data.feeType;
        if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
        if (data.unitPrice !== undefined) updateData.unitPrice = new Decimal(data.unitPrice.toString());
        if (data.unit !== undefined) updateData.unit = data.unit;
        if (data.effectiveFrom !== undefined) updateData.effectiveFrom = data.effectiveFrom;
        if (data.effectiveTo !== undefined) updateData.effectiveTo = data.effectiveTo;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        return prisma.feeRate.update({
            where: { id },
            data: updateData,
        });
    }

    async deleteFeeRate(id: number): Promise<FeeRate> {
        return prisma.feeRate.delete({
            where: { id },
        });
    }
}

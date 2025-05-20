import express from 'express';
import { FeeController } from '../controllers/fee.controller';
import { validate } from '../middleware/validation.middleware';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const feeController = new FeeController();

// Define validation schemas
const createFeeRateSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Tên đơn giá là bắt buộc" }).trim().min(1, "Tên đơn giá không được để trống"),
        feeType: z.enum(["ROOM_FEE", "ELECTRICITY", "WATER", "PARKING", "OTHER_FEE"], {
            required_error: "Loại phí là bắt buộc",
            invalid_type_error: "Loại phí không hợp lệ"
        }),
        vehicleType: z.enum(["BICYCLE", "MOTORBIKE", "ELECTRIC_BICYCLE", "CAR", "OTHER"]).optional(),
        unitPrice: z.number({ required_error: "Đơn giá là bắt buộc" }).positive("Đơn giá phải là số dương"),
        unit: z.string().optional(),
        effectiveFrom: z.string().or(z.date()).transform(val => new Date(val)),
        effectiveTo: z.string().or(z.date()).optional().nullable(),
        description: z.string().optional(),
        isActive: z.boolean().default(true)
    })
});

const updateFeeRateSchema = z.object({
    params: z.object({
        id: z.string().transform(val => parseInt(val)),
    }),
    body: z.object({
        name: z.string().trim().min(1, "Tên đơn giá không được để trống").optional(),
        feeType: z.enum(["ROOM_FEE", "ELECTRICITY", "WATER", "PARKING", "OTHER_FEE"]).optional(),
        vehicleType: z.enum(["BICYCLE", "MOTORBIKE", "ELECTRIC_BICYCLE", "CAR", "OTHER"]).optional().nullable(),
        unitPrice: z.number().positive("Đơn giá phải là số dương").optional(),
        unit: z.string().optional(),
        effectiveFrom: z.string().or(z.date()).transform(val => new Date(val)).optional(),
        effectiveTo: z.string().or(z.date()).optional().nullable(),
        description: z.string().optional(),
        isActive: z.boolean().optional()
    })
});

const idParamSchema = z.object({
    params: z.object({
        id: z.string().transform(val => parseInt(val)),
    })
});

// Routes
router.get('/', authMiddleware, feeController.getAllFeeRates);
router.get('/:id', authMiddleware, validate(idParamSchema), feeController.getFeeRateById);
router.post(
    '/',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    validate(createFeeRateSchema),
    feeController.createFeeRate
);
router.put(
    '/:id',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    validate(updateFeeRateSchema),
    feeController.updateFeeRate
);
router.delete(
    '/:id',
    authMiddleware,
    checkRole([Role.ADMIN]),
    validate(idParamSchema),
    feeController.deleteFeeRate
);

export default router;

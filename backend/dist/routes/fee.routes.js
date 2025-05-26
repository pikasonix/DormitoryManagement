"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fee_controller_1 = require("../controllers/fee.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = express_1.default.Router();
const feeController = new fee_controller_1.FeeController();
// Define validation schemas
const createFeeRateSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Tên đơn giá là bắt buộc" }).trim().min(1, "Tên đơn giá không được để trống"),
        feeType: zod_1.z.enum(["ROOM_FEE", "ELECTRICITY", "WATER", "PARKING", "OTHER_FEE"], {
            required_error: "Loại phí là bắt buộc",
            invalid_type_error: "Loại phí không hợp lệ"
        }),
        vehicleType: zod_1.z.enum(["BICYCLE", "MOTORBIKE", "ELECTRIC_BICYCLE", "CAR", "OTHER"]).optional(),
        unitPrice: zod_1.z.number({ required_error: "Đơn giá là bắt buộc" }).positive("Đơn giá phải là số dương"),
        unit: zod_1.z.string().optional(),
        effectiveFrom: zod_1.z.string().or(zod_1.z.date()).transform(val => new Date(val)),
        effectiveTo: zod_1.z.string().or(zod_1.z.date()).optional().nullable(),
        description: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().default(true)
    })
});
const updateFeeRateSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(val => parseInt(val)),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1, "Tên đơn giá không được để trống").optional(),
        feeType: zod_1.z.enum(["ROOM_FEE", "ELECTRICITY", "WATER", "PARKING", "OTHER_FEE"]).optional(),
        vehicleType: zod_1.z.enum(["BICYCLE", "MOTORBIKE", "ELECTRIC_BICYCLE", "CAR", "OTHER"]).optional().nullable(),
        unitPrice: zod_1.z.number().positive("Đơn giá phải là số dương").optional(),
        unit: zod_1.z.string().optional(),
        effectiveFrom: zod_1.z.string().or(zod_1.z.date()).transform(val => new Date(val)).optional(),
        effectiveTo: zod_1.z.string().or(zod_1.z.date()).optional().nullable(),
        description: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
const idParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(val => parseInt(val)),
    })
});
// Routes
router.get('/', auth_middleware_1.authMiddleware, feeController.getAllFeeRates);
router.get('/:id', auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(idParamSchema), feeController.getFeeRateById);
router.post('/', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), (0, validation_middleware_1.validate)(createFeeRateSchema), feeController.createFeeRate);
router.put('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), (0, validation_middleware_1.validate)(updateFeeRateSchema), feeController.updateFeeRate);
router.delete('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN]), (0, validation_middleware_1.validate)(idParamSchema), feeController.deleteFeeRate);
exports.default = router;

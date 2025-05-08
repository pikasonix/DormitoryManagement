"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const building_controller_1 = require("../controllers/building.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = express_1.default.Router();
const buildingController = new building_controller_1.BuildingController();
const createBuildingSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Tên tòa nhà là bắt buộc" }).trim().min(1, "Tên tòa nhà không được để trống"),
        address: zod_1.z.string().trim().optional(),
        description: zod_1.z.string().trim().optional(),
        imageIds: zod_1.z.array(zod_1.z.number().int().positive("ID ảnh phải là số nguyên dương")).optional(),
    }),
});
const updateBuildingSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1, "Tên tòa nhà không được để trống").optional(),
        address: zod_1.z.string().trim().optional(),
        description: zod_1.z.string().trim().optional(),
        imageIds: zod_1.z.array(zod_1.z.number().int().positive("ID ảnh phải là số nguyên dương")).optional(),
    }),
});
const buildingQueryParamsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1).optional(),
        limit: zod_1.z.coerce.number().int().min(1).default(10).optional(),
        search: zod_1.z.string().trim().optional(),
    }),
});
// POST /api/buildings - Tạo tòa nhà mới
router.post('/', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), (0, validation_middleware_1.validate)(createBuildingSchema), (req, res, next) => buildingController.create(req, res, next));
// GET /api/buildings - Lấy danh sách tòa nhà
router.get('/', auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(buildingQueryParamsSchema), (req, res, next) => buildingController.getAll(req, res, next));
// GET /api/buildings/:id - Lấy chi tiết tòa nhà
router.get('/:id', auth_middleware_1.authMiddleware, (req, res, next) => buildingController.getById(req, res, next));
// PUT /api/buildings/:id - Cập nhật tòa nhà
router.put('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), (0, validation_middleware_1.validate)(updateBuildingSchema), (req, res, next) => buildingController.update(req, res, next));
// DELETE /api/buildings/:id - Xóa tòa nhà
router.delete('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), (req, res, next) => buildingController.delete(req, res, next));
exports.default = router;

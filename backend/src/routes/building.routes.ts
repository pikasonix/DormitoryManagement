import express from 'express';
import { BuildingController } from '../controllers/building.controller';
import { validate } from '../middleware/validation.middleware';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { z } from 'zod';
// import Container from 'typedi'; // Bỏ comment nếu dùng typedi

const router = express.Router();
// const buildingController = Container.get(BuildingController); // Nếu dùng typedi
const buildingController = new BuildingController(); // Khởi tạo thông thường

// --- Schemas Validation (Giữ nguyên schemas Zod đã tạo) ---
const createBuildingSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Tên tòa nhà là bắt buộc" }).trim().min(1, "Tên tòa nhà không được để trống"),
        address: z.string().trim().optional(),
        description: z.string().trim().optional(),
        imageIds: z.array(z.number().int().positive("ID ảnh phải là số nguyên dương")).optional(),
    }),
});

const updateBuildingSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, "Tên tòa nhà không được để trống").optional(),
        address: z.string().trim().optional(),
        description: z.string().trim().optional(),
        imageIds: z.array(z.number().int().positive("ID ảnh phải là số nguyên dương")).optional(),
    }),
    // params: z.object({ // Validate cả ID trong params khi update
    //     id: z.coerce.number().int().positive("ID tòa nhà không hợp lệ"),
    // }),
});

const buildingQueryParamsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
        // sortBy: z.enum(['id', 'name', 'address', 'createdAt', 'updatedAt']).default('createdAt').optional(),
        // sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
        search: z.string().trim().optional(),
    }),
});

// --- Routes ---

// POST /api/buildings - Tạo tòa nhà mới
router.post('/',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    validate(createBuildingSchema),
    // SỬA TÊN HÀM Ở ĐÂY
    (req, res, next) => buildingController.create(req, res, next)
);

// GET /api/buildings - Lấy danh sách tòa nhà
router.get('/',
    authMiddleware,
    validate(buildingQueryParamsSchema),
    // SỬA TÊN HÀM Ở ĐÂY
    (req, res, next) => buildingController.getAll(req, res, next)
);

// GET /api/buildings/:id - Lấy chi tiết tòa nhà
router.get('/:id',
    authMiddleware,
    // validate(z.object({ params: z.object({ id: z.coerce.number().int().positive("ID tòa nhà phải là số nguyên dương") }) })), // Optional param validation
    // SỬA TÊN HÀM Ở ĐÂY
    (req, res, next) => buildingController.getById(req, res, next)
);

// PUT /api/buildings/:id - Cập nhật tòa nhà
router.put('/:id',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    validate(updateBuildingSchema), // Schema này nên validate cả params.id nếu bạn bỏ comment ở trên
    // SỬA TÊN HÀM Ở ĐÂY
    (req, res, next) => buildingController.update(req, res, next)
);

// DELETE /api/buildings/:id - Xóa tòa nhà
router.delete('/:id',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    // validate(z.object({ params: z.object({ id: z.coerce.number().int().positive("ID tòa nhà phải là số nguyên dương") }) })), // Optional param validation
    // SỬA TÊN HÀM Ở ĐÂY
    (req, res, next) => buildingController.delete(req, res, next)
);

export default router;
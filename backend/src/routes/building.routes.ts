import express from 'express';
import { BuildingController } from '../controllers/building.controller';
import { validate } from '../middleware/validation.middleware';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const buildingController = new BuildingController();

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
});

const buildingQueryParamsSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1).optional(),
        limit: z.coerce.number().int().min(1).default(10).optional(),
        search: z.string().trim().optional(),
    }),
});

// POST /api/buildings - Tạo tòa nhà mới
router.post('/',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    validate(createBuildingSchema),
    (req, res, next) => buildingController.create(req, res, next)
);

// GET /api/buildings - Lấy danh sách tòa nhà
router.get('/',
    authMiddleware,
    validate(buildingQueryParamsSchema),
    (req, res, next) => buildingController.getAll(req, res, next)
);

// GET /api/buildings/:id - Lấy chi tiết tòa nhà
router.get('/:id',
    authMiddleware,
    (req, res, next) => buildingController.getById(req, res, next)
);

// PUT /api/buildings/:id - Cập nhật tòa nhà
router.put('/:id',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    validate(updateBuildingSchema),
    (req, res, next) => buildingController.update(req, res, next)
);

// DELETE /api/buildings/:id - Xóa tòa nhà
router.delete('/:id',
    authMiddleware,
    checkRole([Role.ADMIN, Role.STAFF]),
    (req, res, next) => buildingController.delete(req, res, next)
);

export default router;
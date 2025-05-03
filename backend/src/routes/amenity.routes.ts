import express from 'express';
import { AmenityController } from '../controllers/amenity.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const amenityController = new AmenityController();

// GET /api/amenities - Lấy tất cả tiện nghi
router.get('/', amenityController.getAllAmenities);

// GET /api/amenities/:id - Lấy chi tiết một tiện nghi
router.get('/:id', amenityController.getAmenityById);

// POST /api/amenities - Tạo tiện nghi mới
router.post(
  '/',
  authMiddleware,
  checkRole([Role.ADMIN, Role.STAFF]),
  amenityController.createAmenity
);

// PUT /api/amenities/:id - Cập nhật tiện nghi
router.put(
  '/:id',
  authMiddleware,
  checkRole([Role.ADMIN, Role.STAFF]),
  amenityController.updateAmenity
);

// DELETE /api/amenities/:id - Xóa tiện nghi
router.delete(
  '/:id',
  authMiddleware,
  checkRole([Role.ADMIN, Role.STAFF]),
  amenityController.deleteAmenity
);

export default router;
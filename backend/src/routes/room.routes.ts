import express from 'express';
import { RoomController } from '../controllers/room.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const roomController = new RoomController();

router.use(authMiddleware);

// GET /api/rooms - Lấy danh sách phòng (có thể lọc)
router.get(
    '/',
    roomController.getAllRooms
);

// GET /api/rooms/:id - Lấy chi tiết một phòng
router.get(
    '/:id',
    roomController.getRoomById
);

// POST /api/rooms - Tạo phòng mới
router.post(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    roomController.createRoom
);

// PUT /api/rooms/:id - Cập nhật thông tin phòng
router.put(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    roomController.updateRoom
);

// DELETE /api/rooms/:id - Xóa phòng
router.delete(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    roomController.deleteRoom
);

export default router;
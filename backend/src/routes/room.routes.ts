import express from 'express';
import { RoomController } from '../controllers/room.controller';
// Import middleware xác thực và kiểm tra quyền
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client'; // Import Role enum

const router = express.Router();
const roomController = new RoomController();

// --- Áp dụng Middleware ---
// Yêu cầu đăng nhập cho tất cả các route liên quan đến phòng
router.use(authMiddleware);

// --- CRUD Routes ---

// GET /api/rooms - Lấy danh sách phòng (có thể lọc)
// Có thể chỉ cần authMiddleware nếu mọi người dùng đăng nhập đều xem được danh sách
// Hoặc thêm checkRole nếu chỉ Admin/Staff mới xem được danh sách đầy đủ
router.get(
    '/',
    // checkRole([Role.ADMIN, Role.STAFF]), // Bỏ comment nếu cần giới hạn quyền xem
    roomController.getAllRooms
);

// GET /api/rooms/:id - Lấy chi tiết một phòng
router.get(
    '/:id',
    // authMiddleware đã được áp dụng ở trên
    roomController.getRoomById
);

// POST /api/rooms - Tạo phòng mới
router.post(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]), // Chỉ Admin/Staff được tạo phòng
    roomController.createRoom
);

// PUT /api/rooms/:id - Cập nhật thông tin phòng
router.put(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]), // Chỉ Admin/Staff được cập nhật phòng
    roomController.updateRoom
);

// DELETE /api/rooms/:id - Xóa phòng
router.delete(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]), // Chỉ Admin/Staff được xóa phòng
    roomController.deleteRoom
);

// --- Các routes liên quan khác (ví dụ: quản lý tiện nghi cho phòng) ---
// Ví dụ: Thêm/Xóa tiện nghi cho phòng (logic này có thể đặt trong RoomController hoặc AmenityController)
// POST /api/rooms/:roomId/amenities - Thêm tiện nghi vào phòng
// router.post('/:roomId/amenities', checkRole([Role.ADMIN, Role.STAFF]), roomController.addAmenityToRoom);

// DELETE /api/rooms/:roomId/amenities/:amenityId - Xóa tiện nghi khỏi phòng
// router.delete('/:roomId/amenities/:amenityId', checkRole([Role.ADMIN, Role.STAFF]), roomController.removeAmenityFromRoom);


export default router;
import express from 'express';
import { AmenityController } from '../controllers/amenity.controller';
// Giả sử bạn có các middleware này
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client'; // Import Role enum nếu dùng checkRole

const router = express.Router();
// Đổi tên biến controller
const amenityController = new AmenityController();

// Debug logging (Tùy chọn, có thể xóa trong production)
router.use((req, _res, next) => { // Đổi tên res thành _res nếu không dùng
  console.log('\n=== Amenity Route ==='); // Đổi tên route
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Path:', req.originalUrl); // Dùng originalUrl để thấy path đầy đủ
  console.log('Body:', req.body);
  console.log('Params:', req.params);
  console.log('Query:', req.query);
  console.log('===================\n');
  next();
});

// --- Public Route (Thường thì xem danh sách tiện nghi không cần login) ---
// GET /api/amenities - Lấy tất cả tiện nghi
router.get('/', amenityController.getAllAmenities);

// GET /api/amenities/:id - Lấy chi tiết một tiện nghi
router.get('/:id', amenityController.getAmenityById);


// --- Protected Routes (Cần ADMIN hoặc STAFF) ---

// POST /api/amenities - Tạo tiện nghi mới
router.post(
  '/',
  authMiddleware, // Xác thực token
  checkRole([Role.ADMIN, Role.STAFF]), // Chỉ Admin hoặc Staff được tạo
  amenityController.createAmenity // Gọi hàm controller
);

// PUT /api/amenities/:id - Cập nhật tiện nghi
router.put(
  '/:id',
  authMiddleware,
  checkRole([Role.ADMIN, Role.STAFF]), // Chỉ Admin hoặc Staff được cập nhật
  amenityController.updateAmenity
);

// DELETE /api/amenities/:id - Xóa tiện nghi
router.delete(
  '/:id',
  authMiddleware,
  checkRole([Role.ADMIN, Role.STAFF]), // Chỉ Admin hoặc Staff được xóa
  amenityController.deleteAmenity
);


// --- Các route cũ đã bị XÓA ---
// router.post('/:id/bookings', amenityController.createBooking); // Đã xóa
// router.post('/:id/maintenance', amenityController.createMaintenanceLog); // Đã xóa

export default router;
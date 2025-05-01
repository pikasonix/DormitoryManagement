import express from 'express';

// Import các routes đã có hoặc đã sửa/đổi tên
import authRoutes from './auth.routes';
import studentRoutes from './student.routes'; // ĐÃ ĐỔI TÊN TỪ resident.routes
import amenityRoutes from './amenity.routes'; // ĐÃ SỬA TỪ facility.routes
import paymentRoutes from './payment.routes'; // ĐÃ SỬA
import roomRoutes from './room.routes';       // CẦN TẠO/SỬA
import buildingRoutes from './building.routes'; // CẦN TẠO/SỬA
import maintenanceRoutes from './maintenance.routes'; // CẦN TẠO/SỬA
import mediaRoutes from './media.routes';       // CẦN TẠO/SỬA
import invoiceRoutes from './invoice.routes';     // CẦN TẠO/SỬA
import utilityRoutes from './utility.routes';     // CẦN TẠO/SỬA
import transferRoutes from './transfer.routes';    // CẦN TẠO/SỬA
import vehicleRoutes from './vehicle.routes';     // CẦN TẠO/SỬA
import dashboardRoutes from './dashboard.routes';  // Thêm import dashboard routes

const router = express.Router();

// Test route (Có thể giữ lại hoặc chuyển ra app.ts)
router.get('/test', (req, res) => {
  res.json({
    message: 'API base routes working', // Cập nhật message nếu muốn
    timestamp: new Date().toISOString()
  });
});

// Mount các routes với prefix tương ứng
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);         // Đổi prefix từ /residents
router.use('/amenities', amenityRoutes);       // Đổi prefix từ /facilities
router.use('/payments', paymentRoutes);
router.use('/rooms', roomRoutes);
router.use('/buildings', buildingRoutes);
router.use('/maintenances', maintenanceRoutes);
router.use('/media', mediaRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/utilities', utilityRoutes);
router.use('/transfers', transferRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/dashboard', dashboardRoutes);      // Thêm mount dashboard routes
// router.use('/users', userRoutes);

export default router;
import express from 'express';
import { UtilityController } from '../controllers/utility.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const utilityController = new UtilityController();

router.use(authMiddleware);
router.use(checkRole([Role.ADMIN, Role.STAFF]));

// GET /api/utilities - Lấy danh sách các lần ghi chỉ số (endpoint mới cho frontend)
router.get('/', utilityController.getAllReadings);

// GET /api/utilities/:id - Lấy chi tiết một lần ghi chỉ số (endpoint mới cho frontend)
router.get('/:id', utilityController.getReadingById);

// POST /api/utilities - Tạo bản ghi chỉ số mới (endpoint mới cho frontend)
router.post('/', utilityController.createReading);

// PUT /api/utilities/:id - Cập nhật bản ghi chỉ số (endpoint mới cho frontend)
router.put('/:id', utilityController.updateReading);

// DELETE /api/utilities/:id - Xóa bản ghi chỉ số (endpoint mới cho frontend)
router.delete('/:id', utilityController.deleteReading);

// Giữ lại các routes cũ với tiền tố /readings để đảm bảo tương thích ngược
// GET /api/utilities/readings - Lấy danh sách các lần ghi chỉ số
router.get('/readings', utilityController.getAllReadings);

// GET /api/utilities/readings/:id - Lấy chi tiết một lần ghi chỉ số
router.get('/readings/:id', utilityController.getReadingById);

// POST /api/utilities/readings - Tạo bản ghi chỉ số mới
router.post('/readings', utilityController.createReading);

// PUT /api/utilities/readings/:id - Cập nhật bản ghi chỉ số
router.put('/readings/:id', utilityController.updateReading);

// DELETE /api/utilities/readings/:id - Xóa bản ghi chỉ số
router.delete('/readings/:id', utilityController.deleteReading);

export default router;
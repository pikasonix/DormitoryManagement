import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
// Import checkRole và Role nếu cần cho các route khác trong tương lai
// import { checkRole } from '../middleware/auth.middleware';
// import { Role } from '@prisma/client';

const router = express.Router();

// --- Public Routes ---

// POST /api/auth/login - Đăng nhập người dùng
router.post('/login', AuthController.login);

// POST /api/auth/register - Đăng ký người dùng mới (Student)
router.post('/register', AuthController.register);

// --- Protected Routes (Yêu cầu xác thực) ---

// GET /api/auth/me - Lấy thông tin người dùng đang đăng nhập (từ token)
router.get('/me', authMiddleware, AuthController.me);

// POST /api/auth/logout - Đăng xuất (chủ yếu để client xóa token)
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
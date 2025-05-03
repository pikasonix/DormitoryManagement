import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// POST /api/auth/login - Đăng nhập người dùng
router.post('/login', AuthController.login);

// GET /api/auth/me - Lấy thông tin người dùng đang đăng nhập (từ token)
router.get('/me', authMiddleware, AuthController.me);

// POST /api/auth/logout - Đăng xuất (chủ yếu để client xóa token)
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
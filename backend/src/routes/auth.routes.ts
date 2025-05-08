import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// POST /api/auth/login - Đăng nhập người dùng
router.post('/login', AuthController.login);

// POST /api/auth/register - Đăng ký người dùng mới (Student)
router.post('/register', AuthController.register);

// GET /api/auth/me - Lấy thông tin người dùng đang đăng nhập (từ token)
router.get('/me', authMiddleware, AuthController.me);

// POST /api/auth/logout - Đăng xuất (chủ yếu để client xóa token)
router.post('/logout', authMiddleware, AuthController.logout);

// GET /api/auth/login-history/:userId? - Lấy lịch sử đăng nhập (chỉ cho ADMIN và STAFF)
router.get('/login-history/:userId?', authMiddleware, AuthController.getLoginHistory);

export default router;
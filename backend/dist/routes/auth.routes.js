"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// POST /api/auth/login - Đăng nhập người dùng
router.post('/login', auth_controller_1.AuthController.login);
// POST /api/auth/register - Đăng ký người dùng mới (Student)
router.post('/register', auth_controller_1.AuthController.register);
// GET /api/auth/me - Lấy thông tin người dùng đang đăng nhập (từ token)
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.AuthController.me);
// POST /api/auth/logout - Đăng xuất (chủ yếu để client xóa token)
router.post('/logout', auth_middleware_1.authMiddleware, auth_controller_1.AuthController.logout);
// GET /api/auth/login-history/:userId? - Lấy lịch sử đăng nhập (chỉ cho ADMIN và STAFF)
router.get('/login-history/:userId?', auth_middleware_1.authMiddleware, auth_controller_1.AuthController.getLoginHistory);
exports.default = router;

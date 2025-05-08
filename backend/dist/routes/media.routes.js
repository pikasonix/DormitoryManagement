"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const media_controller_1 = require("../controllers/media.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const mediaController = new media_controller_1.MediaController();
router.use(auth_middleware_1.authMiddleware);
// POST /api/media/upload - Endpoint chính để tải file lên
router.post('/upload', upload_middleware_1.upload.single('file'), mediaController.uploadMedia);
// GET /api/media - Lấy danh sách Media (Admin/Staff)
router.get('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), mediaController.getAllMedia);
// GET /api/media/:id - Lấy chi tiết Media
router.get('/:id', mediaController.getMediaById);
// PUT /api/media/:id - Cập nhật metadata Media (Admin/Staff)
router.put('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), mediaController.updateMedia);
// DELETE /api/media/:id - Xóa Media (Admin/Staff)
router.delete('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), mediaController.deleteMedia);
exports.default = router;

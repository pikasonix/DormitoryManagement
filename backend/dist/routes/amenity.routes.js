"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const amenity_controller_1 = require("../controllers/amenity.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const amenityController = new amenity_controller_1.AmenityController();
// GET /api/amenities - Lấy tất cả tiện nghi
router.get('/', amenityController.getAllAmenities);
// GET /api/amenities/:id - Lấy chi tiết một tiện nghi
router.get('/:id', amenityController.getAmenityById);
// POST /api/amenities - Tạo tiện nghi mới
router.post('/', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), amenityController.createAmenity);
// PUT /api/amenities/:id - Cập nhật tiện nghi
router.put('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), amenityController.updateAmenity);
// DELETE /api/amenities/:id - Xóa tiện nghi
router.delete('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), amenityController.deleteAmenity);
exports.default = router;

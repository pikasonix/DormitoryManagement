"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const resident_routes_1 = __importDefault(require("./resident.routes"));
const router = express_1.default.Router();
// Test route
router.get('/test', (req, res) => {
    res.json({
        message: 'API routes working',
        timestamp: new Date().toISOString()
    });
});
// Mount routes
router.use('/auth', auth_routes_1.default);
router.use('/residents', resident_routes_1.default);
exports.default = router;

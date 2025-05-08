"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const student_routes_1 = __importDefault(require("./student.routes"));
const amenity_routes_1 = __importDefault(require("./amenity.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const room_routes_1 = __importDefault(require("./room.routes"));
const building_routes_1 = __importDefault(require("./building.routes"));
const maintenance_routes_1 = __importDefault(require("./maintenance.routes"));
const media_routes_1 = __importDefault(require("./media.routes"));
const invoice_routes_1 = __importDefault(require("./invoice.routes"));
const utility_routes_1 = __importDefault(require("./utility.routes"));
const transfer_routes_1 = __importDefault(require("./transfer.routes"));
const vehicle_routes_1 = __importDefault(require("./vehicle.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const router = express_1.default.Router();
// Test route
router.get('/test', (req, res) => {
    res.json({
        message: 'API base routes working',
        timestamp: new Date().toISOString()
    });
});
router.use('/auth', auth_routes_1.default);
router.use('/students', student_routes_1.default);
router.use('/amenities', amenity_routes_1.default);
router.use('/payments', payment_routes_1.default);
router.use('/rooms', room_routes_1.default);
router.use('/buildings', building_routes_1.default);
router.use('/maintenances', maintenance_routes_1.default);
router.use('/media', media_routes_1.default);
router.use('/invoices', invoice_routes_1.default);
router.use('/utilities', utility_routes_1.default);
router.use('/transfers', transfer_routes_1.default);
router.use('/vehicles', vehicle_routes_1.default);
router.use('/dashboard', dashboard_routes_1.default);
exports.default = router;

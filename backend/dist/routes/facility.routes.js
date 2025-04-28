"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const facility_controller_1 = require("../controllers/facility.controller");
const router = express_1.default.Router();
const facilityController = new facility_controller_1.FacilityController();
// Debug logging
router.use((req, res, next) => {
    console.log('\n=== Facility Route ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Body:', req.body);
    console.log('===================\n');
    next();
});
// CRUD routes
router.get('/', facilityController.getAllFacilities);
router.post('/', facilityController.createFacility);
router.post('/:id/bookings', facilityController.createBooking);
router.post('/:id/maintenance', facilityController.createMaintenanceLog);
exports.default = router;

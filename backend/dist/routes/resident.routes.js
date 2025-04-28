"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const resident_controller_1 = require("../controllers/resident.controller");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = express_1.default.Router();
const residentController = new resident_controller_1.ResidentController();
// Debug logging
router.use((req, res, next) => {
    console.log('\n=== Resident Route Handler ===');
    console.log(`${req.method} ${req.path}`);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    console.log('==========================\n');
    next();
});
// GET /api/residents
router.get('/', residentController.getAllResidents);
// GET /api/residents/:id
router.get('/:id', residentController.getResident);
// POST /api/residents
router.post('/', upload_middleware_1.upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 5 }
]), residentController.createResident);
// PUT /api/residents/:id
router.put('/:id', upload_middleware_1.upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 5 }
]), residentController.updateResident);
// DELETE /api/residents/:id
router.delete('/:id', residentController.deleteResident);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const room_controller_1 = require("../controllers/room.controller");
const router = express_1.default.Router();
const roomController = new room_controller_1.RoomController();
router.get('/', roomController.getAllRooms);
exports.default = router;

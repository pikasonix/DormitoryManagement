"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoomSchema = exports.createRoomSchema = void 0;
const zod_1 = require("zod");
exports.createRoomSchema = zod_1.z.object({
    number: zod_1.z.string().min(1, 'Room number is required'),
    type: zod_1.z.enum(['SINGLE', 'DOUBLE', 'WARD']),
    capacity: zod_1.z.number().min(1),
    occupied: zod_1.z.number().default(0),
    floor: zod_1.z.number().optional(),
    description: zod_1.z.string().optional()
});
exports.updateRoomSchema = exports.createRoomSchema.partial();

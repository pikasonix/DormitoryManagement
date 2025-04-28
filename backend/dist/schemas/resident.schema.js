"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateResidentSchema = exports.createResidentSchema = void 0;
const zod_1 = require("zod");
exports.createResidentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    dateOfBirth: zod_1.z.string().optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE']),
    address: zod_1.z.string().optional(),
    phoneNumber: zod_1.z.string().optional(),
    emergencyContact: zod_1.z.string().optional(),
    medicalConditions: zod_1.z.string().optional(),
    roomId: zod_1.z.number().optional()
});
exports.updateResidentSchema = exports.createResidentSchema.partial();

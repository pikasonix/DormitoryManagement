"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
// Create wrapper functions to simulate Sequelize-like behavior if needed
const Student = {
    // Compatibility methods if needed
    findByPk: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return yield prisma_1.default.studentProfile.findUnique({
            where: { id }
        });
    }),
    findOne: (options) => __awaiter(void 0, void 0, void 0, function* () {
        const where = (options === null || options === void 0 ? void 0 : options.where) || {};
        return yield prisma_1.default.studentProfile.findFirst({
            where,
            include: options === null || options === void 0 ? void 0 : options.include
        });
    }),
    findAll: (options) => __awaiter(void 0, void 0, void 0, function* () {
        const where = (options === null || options === void 0 ? void 0 : options.where) || {};
        return yield prisma_1.default.studentProfile.findMany({
            where,
            include: options === null || options === void 0 ? void 0 : options.include
        });
    }),
    create: (data) => __awaiter(void 0, void 0, void 0, function* () {
        // Map Sequelize-style fields to Prisma fields if needed
        return yield prisma_1.default.studentProfile.create({
            data: {
                // Map required fields for StudentProfile
                fullName: data.name,
                studentId: data.student_code,
                userId: data.user_id, // Required field
                phoneNumber: data.phone,
                // Add required fields from StudentProfile schema
                gender: 'MALE', // Default value, should be updated
                birthDate: new Date(), // Default value, should be updated
                identityCardNumber: data.identity_card_number || `DEFAULT-${Date.now()}`,
                faculty: data.faculty || 'DEFAULT',
                courseYear: data.course_year || 2023,
                startDate: new Date(),
                contractEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // Default 1 year contract
            }
        });
    })
};
exports.default = Student;

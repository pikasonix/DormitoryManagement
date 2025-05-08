"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const student_controller_1 = require("../controllers/student.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const validation_middleware_1 = require("../middleware/validation.middleware");
const client_2 = require("@prisma/client");
const zod_1 = require("zod");
const router = express_1.default.Router();
const studentController = new student_controller_1.StudentController();
const staffController = new student_controller_1.StaffController();
// Schema validations: createStudentSchema, updateStudentSchema, studentIdParamSchema, userIdParamSchema, etc.
const createStudentSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string({ required_error: "Email là bắt buộc" }).email("Email không hợp lệ"),
        password: zod_1.z.string({ required_error: "Mật khẩu là bắt buộc" }).min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
        studentId: zod_1.z.string({ required_error: "Mã sinh viên là bắt buộc" }).min(1, "Mã sinh viên không được để trống"),
        fullName: zod_1.z.string({ required_error: "Họ tên là bắt buộc" }).min(1, "Họ tên không được để trống"),
        gender: zod_1.z.enum(['MALE', 'FEMALE'], { required_error: "Giới tính là bắt buộc" }),
        birthDate: zod_1.z.coerce.date({ required_error: "Ngày sinh là bắt buộc", invalid_type_error: "Ngày sinh không hợp lệ" }),
        identityCardNumber: zod_1.z.string({ required_error: "Số CCCD/CMND là bắt buộc" }).min(1, "Số CCCD/CMND không được để trống"),
        phoneNumber: zod_1.z.string({ required_error: "Số điện thoại là bắt buộc" }).min(1, "Số điện thoại không được để trống"),
        faculty: zod_1.z.string({ required_error: "Khoa/Viện là bắt buộc" }).min(1, "Khoa/Viện không được để trống"),
        courseYear: zod_1.z.coerce.number({ required_error: "Khóa học là bắt buộc", invalid_type_error: "Khóa học phải là số" }).int("Khóa học phải là số nguyên"),
        startDate: zod_1.z.coerce.date({ required_error: "Ngày bắt đầu ở là bắt buộc", invalid_type_error: "Ngày bắt đầu ở không hợp lệ" }),
        contractEndDate: zod_1.z.coerce.date({ required_error: "Ngày hết hạn hợp đồng là bắt buộc", invalid_type_error: "Ngày hết hạn hợp đồng không hợp lệ" }),
        className: zod_1.z.string().optional(),
        personalEmail: zod_1.z.string().email("Email cá nhân không hợp lệ").optional().or(zod_1.z.literal('')),
        ethnicity: zod_1.z.string().optional(),
        religion: zod_1.z.string().optional(),
        priorityObject: zod_1.z.string().optional(),
        permanentProvince: zod_1.z.string().optional(),
        permanentDistrict: zod_1.z.string().optional(),
        permanentAddress: zod_1.z.string().optional(),
        status: zod_1.z.nativeEnum(client_2.StudentStatus).optional(),
        fatherName: zod_1.z.string().optional(),
        fatherDobYear: zod_1.z.coerce.number().int().optional().nullable(),
        fatherPhone: zod_1.z.string().optional(),
        fatherAddress: zod_1.z.string().optional(),
        motherName: zod_1.z.string().optional(),
        motherDobYear: zod_1.z.coerce.number().int().optional().nullable(),
        motherPhone: zod_1.z.string().optional(),
        motherAddress: zod_1.z.string().optional(),
        emergencyContactRelation: zod_1.z.string().optional(),
        emergencyContactPhone: zod_1.z.string().optional(),
        emergencyContactAddress: zod_1.z.string().optional(),
        roomId: zod_1.z.coerce.number().int().positive("ID phòng phải là số nguyên dương").optional().nullable(),
        avatarId: zod_1.z.coerce.number().int().positive("ID avatar phải là số nguyên dương").optional().nullable(),
    }),
});
const updateStudentSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.coerce.number().int().positive("ID hồ sơ sinh viên không hợp lệ"),
    }),
    body: zod_1.z.object({
        studentId: zod_1.z.string().min(1, "Mã sinh viên không được để trống").optional(),
        fullName: zod_1.z.string().min(1, "Họ tên không được để trống").optional(),
        gender: zod_1.z.enum(['MALE', 'FEMALE']).optional(),
        birthDate: zod_1.z.coerce.date({ invalid_type_error: "Ngày sinh không hợp lệ" }).optional(),
        identityCardNumber: zod_1.z.string().min(1, "Số CCCD/CMND không được để trống").optional(),
        phoneNumber: zod_1.z.string().min(1, "Số điện thoại không được để trống").optional(),
        faculty: zod_1.z.string().min(1, "Khoa/Viện không được để trống").optional(),
        courseYear: zod_1.z.coerce.number({ invalid_type_error: "Khóa học phải là số" }).int().optional(),
        startDate: zod_1.z.coerce.date({ invalid_type_error: "Ngày bắt đầu ở không hợp lệ" }).optional(),
        contractEndDate: zod_1.z.coerce.date({ invalid_type_error: "Ngày hết hạn hợp đồng không hợp lệ" }).optional(),
        className: zod_1.z.string().optional(),
        personalEmail: zod_1.z.string().email("Email cá nhân không hợp lệ").optional().or(zod_1.z.literal('')),
        ethnicity: zod_1.z.string().optional().nullable(),
        religion: zod_1.z.string().optional().nullable(),
        priorityObject: zod_1.z.string().optional().nullable(),
        permanentProvince: zod_1.z.string().optional().nullable(),
        permanentDistrict: zod_1.z.string().optional().nullable(),
        permanentAddress: zod_1.z.string().optional().nullable(),
        status: zod_1.z.nativeEnum(client_2.StudentStatus).optional(),
        checkInDate: zod_1.z.coerce.date({ invalid_type_error: "Ngày check-in không hợp lệ" }).optional().nullable(),
        checkOutDate: zod_1.z.coerce.date({ invalid_type_error: "Ngày check-out không hợp lệ" }).optional().nullable(),
        fatherName: zod_1.z.string().optional().nullable(),
        fatherDobYear: zod_1.z.coerce.number().int().optional().nullable(),
        fatherPhone: zod_1.z.string().optional().nullable(),
        fatherAddress: zod_1.z.string().optional().nullable(),
        motherName: zod_1.z.string().optional().nullable(),
        motherDobYear: zod_1.z.coerce.number().int().optional().nullable(),
        motherPhone: zod_1.z.string().optional().nullable(),
        motherAddress: zod_1.z.string().optional().nullable(),
        emergencyContactRelation: zod_1.z.string().optional().nullable(),
        emergencyContactPhone: zod_1.z.string().optional().nullable(),
        emergencyContactAddress: zod_1.z.string().optional().nullable(),
        roomId: zod_1.z.coerce.number().int().positive("ID phòng phải là số nguyên dương").optional().nullable(),
        avatarId: zod_1.z.coerce.number().int().positive("ID avatar phải là số nguyên dương").optional().nullable(),
    }).partial().refine(data => Object.keys(data).length > 0, {
        message: "Cần ít nhất một trường để cập nhật."
    }),
});
const studentIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.coerce.number().int().positive("ID hồ sơ sinh viên không hợp lệ"),
    }),
});
const userIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.coerce.number().int().positive("User ID không hợp lệ"),
    }),
});
const profileIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        profileId: zod_1.z.coerce.number().int().positive("Profile ID không hợp lệ"),
    }),
});
const updateStaffSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.coerce.number().int().positive("ID hồ sơ nhân viên không hợp lệ"),
    }),
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(1, "Họ tên không được để trống").optional(),
        gender: zod_1.z.enum(['MALE', 'FEMALE']).optional(),
        birthDate: zod_1.z.coerce.date({ invalid_type_error: "Ngày sinh không hợp lệ" }).optional(),
        identityCardNumber: zod_1.z.string().min(1, "Số CCCD/CMND không được để trống").optional(),
        phoneNumber: zod_1.z.string().min(1, "Số điện thoại không được để trống").optional(),
        position: zod_1.z.string().optional().nullable(),
        address: zod_1.z.string().optional().nullable(),
        managedBuildingId: zod_1.z.coerce.number().int().positive("ID tòa nhà phải là số nguyên dương").optional().nullable(),
        avatarId: zod_1.z.coerce.number().int().positive("ID avatar phải là số nguyên dương").optional().nullable(),
    }).partial().refine(data => Object.keys(data).length > 0, {
        message: "Cần ít nhất một trường để cập nhật."
    }),
});
const staffIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.coerce.number().int().positive("ID hồ sơ nhân viên không hợp lệ"),
    }),
});
router.use(auth_middleware_1.authMiddleware);
router.get('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), studentController.getAllStudents);
router.get('/by-user/:userId', (0, validation_middleware_1.validate)(userIdParamSchema), studentController.getStudentByUserId);
router.get('/by-profile/:profileId', (0, validation_middleware_1.validate)(profileIdParamSchema), studentController.getStudentByProfileId);
router.get('/:id', (0, validation_middleware_1.validate)(studentIdParamSchema), studentController.getStudentById);
router.post('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), (0, validation_middleware_1.validate)(createStudentSchema), studentController.createStudent);
router.put('/:id', (0, validation_middleware_1.validate)(updateStudentSchema), studentController.updateStudent);
router.delete('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN]), (0, validation_middleware_1.validate)(studentIdParamSchema), studentController.deleteStudent);
router.get('/staff', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN]), staffController.getAllStaff);
router.get('/staff/:id', (0, validation_middleware_1.validate)(staffIdParamSchema), staffController.getStaffById);
router.put('/staff/:id', (0, validation_middleware_1.validate)(updateStaffSchema), staffController.updateStaff);
exports.default = router;

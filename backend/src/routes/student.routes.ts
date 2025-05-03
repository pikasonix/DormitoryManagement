import express from 'express';
import { StudentController, StaffController } from '../controllers/student.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { validate } from '../middleware/validation.middleware';
import { StudentStatus } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const studentController = new StudentController();
const staffController = new StaffController();

// Schema validations: createStudentSchema, updateStudentSchema, studentIdParamSchema, userIdParamSchema, etc.

const createStudentSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email là bắt buộc" }).email("Email không hợp lệ"),
    password: z.string({ required_error: "Mật khẩu là bắt buộc" }).min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    studentId: z.string({ required_error: "Mã sinh viên là bắt buộc" }).min(1, "Mã sinh viên không được để trống"),
    fullName: z.string({ required_error: "Họ tên là bắt buộc" }).min(1, "Họ tên không được để trống"),
    gender: z.enum(['MALE', 'FEMALE'], { required_error: "Giới tính là bắt buộc" }),
    birthDate: z.coerce.date({ required_error: "Ngày sinh là bắt buộc", invalid_type_error: "Ngày sinh không hợp lệ" }),
    identityCardNumber: z.string({ required_error: "Số CCCD/CMND là bắt buộc" }).min(1, "Số CCCD/CMND không được để trống"),
    phoneNumber: z.string({ required_error: "Số điện thoại là bắt buộc" }).min(1, "Số điện thoại không được để trống"),
    faculty: z.string({ required_error: "Khoa/Viện là bắt buộc" }).min(1, "Khoa/Viện không được để trống"),
    courseYear: z.coerce.number({ required_error: "Khóa học là bắt buộc", invalid_type_error: "Khóa học phải là số" }).int("Khóa học phải là số nguyên"),
    startDate: z.coerce.date({ required_error: "Ngày bắt đầu ở là bắt buộc", invalid_type_error: "Ngày bắt đầu ở không hợp lệ" }),
    contractEndDate: z.coerce.date({ required_error: "Ngày hết hạn hợp đồng là bắt buộc", invalid_type_error: "Ngày hết hạn hợp đồng không hợp lệ" }),
    className: z.string().optional(),
    personalEmail: z.string().email("Email cá nhân không hợp lệ").optional().or(z.literal('')),
    ethnicity: z.string().optional(),
    religion: z.string().optional(),
    priorityObject: z.string().optional(),
    permanentProvince: z.string().optional(),
    permanentDistrict: z.string().optional(),
    permanentAddress: z.string().optional(),
    status: z.nativeEnum(StudentStatus).optional(),
    fatherName: z.string().optional(),
    fatherDobYear: z.coerce.number().int().optional().nullable(),
    fatherPhone: z.string().optional(),
    fatherAddress: z.string().optional(),
    motherName: z.string().optional(),
    motherDobYear: z.coerce.number().int().optional().nullable(),
    motherPhone: z.string().optional(),
    motherAddress: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactAddress: z.string().optional(),
    roomId: z.coerce.number().int().positive("ID phòng phải là số nguyên dương").optional().nullable(),
    avatarId: z.coerce.number().int().positive("ID avatar phải là số nguyên dương").optional().nullable(),
  }),
});

const updateStudentSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ sinh viên không hợp lệ"),
  }),
  body: z.object({
    studentId: z.string().min(1, "Mã sinh viên không được để trống").optional(),
    fullName: z.string().min(1, "Họ tên không được để trống").optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    birthDate: z.coerce.date({ invalid_type_error: "Ngày sinh không hợp lệ" }).optional(),
    identityCardNumber: z.string().min(1, "Số CCCD/CMND không được để trống").optional(),
    phoneNumber: z.string().min(1, "Số điện thoại không được để trống").optional(),
    faculty: z.string().min(1, "Khoa/Viện không được để trống").optional(),
    courseYear: z.coerce.number({ invalid_type_error: "Khóa học phải là số" }).int().optional(),
    startDate: z.coerce.date({ invalid_type_error: "Ngày bắt đầu ở không hợp lệ" }).optional(),
    contractEndDate: z.coerce.date({ invalid_type_error: "Ngày hết hạn hợp đồng không hợp lệ" }).optional(),
    className: z.string().optional(),
    personalEmail: z.string().email("Email cá nhân không hợp lệ").optional().or(z.literal('')),
    ethnicity: z.string().optional().nullable(),
    religion: z.string().optional().nullable(),
    priorityObject: z.string().optional().nullable(),
    permanentProvince: z.string().optional().nullable(),
    permanentDistrict: z.string().optional().nullable(),
    permanentAddress: z.string().optional().nullable(),
    status: z.nativeEnum(StudentStatus).optional(),
    checkInDate: z.coerce.date({ invalid_type_error: "Ngày check-in không hợp lệ" }).optional().nullable(),
    checkOutDate: z.coerce.date({ invalid_type_error: "Ngày check-out không hợp lệ" }).optional().nullable(),
    fatherName: z.string().optional().nullable(),
    fatherDobYear: z.coerce.number().int().optional().nullable(),
    fatherPhone: z.string().optional().nullable(),
    fatherAddress: z.string().optional().nullable(),
    motherName: z.string().optional().nullable(),
    motherDobYear: z.coerce.number().int().optional().nullable(),
    motherPhone: z.string().optional().nullable(),
    motherAddress: z.string().optional().nullable(),
    emergencyContactRelation: z.string().optional().nullable(),
    emergencyContactPhone: z.string().optional().nullable(),
    emergencyContactAddress: z.string().optional().nullable(),
    roomId: z.coerce.number().int().positive("ID phòng phải là số nguyên dương").optional().nullable(),
    avatarId: z.coerce.number().int().positive("ID avatar phải là số nguyên dương").optional().nullable(),
  }).partial().refine(data => Object.keys(data).length > 0, {
    message: "Cần ít nhất một trường để cập nhật."
  }),
});

const studentIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ sinh viên không hợp lệ"),
  }),
});

const userIdParamSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int().positive("User ID không hợp lệ"),
  }),
});

const profileIdParamSchema = z.object({
  params: z.object({
    profileId: z.coerce.number().int().positive("Profile ID không hợp lệ"),
  }),
});

const updateStaffSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ nhân viên không hợp lệ"),
  }),
  body: z.object({
    fullName: z.string().min(1, "Họ tên không được để trống").optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    birthDate: z.coerce.date({ invalid_type_error: "Ngày sinh không hợp lệ" }).optional(),
    identityCardNumber: z.string().min(1, "Số CCCD/CMND không được để trống").optional(),
    phoneNumber: z.string().min(1, "Số điện thoại không được để trống").optional(),
    position: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    managedBuildingId: z.coerce.number().int().positive("ID tòa nhà phải là số nguyên dương").optional().nullable(),
    avatarId: z.coerce.number().int().positive("ID avatar phải là số nguyên dương").optional().nullable(),
  }).partial().refine(data => Object.keys(data).length > 0, {
    message: "Cần ít nhất một trường để cập nhật."
  }),
});

const staffIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ nhân viên không hợp lệ"),
  }),
});

router.use(authMiddleware);

router.get(
  '/',
  checkRole([Role.ADMIN, Role.STAFF]),
  studentController.getAllStudents
);

router.get(
  '/by-user/:userId',
  validate(userIdParamSchema),
  studentController.getStudentByUserId
);

router.get(
  '/by-profile/:profileId',
  validate(profileIdParamSchema),
  studentController.getStudentByProfileId
);

router.get(
  '/:id',
  validate(studentIdParamSchema),
  studentController.getStudentById
);

router.post(
  '/',
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(createStudentSchema),
  studentController.createStudent
);

router.put(
  '/:id',
  validate(updateStudentSchema),
  studentController.updateStudent
);

router.delete(
  '/:id',
  checkRole([Role.ADMIN]),
  validate(studentIdParamSchema),
  studentController.deleteStudent
);

router.get(
  '/staff',
  checkRole([Role.ADMIN]),
  staffController.getAllStaff
);

router.get(
  '/staff/:id',
  validate(staffIdParamSchema),
  staffController.getStaffById
);

router.put(
  '/staff/:id',
  validate(updateStaffSchema),
  staffController.updateStaff
);

export default router;
import express from 'express';
import { StudentController, StaffController } from '../controllers/student.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { validate } from '../middleware/validation.middleware'; // Import middleware validate
import { StudentStatus } from '@prisma/client'; // Import StudentStatus enum from Prisma
import { z } from 'zod'; // Import Zod để định nghĩa schema

const router = express.Router();
const studentController = new StudentController();
const staffController = new StaffController(); // Initialize StaffController

// --- Schemas Validation (Sử dụng Zod) ---

// Schema cho việc tạo Student (POST /) - Cần nhiều trường bắt buộc
const createStudentSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email là bắt buộc" }).email("Email không hợp lệ"),
    password: z.string({ required_error: "Mật khẩu là bắt buộc" }).min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    studentId: z.string({ required_error: "Mã sinh viên là bắt buộc" }).min(1, "Mã sinh viên không được để trống"),
    fullName: z.string({ required_error: "Họ tên là bắt buộc" }).min(1, "Họ tên không được để trống"),
    gender: z.enum(['MALE', 'FEMALE'], { required_error: "Giới tính là bắt buộc" }), // Enum Gender
    birthDate: z.coerce.date({ required_error: "Ngày sinh là bắt buộc", invalid_type_error: "Ngày sinh không hợp lệ" }), // Chuyển string sang Date
    identityCardNumber: z.string({ required_error: "Số CCCD/CMND là bắt buộc" }).min(1, "Số CCCD/CMND không được để trống"),
    phoneNumber: z.string({ required_error: "Số điện thoại là bắt buộc" }).min(1, "Số điện thoại không được để trống"),
    faculty: z.string({ required_error: "Khoa/Viện là bắt buộc" }).min(1, "Khoa/Viện không được để trống"),
    courseYear: z.coerce.number({ required_error: "Khóa học là bắt buộc", invalid_type_error: "Khóa học phải là số" }).int("Khóa học phải là số nguyên"),
    startDate: z.coerce.date({ required_error: "Ngày bắt đầu ở là bắt buộc", invalid_type_error: "Ngày bắt đầu ở không hợp lệ" }),
    contractEndDate: z.coerce.date({ required_error: "Ngày hết hạn hợp đồng là bắt buộc", invalid_type_error: "Ngày hết hạn hợp đồng không hợp lệ" }),
    // Các trường tùy chọn
    className: z.string().optional(),
    personalEmail: z.string().email("Email cá nhân không hợp lệ").optional().or(z.literal('')), // Cho phép rỗng hoặc email
    ethnicity: z.string().optional(),
    religion: z.string().optional(),
    priorityObject: z.string().optional(),
    permanentProvince: z.string().optional(),
    permanentDistrict: z.string().optional(),
    permanentAddress: z.string().optional(),
    status: z.nativeEnum(StudentStatus).optional(), // Enum StudentStatus
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

// Schema cho việc cập nhật Student (PUT /:id) - Hầu hết là tùy chọn
const updateStudentSchema = z.object({
  // Validate params.id
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ sinh viên không hợp lệ"),
  }),
  // Validate body (các trường có thể cập nhật)
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
    ethnicity: z.string().optional().nullable(), // Cho phép set null
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
    roomId: z.coerce.number().int().positive("ID phòng phải là số nguyên dương").optional().nullable(), // Cho phép set null để bỏ phòng
    avatarId: z.coerce.number().int().positive("ID avatar phải là số nguyên dương").optional().nullable(), // Cho phép set null để xóa avatar
  }).partial().refine(data => Object.keys(data).length > 0, { // Đảm bảo body không rỗng
    message: "Cần ít nhất một trường để cập nhật."
  }),
});

// Schema cho việc lấy chi tiết hoặc xóa (chỉ cần validate ID)
const studentIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ sinh viên không hợp lệ"),
  }),
});

// Schema cho việc lấy chi tiết sinh viên bằng User ID
const userIdParamSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int().positive("User ID không hợp lệ"),
  }),
});

// Schema cho việc lấy chi tiết sinh viên bằng Profile ID
const profileIdParamSchema = z.object({
  params: z.object({
    profileId: z.coerce.number().int().positive("Profile ID không hợp lệ"),
  }),
});

// Schema for staff update (PUT /staff/:id)
const updateStaffSchema = z.object({
  // Validate params.id
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ nhân viên không hợp lệ"),
  }),
  // Validate body (các trường có thể cập nhật)
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

// Schema for staff ID parameter validation
const staffIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("ID hồ sơ nhân viên không hợp lệ"),
  }),
});

// --- Áp dụng Middleware và Routes ---
// Yêu cầu đăng nhập cho hầu hết các route
router.use(authMiddleware);

// STUDENT ROUTES
// GET /api/students - Lấy danh sách tất cả sinh viên (Yêu cầu Staff hoặc Admin)
router.get(
  '/',
  checkRole([Role.ADMIN, Role.STAFF]),
  studentController.getAllStudents
);

// GET /api/students/by-user/:userId - Lấy chi tiết sinh viên theo User ID (phải đặt trước /:id)
router.get(
  '/by-user/:userId',
  validate(userIdParamSchema),
  studentController.getStudentByUserId
);

// GET /api/students/by-profile/:profileId - Lấy chi tiết sinh viên theo Profile ID
router.get(
  '/by-profile/:profileId',
  validate(profileIdParamSchema),
  studentController.getStudentByProfileId
);

// GET /api/students/:id - Lấy chi tiết một sinh viên (Yêu cầu đăng nhập, controller/service kiểm tra quyền cụ thể)
router.get(
  '/:id',
  validate(studentIdParamSchema), // Validate ID từ params
  // authMiddleware đã áp dụng
  studentController.getStudentById
);

// POST /api/students - Tạo sinh viên mới (Yêu cầu Admin hoặc Staff)
router.post(
  '/',
  checkRole([Role.ADMIN, Role.STAFF]), // Both Admin and Staff can create new students
  validate(createStudentSchema), // Validate dữ liệu body
  studentController.createStudent
);

// PUT /api/students/:id - Cập nhật thông tin sinh viên (Yêu cầu đăng nhập, controller/service kiểm tra quyền)
router.put(
  '/:id',
  // authMiddleware đã áp dụng
  validate(updateStudentSchema), // Validate params.id và body
  studentController.updateStudent
);

// DELETE /api/students/:id - Xóa sinh viên (Yêu cầu Admin)
router.delete(
  '/:id',
  checkRole([Role.ADMIN]), // Chỉ Admin được xóa
  validate(studentIdParamSchema), // Validate ID từ params
  studentController.deleteStudent
);

// STAFF ROUTES - Adding these routes within the same file to avoid binary file issues
// GET /api/students/staff - Lấy danh sách tất cả nhân viên (Yêu cầu Admin)
router.get(
  '/staff',
  checkRole([Role.ADMIN]),
  staffController.getAllStaff
);

// GET /api/students/staff/:id - Lấy chi tiết một nhân viên
router.get(
  '/staff/:id',
  validate(staffIdParamSchema),
  staffController.getStaffById
);

// PUT /api/students/staff/:id - Cập nhật thông tin nhân viên
router.put(
  '/staff/:id',
  validate(updateStaffSchema),
  staffController.updateStaff
);

export default router;
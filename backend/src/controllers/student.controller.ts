import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, StudentStatus, Role, Gender } from '@prisma/client'; // Import necessary types/enums
import bcrypt from 'bcryptjs'; // Needed for createStudent password hashing
import { deleteFile } from '../services/file.service'; // Assuming you move deleteFile logic here

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

// Đổi tên class
export class StudentController {

  // Lấy danh sách tất cả sinh viên
  async getAllStudents(req: Request, res: Response, next: NextFunction) {
    try {
      // Pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      // Allow fetching all by omitting limit or setting it <= 0
      const limitQuery = req.query.limit as string;
      const limit = limitQuery ? parseInt(limitQuery) : 0; // Default to 0 (no limit) if not provided
      const applyPagination = limit > 0;
      const offset = applyPagination ? (page - 1) * limit : 0;

      // Search keyword
      const keyword = req.query.keyword as string;

      // Build where condition for search
      const whereCondition: any = {};
      if (keyword) {
        whereCondition.OR = [
          { fullName: { contains: keyword, mode: 'insensitive' } },
          { studentId: { contains: keyword, mode: 'insensitive' } },
          { user: { email: { contains: keyword, mode: 'insensitive' } } },
          { phoneNumber: { contains: keyword, mode: 'insensitive' } }
        ];
      }

      // Count total records matching the search criteria
      const totalStudents = await prisma.studentProfile.count({
        where: whereCondition
      });

      // Get students with or without pagination
      const students = await prisma.studentProfile.findMany({
        where: whereCondition,
        include: {
          user: { // Bao gồm thông tin User liên quan
            select: {
              email: true,
              isActive: true,
              avatar: true // Lấy thông tin avatar
            }
          },
          room: { // Bao gồm thông tin phòng và tòa nhà
            include: {
              building: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: {
          fullName: 'asc'
        },
        // Apply pagination only if limit is positive
        ...(applyPagination && { skip: offset }),
        ...(applyPagination && { take: limit })
      });

      // Calculate pagination metadata only if pagination is applied
      const meta = applyPagination ? {
        total: totalStudents,
        currentPage: page,
        totalPages: Math.ceil(totalStudents / limit),
        limit
      } : {
        total: totalStudents,
        currentPage: 1,
        totalPages: 1, // Only one page when fetching all
        limit: totalStudents // Limit is the total count
      };

      res.status(200).json({
        status: 'success',
        results: students.length,
        data: students,
        meta
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách sinh viên:', error);
      next(error);
    }
  }

  // Lấy thông tin chi tiết sinh viên bằng User ID
  async getStudentById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return next(new Error('User ID không hợp lệ'));
      }

      // Tìm sinh viên qua userId (là trường userId trong bảng student_profiles)
      const student = await prisma.studentProfile.findFirst({
        where: { userId: userId },
        include: {
          user: { // User info + avatar
            select: { id: true, email: true, isActive: true, avatar: true }
          },
          room: { // Room + building info
            include: {
              building: true,
              amenities: { include: { amenity: true } } // Tiện nghi phòng nếu cần
            }
          },
          // Include các thông tin liên quan khác cho trang chi tiết
          invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
          payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
          reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
          vehicleRegistrations: { include: { images: true } },
          roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 }
        }
      });

      if (!student) {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${userId}`));
      }

      res.status(200).json({
        status: 'success',
        data: student
      });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết sinh viên:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${req.params.id}`));
      }
      next(error);
    }
  }

  // Lấy thông tin chi tiết sinh viên bằng User ID
  async getStudentByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return next(new Error('User ID không hợp lệ'));
      }

      // Tìm sinh viên qua userId (là trường userId trong bảng student_profiles)
      const student = await prisma.studentProfile.findFirst({
        where: { userId: userId },
        include: {
          user: { // User info + avatar
            select: { id: true, email: true, isActive: true, avatar: true }
          },
          room: { // Room + building info
            include: {
              building: true,
              amenities: { include: { amenity: true } } // Tiện nghi phòng nếu cần
            }
          },
          // Include các thông tin liên quan khác cho trang chi tiết
          invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
          payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
          reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
          vehicleRegistrations: { include: { images: true } },
          roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 }
        }
      });

      if (!student) {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${userId}`));
      }

      res.status(200).json({
        status: 'success',
        data: student
      });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết sinh viên từ User ID:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${req.params.userId}`));
      }
      next(error);
    }
  }

  // Lấy thông tin chi tiết sinh viên bằng Profile ID (ID của hồ sơ)
  async getStudentByProfileId(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = parseInt(req.params.profileId);
      if (isNaN(profileId)) {
        return next(new Error('Profile ID không hợp lệ'));
      }

      // Tìm sinh viên theo Profile ID (id trong bảng student_profiles)
      const student = await prisma.studentProfile.findUnique({
        where: { id: profileId },
        include: {
          user: { // User info + avatar
            select: { id: true, email: true, isActive: true, avatar: true }
          },
          room: { // Room + building info
            include: {
              building: true,
              amenities: { include: { amenity: true } } // Tiện nghi phòng nếu cần
            }
          },
          // Include các thông tin liên quan khác cho trang chi tiết
          invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
          payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
          reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
          vehicleRegistrations: { include: { images: true } },
          roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 }
        }
      });

      if (!student) {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với Profile ID ${profileId}`));
      }

      res.status(200).json({
        status: 'success',
        data: student
      });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết sinh viên theo Profile ID:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với Profile ID ${req.params.profileId}`));
      }
      next(error);
    }
  }

  // Tạo sinh viên mới (User + StudentProfile)
  async createStudent(req: Request, res: Response, next: NextFunction) {
    try {
      // Dữ liệu cần thiết: email, password (cho User), và các trường của StudentProfile
      const {
        email, password, // User fields
        // StudentProfile fields (map từ request body)
        studentId, fullName, gender, birthDate, identityCardNumber,
        phoneNumber, faculty, courseYear, className, permanentProvince,
        permanentDistrict, permanentAddress, status, startDate, contractEndDate,
        // Optional fields
        personalEmail, ethnicity, religion, priorityObject,
        fatherName, fatherDobYear, fatherPhone, fatherAddress,
        motherName, motherDobYear, motherPhone, motherAddress,
        emergencyContactRelation, emergencyContactPhone, emergencyContactAddress,
        roomId, // ID phòng ban đầu (có thể null)
        avatarId // ID của avatar đã upload trước đó (optional)
      } = req.body;

      // --- Validation cơ bản ---
      if (!email || !password || !studentId || !fullName || !gender || !birthDate || !identityCardNumber || !phoneNumber || !faculty || !courseYear || !startDate || !contractEndDate) {
        return next(new Error('Thiếu các trường thông tin bắt buộc để tạo sinh viên'));
      }
      // Validate status enum
      if (status && !Object.values(StudentStatus).includes(status as StudentStatus)) {
        return next(new Error(`Trạng thái sinh viên không hợp lệ: ${status}`));
      }
      // --- Kết thúc Validation ---


      // Hash password cho User mới
      const hashedPassword = await bcrypt.hash(password, 10);

      // *** SỬ DỤNG TRANSACTION ***
      const newUserAndProfile = await prisma.$transaction(async (tx) => {
        // 1. Tạo User trước
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: Role.STUDENT, // Mặc định role là STUDENT
            isActive: true, // Mặc định là active
            // Kết nối avatar nếu avatarId được cung cấp
            avatar: avatarId ? { connect: { id: parseInt(avatarId) } } : undefined
          }
        });

        // 2. Tạo StudentProfile liên kết với User vừa tạo
        const newProfile = await tx.studentProfile.create({
          data: {
            user: { connect: { id: newUser.id } }, // Liên kết với User
            studentId,
            fullName,
            gender,
            birthDate: new Date(birthDate),
            identityCardNumber,
            phoneNumber,
            faculty,
            courseYear: parseInt(courseYear),
            startDate: new Date(startDate),
            contractEndDate: new Date(contractEndDate),
            status: (status as StudentStatus) || StudentStatus.PENDING_APPROVAL, // Trạng thái mặc định
            // Các trường tùy chọn
            className: className || null,
            personalEmail: personalEmail || null,
            ethnicity: ethnicity || null,
            religion: religion || null,
            priorityObject: priorityObject || null,
            permanentProvince: permanentProvince || null,
            permanentDistrict: permanentDistrict || null,
            permanentAddress: permanentAddress || null,
            fatherName: fatherName || null,
            fatherDobYear: fatherDobYear ? parseInt(fatherDobYear) : null,
            fatherPhone: fatherPhone || null,
            fatherAddress: fatherAddress || null,
            motherName: motherName || null,
            motherDobYear: motherDobYear ? parseInt(motherDobYear) : null,
            motherPhone: motherPhone || null,
            motherAddress: motherAddress || null,
            emergencyContactRelation: emergencyContactRelation || null,
            emergencyContactPhone: emergencyContactPhone || null,
            emergencyContactAddress: emergencyContactAddress || null,
            // Kết nối phòng nếu roomId được cung cấp
            room: roomId ? { connect: { id: parseInt(roomId) } } : undefined
          }
        });

        // Trả về cả user và profile nếu cần, hoặc chỉ profile
        return { user: newUser, profile: newProfile };
      });
      // *** KẾT THÚC TRANSACTION ***

      // Lấy lại thông tin đầy đủ để trả về (bao gồm cả avatar đã connect)
      const createdStudent = await prisma.studentProfile.findUnique({
        where: { id: newUserAndProfile.profile.id },
        include: {
          user: { select: { id: true, email: true, isActive: true, avatar: true } },
          room: { include: { building: true } }
        }
      });

      res.status(201).json({
        status: 'success',
        message: 'Sinh viên đã được tạo thành công',
        data: createdStudent
      });

    } catch (error: any) {
      console.error('Lỗi khi tạo sinh viên:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Lỗi unique constraint (vd: email, studentId, identityCardNumber đã tồn tại)
          const fields = (error.meta?.target as string[])?.join(', ');
          return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`)); // Hoặc AppError 409
        }
      }
      next(error); // Chuyển lỗi khác
    }
  }

  // Cập nhật thông tin sinh viên (Profile ID)
  // Lưu ý: Cập nhật email/password nên có endpoint riêng hoặc cần xác thực lại
  async updateStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return next(new Error('ID hồ sơ sinh viên không hợp lệ'));
      }
      // Dữ liệu cập nhật từ body
      const { avatarId, roomId, ...profileData } = req.body;

      // Tìm profile và user liên quan để kiểm tra tồn tại và lấy userId, avatar cũ
      const currentProfile = await prisma.studentProfile.findUnique({
        where: { id: profileId },
        include: { user: { select: { id: true, avatarId: true } } }
      });

      if (!currentProfile || !currentProfile.user) {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với ID ${profileId}`)); // Hoặc AppError 404
      }

      // Kiểm tra trùng lặp studentId nếu có thay đổi
      if (profileData.studentId && profileData.studentId !== currentProfile.studentId) {
        const existingStudentWithId = await prisma.studentProfile.findUnique({
          where: { studentId: profileData.studentId }
        });

        if (existingStudentWithId) {
          return next(new Error(`Mã sinh viên ${profileData.studentId} đã được sử dụng bởi sinh viên khác.`));
        }
      }

      const userId = currentProfile.user.id;
      const currentAvatarId = currentProfile.user.avatarId;

      let oldAvatarPath: string | null = null; // Để lưu path avatar cũ cần xóa file

      // *** SỬ DỤNG TRANSACTION (Đặc biệt quan trọng nếu cập nhật avatar) ***
      const updatedProfile = await prisma.$transaction(async (tx) => {

        // --- Xử lý cập nhật Avatar ---
        if (avatarId !== undefined) { // Chỉ xử lý nếu avatarId được gửi lên
          const newAvatarId = avatarId ? parseInt(avatarId) : null; // Cho phép xóa avatar

          if (currentAvatarId !== newAvatarId) {
            // 1. Cập nhật user's avatarId
            await tx.user.update({
              where: { id: userId },
              data: { avatarId: newAvatarId },
            });

            // 2. Nếu có avatar cũ và khác avatar mới, lấy path và xóa Media record cũ
            if (currentAvatarId && currentAvatarId !== newAvatarId) {
              const oldAvatar = await tx.media.findUnique({ where: { id: currentAvatarId } });
              if (oldAvatar) {
                oldAvatarPath = oldAvatar.path;
                await tx.media.delete({ where: { id: currentAvatarId } });
              }
            }
          }
        }
        // --- Kết thúc xử lý Avatar ---


        // --- Chuẩn bị dữ liệu cập nhật cho StudentProfile ---
        const studentUpdateData: Prisma.StudentProfileUpdateInput = {
          // Map các trường từ profileData
          studentId: profileData.studentId,
          fullName: profileData.fullName,
          gender: profileData.gender,
          birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
          identityCardNumber: profileData.identityCardNumber,
          phoneNumber: profileData.phoneNumber,
          faculty: profileData.faculty,
          courseYear: profileData.courseYear ? parseInt(profileData.courseYear) : undefined,
          className: profileData.className,
          permanentProvince: profileData.permanentProvince,
          permanentDistrict: profileData.permanentDistrict,
          permanentAddress: profileData.permanentAddress,
          status: profileData.status as StudentStatus, // Cần validate enum ở middleware hoặc controller
          startDate: profileData.startDate ? new Date(profileData.startDate) : undefined,
          contractEndDate: profileData.contractEndDate ? new Date(profileData.contractEndDate) : undefined,
          checkInDate: profileData.checkInDate !== undefined ? (profileData.checkInDate ? new Date(profileData.checkInDate) : null) : undefined,
          checkOutDate: profileData.checkOutDate !== undefined ? (profileData.checkOutDate ? new Date(profileData.checkOutDate) : null) : undefined,
          // Optional fields
          personalEmail: profileData.personalEmail, ethnicity: profileData.ethnicity, religion: profileData.religion, priorityObject: profileData.priorityObject,
          fatherName: profileData.fatherName, fatherDobYear: profileData.fatherDobYear ? parseInt(profileData.fatherDobYear) : null, fatherPhone: profileData.fatherPhone, fatherAddress: profileData.fatherAddress,
          motherName: profileData.motherName, motherDobYear: profileData.motherDobYear ? parseInt(profileData.motherDobYear) : null, motherPhone: profileData.motherPhone, motherAddress: profileData.motherAddress,
          emergencyContactRelation: profileData.emergencyContactRelation, emergencyContactPhone: profileData.emergencyContactPhone, emergencyContactAddress: profileData.emergencyContactAddress,

          // Xử lý cập nhật phòng
          room: roomId !== undefined // Chỉ xử lý nếu roomId được gửi lên
            ? (roomId ? { connect: { id: parseInt(roomId) } } : { disconnect: true }) // Connect nếu có id, disconnect nếu là null/rỗng
            : undefined // Không làm gì nếu không gửi roomId
        };
        // --- Kết thúc chuẩn bị dữ liệu ---


        // 3. Cập nhật StudentProfile
        const profileAfterUpdate = await tx.studentProfile.update({
          where: { id: profileId },
          data: studentUpdateData,
          include: { // Include để trả về response
            user: { select: { id: true, email: true, isActive: true, avatar: true } },
            room: { include: { building: true } }
          }
        });

        return profileAfterUpdate; // Trả về profile đã cập nhật từ transaction
      });
      // *** KẾT THÚC TRANSACTION ***

      // Xóa file vật lý của avatar cũ (nếu có) SAU KHI transaction thành công
      if (oldAvatarPath && typeof deleteFile === 'function') {
        deleteFile(oldAvatarPath);
      } else if (oldAvatarPath) {
        console.warn(`deleteFile function not available, cannot delete old avatar: ${oldAvatarPath}`);
      }


      res.status(200).json({
        status: 'success',
        message: 'Thông tin sinh viên đã được cập nhật',
        data: updatedProfile
      });

    } catch (error: any) {
      console.error('Lỗi khi cập nhật sinh viên:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const fields = (error.meta?.target as string[])?.join(', ');
          return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`)); // Hoặc AppError 409
        } else if (error.code === 'P2025') {
          // Lỗi P2025: Bản ghi cần update/connect không tìm thấy
          return next(new Error(`Không tìm thấy hồ sơ sinh viên hoặc tài nguyên liên quan (ID: ${req.params.id})`)); // Hoặc AppError 404
        }
      }
      next(error);
    }
  }

  // Xóa sinh viên (Profile ID) - Xóa User sẽ cascade xóa Profile (nếu schema đúng)
  async deleteStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return next(new Error('ID hồ sơ sinh viên không hợp lệ'));
      }

      // *** SỬ DỤNG TRANSACTION ***
      const deletedData = await prisma.$transaction(async (tx) => {
        // 1. Tìm profile để lấy userId và các media liên quan cần xóa
        const studentProfile = await tx.studentProfile.findUnique({
          where: { id: profileId },
          include: {
            user: { select: { id: true, avatarId: true, avatar: { select: { path: true } } } },
            // Lấy ID và path của các media liên quan khác
            vehicleRegistrations: { select: { images: { select: { id: true, path: true } } } },
            reportedMaintenances: { select: { images: { select: { id: true, path: true } } } },
            // Lấy các ID khác cần xóa trước (nếu không có cascade)
            payments: { select: { id: true } },
            invoices: { select: { id: true } }, // Chỉ invoice cá nhân
            roomTransfers: { select: { id: true } },
          }
        });

        if (!studentProfile || !studentProfile.user) {
          throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${profileId}`); // Rollback transaction
        }
        const userId = studentProfile.user.id;

        // --- Thu thập Media cần xóa ---
        const mediaToDelete: { id: number, path: string }[] = [];
        if (studentProfile.user.avatar) {
          mediaToDelete.push({ id: studentProfile.user.avatarId!, path: studentProfile.user.avatar.path });
        }
        studentProfile.vehicleRegistrations.forEach(vr => vr.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));
        studentProfile.reportedMaintenances.forEach(m => m.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));
        const uniqueMediaToDelete = mediaToDelete.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i); // Lấy unique media


        // 2. Xóa các bản ghi phụ thuộc trước (nếu không dùng cascade mạnh)
        // Lưu ý: Thứ tự xóa quan trọng nếu có foreign key constraints
        await tx.payment.deleteMany({ where: { studentProfileId: profileId } });
        await tx.invoice.deleteMany({ where: { studentProfileId: profileId } }); // Chỉ hóa đơn cá nhân
        await tx.roomTransfer.deleteMany({ where: { studentProfileId: profileId } });
        // Cần xem xét Maintenance: Nếu sinh viên là người báo cáo (`reportedById`)
        await tx.maintenance.deleteMany({ where: { reportedById: profileId } });
        // Cần xem xét Maintenance: Nếu sinh viên là người được giao (`assignedToId`) - Không áp dụng ở đây
        await tx.vehicleRegistration.deleteMany({ where: { studentProfileId: profileId } });
        // Cần xem xét Room: Giảm actualOccupancy nếu sinh viên đang ở phòng? (Logic này nên ở checkout/transfer)


        // 3. Xóa User (sẽ cascade xóa StudentProfile nếu schema đúng)
        await tx.user.delete({
          where: { id: userId }
        });
        // Nếu không cascade, bạn cần xóa StudentProfile trước User:
        // await tx.studentProfile.delete({ where: { id: profileId } });
        // await tx.user.delete({ where: { id: userId } });


        // 4. Xóa các bản ghi Media liên quan (sau khi User/Profile đã bị xóa)
        const mediaIdsToDelete = uniqueMediaToDelete.map(m => m.id);
        if (mediaIdsToDelete.length > 0) {
          await tx.media.deleteMany({
            where: { id: { in: mediaIdsToDelete } }
          });
        }

        // Trả về đường dẫn file để xóa vật lý
        return { mediaPathsToDelete: uniqueMediaToDelete.map(m => m.path) };
      });
      // *** KẾT THÚC TRANSACTION ***


      // 5. Xóa file vật lý SAU KHI transaction thành công
      if (typeof deleteFile === 'function') {
        deletedData.mediaPathsToDelete.forEach(deleteFile);
      } else {
        console.warn(`deleteFile function not available, cannot delete associated media files.`);
      }


      res.status(200).json({
        status: 'success',
        message: 'Sinh viên đã được xóa thành công',
        data: null
      });

    } catch (error: any) {
      console.error('Lỗi khi xóa sinh viên:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên hoặc tài nguyên liên quan (ID: ${req.params.id})`)); // Hoặc AppError 404
      } else if (error.message.includes('Không tìm thấy hồ sơ sinh viên')) {
        return next(new Error(error.message)); // Hoặc AppError 404
      }
      next(error);
    }
  }
}

// Thêm class StaffController
export class StaffController {
  // Lấy danh sách tất cả nhân viên (Admin/Staff)
  async getAllStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const staffProfiles = await prisma.staffProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              role: true,
              avatar: true
            }
          },
          managedBuilding: true
        },
        orderBy: {
          fullName: 'asc'
        }
      });

      res.status(200).json({
        status: 'success',
        results: staffProfiles.length,
        data: staffProfiles
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách nhân viên:', error);
      next(error);
    }
  }

  // Lấy thông tin chi tiết một nhân viên bằng Profile ID
  async getStaffById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('ID hồ sơ nhân viên không hợp lệ'));
      }

      const staff = await prisma.staffProfile.findUnique({
        where: { id: id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              role: true,
              avatar: true
            }
          },
          managedBuilding: true
        }
      });

      if (!staff) {
        return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${id}`));
      }

      res.status(200).json({
        status: 'success',
        data: staff
      });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết nhân viên:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${req.params.id}`));
      }
      next(error);
    }
  }

  // Cập nhật thông tin nhân viên
  async updateStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return next(new Error('ID hồ sơ nhân viên không hợp lệ'));
      }

      const { avatarId, managedBuildingId, ...profileData } = req.body;

      // Tìm profile và user liên quan để kiểm tra tồn tại và lấy userId, avatar cũ
      const currentProfile = await prisma.staffProfile.findUnique({
        where: { id: profileId },
        include: { user: { select: { id: true, avatarId: true } } }
      });

      if (!currentProfile || !currentProfile.user) {
        return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${profileId}`));
      }

      const userId = currentProfile.user.id;
      const currentAvatarId = currentProfile.user.avatarId;

      let oldAvatarPath: string | null = null;

      // Transaction để đảm bảo tính toàn vẹn dữ liệu
      const updatedProfile = await prisma.$transaction(async (tx) => {
        // Xử lý cập nhật Avatar
        if (avatarId !== undefined) {
          const newAvatarId = avatarId ? parseInt(avatarId) : null;

          if (currentAvatarId !== newAvatarId) {
            await tx.user.update({
              where: { id: userId },
              data: { avatarId: newAvatarId },
            });

            if (currentAvatarId && currentAvatarId !== newAvatarId) {
              const oldAvatar = await tx.media.findUnique({ where: { id: currentAvatarId } });
              if (oldAvatar) {
                oldAvatarPath = oldAvatar.path;
                await tx.media.delete({ where: { id: currentAvatarId } });
              }
            }
          }
        }

        // Chuẩn bị dữ liệu cập nhật cho StaffProfile
        const staffUpdateData: Prisma.StaffProfileUpdateInput = {
          fullName: profileData.fullName,
          gender: profileData.gender as Gender,
          birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
          identityCardNumber: profileData.identityCardNumber,
          phoneNumber: profileData.phoneNumber,
          position: profileData.position,
          address: profileData.address,
          managedBuilding: managedBuildingId !== undefined
            ? (managedBuildingId ? { connect: { id: parseInt(managedBuildingId) } } : { disconnect: true })
            : undefined
        };

        // Cập nhật StaffProfile
        const profileAfterUpdate = await tx.staffProfile.update({
          where: { id: profileId },
          data: staffUpdateData,
          include: {
            user: { select: { id: true, email: true, isActive: true, role: true, avatar: true } },
            managedBuilding: true
          }
        });

        return profileAfterUpdate;
      });

      // Xóa file vật lý của avatar cũ (nếu có)
      if (oldAvatarPath && typeof deleteFile === 'function') {
        deleteFile(oldAvatarPath);
      } else if (oldAvatarPath) {
        console.warn(`deleteFile function not available, cannot delete old avatar: ${oldAvatarPath}`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Thông tin nhân viên đã được cập nhật',
        data: updatedProfile
      });

    } catch (error: any) {
      console.error('Lỗi khi cập nhật nhân viên:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const fields = (error.meta?.target as string[])?.join(', ');
          return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`));
        } else if (error.code === 'P2025') {
          return next(new Error(`Không tìm thấy hồ sơ nhân viên hoặc tài nguyên liên quan (ID: ${req.params.id}`));
        }
      }
      next(error);
    }
  }
}
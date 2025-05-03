import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, StudentStatus, Role, Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { deleteFile } from '../services/file.service';

const prisma = new PrismaClient();

export class StudentController {

  // Lấy danh sách tất cả sinh viên
  async getAllStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limitQuery = req.query.limit as string;
      const limit = limitQuery ? parseInt(limitQuery) : 0;
      const applyPagination = limit > 0;
      const offset = applyPagination ? (page - 1) * limit : 0;

      const keyword = req.query.keyword as string;

      const whereCondition: any = {};
      if (keyword) {
        whereCondition.OR = [
          { fullName: { contains: keyword, mode: 'insensitive' } },
          { studentId: { contains: keyword, mode: 'insensitive' } },
          { user: { email: { contains: keyword, mode: 'insensitive' } } },
          { phoneNumber: { contains: keyword, mode: 'insensitive' } }
        ];
      }

      const totalStudents = await prisma.studentProfile.count({
        where: whereCondition
      });

      const students = await prisma.studentProfile.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              email: true,
              isActive: true,
              avatar: true
            }
          },
          room: {
            include: {
              building: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: {
          fullName: 'asc'
        },
        ...(applyPagination && { skip: offset }),
        ...(applyPagination && { take: limit })
      });

      const meta = applyPagination ? {
        total: totalStudents,
        currentPage: page,
        totalPages: Math.ceil(totalStudents / limit),
        limit
      } : {
        total: totalStudents,
        currentPage: 1,
        totalPages: 1,
        limit: totalStudents
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

      const student = await prisma.studentProfile.findFirst({
        where: { userId: userId },
        include: {
          user: {
            select: { id: true, email: true, isActive: true, avatar: true }
          },
          room: {
            include: {
              building: true,
              amenities: { include: { amenity: true } }
            }
          },
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

      const student = await prisma.studentProfile.findFirst({
        where: { userId: userId },
        include: {
          user: {
            select: { id: true, email: true, isActive: true, avatar: true }
          },
          room: {
            include: {
              building: true,
              amenities: { include: { amenity: true } }
            }
          },
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

  // Lấy thông tin chi tiết sinh viên bằng Profile ID
  async getStudentByProfileId(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = parseInt(req.params.profileId);
      if (isNaN(profileId)) {
        return next(new Error('Profile ID không hợp lệ'));
      }

      const student = await prisma.studentProfile.findUnique({
        where: { id: profileId },
        include: {
          user: {
            select: { id: true, email: true, isActive: true, avatar: true }
          },
          room: {
            include: {
              building: true,
              amenities: { include: { amenity: true } }
            }
          },
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

  // Tạo sinh viên mới
  async createStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email, password,
        studentId, fullName, gender, birthDate, identityCardNumber,
        phoneNumber, faculty, courseYear, className, permanentProvince,
        permanentDistrict, permanentAddress, status, startDate, contractEndDate,
        personalEmail, ethnicity, religion, priorityObject,
        fatherName, fatherDobYear, fatherPhone, fatherAddress,
        motherName, motherDobYear, motherPhone, motherAddress,
        emergencyContactRelation, emergencyContactPhone, emergencyContactAddress,
        roomId,
        avatarId
      } = req.body;

      if (!email || !password || !studentId || !fullName || !gender || !birthDate || !identityCardNumber || !phoneNumber || !faculty || !courseYear || !startDate || !contractEndDate) {
        return next(new Error('Thiếu các trường thông tin bắt buộc để tạo sinh viên'));
      }
      if (status && !Object.values(StudentStatus).includes(status as StudentStatus)) {
        return next(new Error(`Trạng thái sinh viên không hợp lệ: ${status}`));
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUserAndProfile = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: Role.STUDENT,
            isActive: true,
            avatar: avatarId ? { connect: { id: parseInt(avatarId) } } : undefined
          }
        });

        const newProfile = await tx.studentProfile.create({
          data: {
            user: { connect: { id: newUser.id } },
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
            status: (status as StudentStatus) || StudentStatus.PENDING_APPROVAL,
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
            room: roomId ? { connect: { id: parseInt(roomId) } } : undefined
          }
        });

        return { user: newUser, profile: newProfile };
      });

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
          const fields = (error.meta?.target as string[])?.join(', ');
          return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`));
        }
      }
      next(error);
    }
  }

  // Cập nhật thông tin sinh viên
  async updateStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return next(new Error('ID hồ sơ sinh viên không hợp lệ'));
      }
      const { avatarId, roomId, ...profileData } = req.body;

      const currentProfile = await prisma.studentProfile.findUnique({
        where: { id: profileId },
        include: { user: { select: { id: true, avatarId: true } } }
      });

      if (!currentProfile || !currentProfile.user) {
        return next(new Error(`Không tìm thấy hồ sơ sinh viên với ID ${profileId}`));
      }

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

      let oldAvatarPath: string | null = null;

      const updatedProfile = await prisma.$transaction(async (tx) => {

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

        const studentUpdateData: Prisma.StudentProfileUpdateInput = {
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
          status: profileData.status as StudentStatus,
          startDate: profileData.startDate ? new Date(profileData.startDate) : undefined,
          contractEndDate: profileData.contractEndDate ? new Date(profileData.contractEndDate) : undefined,
          checkInDate: profileData.checkInDate !== undefined ? (profileData.checkInDate ? new Date(profileData.checkInDate) : null) : undefined,
          checkOutDate: profileData.checkOutDate !== undefined ? (profileData.checkOutDate ? new Date(profileData.checkOutDate) : null) : undefined,
          personalEmail: profileData.personalEmail, ethnicity: profileData.ethnicity, religion: profileData.religion, priorityObject: profileData.priorityObject,
          fatherName: profileData.fatherName, fatherDobYear: profileData.fatherDobYear ? parseInt(profileData.fatherDobYear) : null, fatherPhone: profileData.fatherPhone, fatherAddress: profileData.fatherAddress,
          motherName: profileData.motherName, motherDobYear: profileData.motherDobYear ? parseInt(profileData.motherDobYear) : null, motherPhone: profileData.motherPhone, motherAddress: profileData.motherAddress,
          emergencyContactRelation: profileData.emergencyContactRelation, emergencyContactPhone: profileData.emergencyContactPhone, emergencyContactAddress: profileData.emergencyContactAddress,

          room: roomId !== undefined
            ? (roomId ? { connect: { id: parseInt(roomId) } } : { disconnect: true })
            : undefined
        };

        const profileAfterUpdate = await tx.studentProfile.update({
          where: { id: profileId },
          data: studentUpdateData,
          include: {
            user: { select: { id: true, email: true, isActive: true, avatar: true } },
            room: { include: { building: true } }
          }
        });

        return profileAfterUpdate;
      });

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
          return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`));
        } else if (error.code === 'P2025') {
          return next(new Error(`Không tìm thấy hồ sơ sinh viên hoặc tài nguyên liên quan (ID: ${req.params.id})`));
        }
      }
      next(error);
    }
  }

  // Xóa sinh viên
  async deleteStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return next(new Error('ID hồ sơ sinh viên không hợp lệ'));
      }

      const deletedData = await prisma.$transaction(async (tx) => {
        const studentProfile = await tx.studentProfile.findUnique({
          where: { id: profileId },
          include: {
            user: { select: { id: true, avatarId: true, avatar: { select: { path: true } } } },
            vehicleRegistrations: { select: { images: { select: { id: true, path: true } } } },
            reportedMaintenances: { select: { images: { select: { id: true, path: true } } } },
            payments: { select: { id: true } },
            invoices: { select: { id: true } },
            roomTransfers: { select: { id: true } },
          }
        });

        if (!studentProfile || !studentProfile.user) {
          throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${profileId}`);
        }
        const userId = studentProfile.user.id;

        const mediaToDelete: { id: number, path: string }[] = [];
        if (studentProfile.user.avatar) {
          mediaToDelete.push({ id: studentProfile.user.avatarId!, path: studentProfile.user.avatar.path });
        }
        studentProfile.vehicleRegistrations.forEach(vr => vr.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));
        studentProfile.reportedMaintenances.forEach(m => m.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));
        const uniqueMediaToDelete = mediaToDelete.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

        await tx.payment.deleteMany({ where: { studentProfileId: profileId } });
        await tx.invoice.deleteMany({ where: { studentProfileId: profileId } });
        await tx.roomTransfer.deleteMany({ where: { studentProfileId: profileId } });
        await tx.maintenance.deleteMany({ where: { reportedById: profileId } });
        await tx.vehicleRegistration.deleteMany({ where: { studentProfileId: profileId } });

        await tx.user.delete({
          where: { id: userId }
        });

        const mediaIdsToDelete = uniqueMediaToDelete.map(m => m.id);
        if (mediaIdsToDelete.length > 0) {
          await tx.media.deleteMany({
            where: { id: { in: mediaIdsToDelete } }
          });
        }

        return { mediaPathsToDelete: uniqueMediaToDelete.map(m => m.path) };
      });

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
        return next(new Error(`Không tìm thấy hồ sơ sinh viên hoặc tài nguyên liên quan (ID: ${req.params.id})`));
      } else if (error.message.includes('Không tìm thấy hồ sơ sinh viên')) {
        return next(new Error(error.message));
      }
      next(error);
    }
  }
}

export class StaffController {
  // Lấy danh sách tất cả nhân viên
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

      const updatedProfile = await prisma.$transaction(async (tx) => {
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
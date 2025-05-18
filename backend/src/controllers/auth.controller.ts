import { Request, Response } from 'express';
import { PrismaClient, Role, StudentProfile, StaffProfile, Gender, StudentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { saveLoginLog, getUserLoginHistory } from '../services/auth.service';
import { getLocationFromIP } from '../utils/ip-location';

// Interfaces
interface RequestWithUser extends Request {
  user?: {
    userId: number;
    email: string;
    role: Role;
  };
}

// Constants
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5002';
const DEFAULT_AVATAR = 'src/assets/default-avatar.png';

// Helpers
const formatUserResponse = (user: any) => {
  const { password: _, ...userWithoutPassword } = user;

  const avatarUrl = user.avatar?.path
    ? `${BACKEND_URL}${user.avatar.path}`
    : DEFAULT_AVATAR;

  return {
    ...userWithoutPassword,
    avatarUrl
  };
};

export class AuthController {
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email và mật khẩu không được để trống' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { avatar: true }
      });

      if (!user) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Lưu log đăng nhập thất bại nếu là ADMIN hoặc STAFF
        if (user.role === Role.ADMIN || user.role === Role.STAFF) {
          const location = await getLocationFromIP(req.ip);
          await saveLoginLog({
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'FAILED',
            location
          });
        }

        return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
      }

      // JWT Signing
      const payload = { userId: user.id, email: user.email, role: user.role };
      const secret: Secret = JWT_SECRET;
      const options: SignOptions = {
        expiresIn: JWT_EXPIRES_IN as any
      };

      const token = jwt.sign(payload, secret, options);

      let profile: StudentProfile | StaffProfile | null = null;
      if (user.role === Role.STUDENT) {
        profile = await prisma.studentProfile.findUnique({
          where: { userId: user.id },
          include: { room: { include: { building: true } } }
        });
      } else if (user.role === Role.STAFF || user.role === Role.ADMIN) {
        profile = await prisma.staffProfile.findUnique({
          where: { userId: user.id },
          include: { managedBuilding: true }
        });

        // Lưu log đăng nhập thành công cho ADMIN và STAFF
        const location = await getLocationFromIP(req.ip);
        await saveLoginLog({
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          status: 'SUCCESS',
          location
        });
      }

      const formattedUser = formatUserResponse(user);

      return res.json({
        success: true,
        data: {
          message: 'Đăng nhập thành công',
          token,
          user: formattedUser,
          profile
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi trong quá trình đăng nhập'
      });
    }
  }

  static async me(req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: 'Thông tin xác thực không đầy đủ'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          avatar: true,
          staffProfile: userRole !== Role.STUDENT ? {
            include: {
              managedBuilding: true
            }
          } : undefined,
          studentProfile: userRole === Role.STUDENT ? {
            include: {
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
          } : undefined
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại'
        });
      }

      const formattedUser = formatUserResponse(user);

      return res.json({
        success: true,
        data: {
          user: formattedUser,
          profile: user.staffProfile || user.studentProfile || null
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy thông tin người dùng'
      });
    }
  }

  static async logout(_req: Request, res: Response): Promise<Response> {
    try {
      return res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi đăng xuất'
      });
    }
  }

  static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, fullName, studentId, phoneNumber } = req.body;

      // Validation
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp email, mật khẩu và họ tên đầy đủ'
        });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user and student profile in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: Role.STUDENT,
            isActive: true,
          }
        });

        // Create student profile with required fields
        const today = new Date();
        const defaultContractEndDate = new Date(today);
        defaultContractEndDate.setFullYear(today.getFullYear() + 1);

        const studentProfile = await tx.studentProfile.create({
          data: {
            userId: newUser.id,
            fullName,
            studentId: studentId || `S${Math.floor(10000 + Math.random() * 90000)}`,
            phoneNumber: phoneNumber || "Chưa cập nhật",
            gender: Gender.MALE,
            birthDate: new Date("2000-01-01"),
            identityCardNumber: `ID${Date.now()}`,
            faculty: "Khoa chưa xác định",
            courseYear: new Date().getFullYear() - 2000,
            status: StudentStatus.PENDING_APPROVAL,
            startDate: today,
            contractEndDate: defaultContractEndDate
          }
        });

        return { user: newUser, profile: studentProfile };
      });

      const { password: _, ...userWithoutPassword } = result.user;

      return res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: {
          user: userWithoutPassword,
          profile: result.profile
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi trong quá trình đăng ký'
      });
    }
  }

  static async getLoginHistory(req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const userId = parseInt(req.params.userId || (req.user?.userId || 0).toString());

      // Kiểm tra quyền truy cập - chỉ cho phép user xem lịch sử của chính họ hoặc Admin xem của bất kỳ ai
      if (req.user?.userId !== userId && req.user?.role !== Role.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem lịch sử đăng nhập này'
        });
      }

      // Kiểm tra user có phải là ADMIN hoặc STAFF không
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || (user.role !== Role.ADMIN && user.role !== Role.STAFF)) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ có thể xem lịch sử đăng nhập của Admin hoặc Staff'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const loginHistory = await getUserLoginHistory(userId, page, limit);

      return res.json({
        success: true,
        data: loginHistory.data,
        meta: loginHistory.meta
      });
    } catch (error) {
      console.error('Get login history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy lịch sử đăng nhập'
      });
    }
  }

  /**
   * Đổi mật khẩu người dùng đang đăng nhập
   */
  static async changePassword(req: RequestWithUser, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu cũ và mới không được để trống'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
      }

      // Lấy thông tin người dùng từ database
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Kiểm tra mật khẩu cũ
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu cũ không chính xác'
        });
      }

      // Hash mật khẩu mới và cập nhật
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { password: hashedPassword }
      });

      return res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi đổi mật khẩu',
        error: (error as Error).message
      });
    }
  }
}
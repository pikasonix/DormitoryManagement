import { Request, Response } from 'express';
import { PrismaClient, Role, StudentProfile, StaffProfile } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';

// --- Interfaces ---
interface RequestWithUser extends Request {
  user?: {
    userId: number;
    email: string;
    role: Role;
  };
}

// --- Constants ---
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
// **QUAN TRỌNG:** Đảm bảo giá trị trong .env là một chuỗi thời gian hợp lệ (vd: '1d', '24h')
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// --- Controller ---
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
        return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
      }

      // --- JWT Signing ---
      const payload = { userId: user.id, email: user.email, role: user.role };
      const secret: Secret = JWT_SECRET;
      const options: SignOptions = {
        expiresIn: JWT_EXPIRES_IN as any
      };

      const token = jwt.sign(payload, secret, options);
      // --- End JWT Signing ---

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
      }

      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        message: 'Đăng nhập thành công',
        token,
        user: userWithoutPassword,
        profile
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình đăng nhập' });
    }
  }

  static async me(req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({ message: 'Thông tin xác thực không đầy đủ' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          avatar: true,
          staffProfile: userRole !== Role.STUDENT ? {
            select: {
              id: true, fullName: true, phoneNumber: true, position: true, managedBuildingId: true,
            }
          } : undefined,
          studentProfile: userRole === Role.STUDENT ? {
            select: {
              id: true, studentId: true, fullName: true, roomId: true,
            }
          } : undefined
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'Người dùng không tồn tại' });
      }

      return res.json({ user });

    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin người dùng' });
    }
  }

  static async logout(_req: Request, res: Response): Promise<Response> {
    try {
      return res.json({ message: 'Đăng xuất thành công' });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng xuất' });
    }
  }
}
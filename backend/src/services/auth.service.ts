import { PrismaClient, User, Role, StudentProfile, StaffProfile } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export class AuthService {
  /**
   * Xác thực thông tin đăng nhập và trả về thông tin user cơ bản nếu thành công.
   * @param email
   * @param password
   * @returns User object (không có password) nếu hợp lệ
   * @throws AppError nếu thông tin không hợp lệ hoặc user không active
   */
  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> & { avatar: any | null }> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { avatar: true }
    });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new Error('Tài khoản đã bị vô hiệu hóa');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Lấy thông tin User và Profile liên quan dựa trên userId.
   * @param userId
   * @returns Object chứa thông tin User (không password) và Profile (Student/Staff)
   * @throws AppError nếu user không tìm thấy
   */
  async getUserWithProfile(userId: number): Promise<{ user: Omit<User, 'password'> & { avatar: any | null }, profile: StudentProfile | StaffProfile | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        avatar: true,
        studentProfile: {
          include: { room: { include: { building: true } } }
        },
        staffProfile: {
          include: { managedBuilding: true }
        }
      }
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    const { password: _, ...userWithoutPassword } = user;
    const profile = user.studentProfile || user.staffProfile || null;

    return { user: userWithoutPassword, profile };
  }

  /**
   * Thay đổi mật khẩu cho người dùng đã xác thực.
   * @param userId ID người dùng
   * @param oldPassword Mật khẩu cũ
   * @param newPassword Mật khẩu mới
   * @throws AppError nếu user không tồn tại hoặc mật khẩu cũ không đúng
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Mật khẩu cũ không chính xác');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Yêu cầu đặt lại mật khẩu, tạo token và gửi email.
   * @param email Email của người dùng
   * @throws AppError nếu email không tồn tại hoặc lỗi gửi mail
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`Password reset request for non-existent email: ${email}`);
      return { message: 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date(Date.now() + 3600000);

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: resetToken,
          resetTokenExpiry: expiryDate
        }
      });

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
      console.log(`Password reset requested for ${email}. Token: ${resetToken}`);
      console.log(`Reset URL: ${resetUrl}`);

      return { message: 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.' };

    } catch (error) {
      console.error("Error during password reset request:", error);
      throw new Error('Đã xảy ra lỗi khi gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.');
    }
  }

  /**
   * Đặt lại mật khẩu bằng token.
   * @param token Token nhận được từ email
   * @param newPassword Mật khẩu mới
   * @throws AppError nếu token không hợp lệ, hết hạn hoặc lỗi cập nhật
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || !newPassword) {
      throw new Error('Token và mật khẩu mới là bắt buộc');
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}

/**
 * Lưu log đăng nhập của người dùng (chỉ cho ADMIN và STAFF)
 */
const saveLoginLog = async (data: {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED';
  location?: string;
}) => {
  try {
    // Kiểm tra xem user có phải là ADMIN hoặc STAFF không
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { role: true }
    });

    // Chỉ lưu log cho ADMIN và STAFF
    if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
      return prisma.loginLog.create({
        data
      });
    }

    // Nếu không phải ADMIN hoặc STAFF, không lưu log
    return null;
  } catch (error) {
    console.error('Error saving login log:', error);
    // Không throw error để không làm gián đoạn quá trình đăng nhập
    return null;
  }
};

/**
 * Lấy lịch sử đăng nhập của người dùng
 */
const getUserLoginHistory = async (userId: number, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.loginLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.loginLog.count({ where: { userId } })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: logs,
    meta: {
      total,
      page,
      limit,
      totalPages
    }
  };
};

export {
  saveLoginLog,
  getUserLoginHistory
};
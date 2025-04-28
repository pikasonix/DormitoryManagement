import { PrismaClient, User, Role, StudentProfile, StaffProfile } from '@prisma/client'; // Import thêm Role, Profiles
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
// Giả sử emailService được import đúng cách
// import { emailService } from './email.service';
// Import AppError nếu có
// import { AppError } from '../types/AppError';

// Lưu ý: Sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

// Lấy biến môi trường một cách nhất quán
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; // Cần cho reset link


export class AuthService {
  // Không cần constructor nếu dùng instance singleton
  // constructor() {
  //     this.prisma = new PrismaClient();
  // }

  // --- Hàm Register bị loại bỏ vì quá đơn giản và không khớp schema mới ---
  // Logic tạo user + profile nên nằm ở controller chuyên biệt


  /**
   * Xác thực thông tin đăng nhập và trả về thông tin user cơ bản nếu thành công.
   * Controller sẽ xử lý việc tạo token và lấy profile chi tiết.
   * @param email
   * @param password
   * @returns User object (không có password) nếu hợp lệ
   * @throws AppError nếu thông tin không hợp lệ hoặc user không active
   */
  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> & { avatar: any | null }> { // Trả về cả avatar
    const user = await prisma.user.findUnique({
      where: { email },
      include: { avatar: true } // Include avatar
    });

    if (!user) {
      // Sử dụng AppError nếu có, hoặc throw Error thông thường
      throw new Error('Email hoặc mật khẩu không chính xác'); // Hoặc AppError(..., 401)
      // throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    if (!user.isActive) {
      throw new Error('Tài khoản đã bị vô hiệu hóa'); // Hoặc AppError(..., 401)
      // throw new AppError('Tài khoản đã bị vô hiệu hóa', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Email hoặc mật khẩu không chính xác'); // Hoặc AppError(..., 401)
      // throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    // Loại bỏ password trước khi trả về
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }


  /**
   * Lấy thông tin User và Profile liên quan dựa trên userId.
   * Thường được gọi bởi AuthController.me.
   * @param userId
   * @returns Object chứa thông tin User (không password) và Profile (Student/Staff)
   * @throws AppError nếu user không tìm thấy
   */
  async getUserWithProfile(userId: number): Promise<{ user: Omit<User, 'password'> & { avatar: any | null }, profile: StudentProfile | StaffProfile | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        avatar: true,
        studentProfile: { // Include luôn cả hai, chỉ một cái sẽ có dữ liệu
          include: { room: { include: { building: true } } } // Include lồng nhau nếu cần
        },
        staffProfile: {
          include: { managedBuilding: true } // Include lồng nhau nếu cần
        }
      }
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại'); // Hoặc AppError(..., 404)
      // throw new AppError('Người dùng không tồn tại', 404);
    }

    const { password: _, ...userWithoutPassword } = user;

    // Xác định profile nào có dữ liệu để trả về
    const profile = user.studentProfile || user.staffProfile || null;

    return { user: userWithoutPassword, profile };
  }

  // --- Hàm getProfile cũ không cần thiết nếu có getUserWithProfile ---
  // async getProfile(userId: number): Promise<Omit<User, 'password'>> { ... }


  // --- Hàm updateProfile cũ chỉ cập nhật User, không đủ ---
  // Logic cập nhật User (vd: avatarId) và Profile nên nằm trong controller hoặc service chuyên biệt (UserController, StudentService,...)
  // async updateProfile(userId: number, data: Partial<User>): Promise<Omit<User, 'password'>> { ... }


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
      throw new Error('Người dùng không tồn tại'); // Hoặc AppError(..., 404)
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Mật khẩu cũ không chính xác'); // Hoặc AppError(..., 400)
    }

    // Validate newPassword strength if needed

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Gửi email thông báo đổi mật khẩu (nếu cần)
    // await emailService.sendPasswordChangeNotification(user.email);

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
      // Vẫn trả về thành công để tránh lộ thông tin email nào tồn tại
      console.warn(`Password reset request for non-existent email: ${email}`);
      return { message: 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.' };
      // Hoặc throw lỗi nếu muốn báo rõ:
      // throw new Error('Email không tồn tại trong hệ thống'); // Hoặc AppError(..., 404)
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    // Lưu token gốc thay vì hash để dễ tìm kiếm và tránh lỗi so sánh bcrypt
    // const hashedToken = await bcrypt.hash(resetToken, 10);

    const expiryDate = new Date(Date.now() + 3600000); // 1 giờ

    try {
      // Cập nhật user với token reset và thời gian hết hạn
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: resetToken, // Lưu token gốc
          resetTokenExpiry: expiryDate
        }
      });

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`; // Đảm bảo URL đúng

      // Giả sử emailService tồn tại và hoạt động
      // await emailService.sendEmail(
      //     email,
      //     'Yêu cầu đặt lại mật khẩu',
      //     `... (Nội dung email với link ${resetUrl}) ...`
      // );
      console.log(`Password reset requested for ${email}. Token: ${resetToken}`); // Log để test
      console.log(`Reset URL: ${resetUrl}`);

      return { message: 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.' };

    } catch (error) {
      console.error("Error during password reset request:", error);
      // Không cần rollback vì nếu update lỗi thì đã throw, nếu gửi mail lỗi thì cũng throw
      throw new Error('Đã xảy ra lỗi khi gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.'); // Hoặc AppError(..., 500)
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
      throw new Error('Token và mật khẩu mới là bắt buộc'); // Hoặc AppError(..., 400)
    }

    // Tìm user bằng token gốc và kiểm tra thời gian hết hạn
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token, // Tìm bằng token gốc
        resetTokenExpiry: { gt: new Date() } // Token còn hạn
      }
    });

    if (!user) {
      throw new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'); // Hoặc AppError(..., 400)
    }

    // Không cần bcrypt.compare nữa
    // const isValidToken = await bcrypt.compare(token, user.resetToken!); // Bỏ

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu và xóa token reset
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null, // Xóa token sau khi sử dụng
        resetTokenExpiry: null // Xóa thời gian hết hạn
      }
    });

    // Gửi email thông báo mật khẩu đã được reset (nếu cần)
    // await emailService.sendPasswordResetSuccess(user.email);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserLoginHistory = exports.saveLoginLog = exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
class AuthService {
    /**
     * Xác thực thông tin đăng nhập và trả về thông tin user cơ bản nếu thành công.
     * @param email
     * @param password
     * @returns User object (không có password) nếu hợp lệ
     * @throws AppError nếu thông tin không hợp lệ hoặc user không active
     */
    validateUser(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({
                where: { email },
                include: { avatar: true }
            });
            if (!user) {
                throw new Error('Email hoặc mật khẩu không chính xác');
            }
            if (!user.isActive) {
                throw new Error('Tài khoản đã bị vô hiệu hóa');
            }
            const isValidPassword = yield bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Email hoặc mật khẩu không chính xác');
            }
            const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
            return userWithoutPassword;
        });
    }
    /**
     * Lấy thông tin User và Profile liên quan dựa trên userId.
     * @param userId
     * @returns Object chứa thông tin User (không password) và Profile (Student/Staff)
     * @throws AppError nếu user không tìm thấy
     */
    getUserWithProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({
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
            const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
            const profile = user.studentProfile || user.staffProfile || null;
            return { user: userWithoutPassword, profile };
        });
    }
    /**
     * Thay đổi mật khẩu cho người dùng đã xác thực.
     * @param userId ID người dùng
     * @param oldPassword Mật khẩu cũ
     * @param newPassword Mật khẩu mới
     * @throws AppError nếu user không tồn tại hoặc mật khẩu cũ không đúng
     */
    changePassword(userId, oldPassword, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new Error('Người dùng không tồn tại');
            }
            const isValidPassword = yield bcryptjs_1.default.compare(oldPassword, user.password);
            if (!isValidPassword) {
                throw new Error('Mật khẩu cũ không chính xác');
            }
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
            yield prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });
            return { message: 'Đổi mật khẩu thành công' };
        });
    }
    /**
     * Yêu cầu đặt lại mật khẩu, tạo token và gửi email.
     * @param email Email của người dùng
     * @throws AppError nếu email không tồn tại hoặc lỗi gửi mail
     */
    requestPasswordReset(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({ where: { email } });
            if (!user) {
                console.warn(`Password reset request for non-existent email: ${email}`);
                return { message: 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.' };
            }
            const resetToken = crypto_1.default.randomBytes(32).toString('hex');
            const expiryDate = new Date(Date.now() + 3600000);
            try {
                yield prisma.user.update({
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
            }
            catch (error) {
                console.error("Error during password reset request:", error);
                throw new Error('Đã xảy ra lỗi khi gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.');
            }
        });
    }
    /**
     * Đặt lại mật khẩu bằng token.
     * @param token Token nhận được từ email
     * @param newPassword Mật khẩu mới
     * @throws AppError nếu token không hợp lệ, hết hạn hoặc lỗi cập nhật
     */
    resetPassword(token, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!token || !newPassword) {
                throw new Error('Token và mật khẩu mới là bắt buộc');
            }
            const user = yield prisma.user.findFirst({
                where: {
                    resetToken: token,
                    resetTokenExpiry: { gt: new Date() }
                }
            });
            if (!user) {
                throw new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
            }
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
            yield prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            });
            return { message: 'Đặt lại mật khẩu thành công' };
        });
    }
}
exports.AuthService = AuthService;
/**
 * Lưu log đăng nhập của người dùng (chỉ cho ADMIN và STAFF)
 */
const saveLoginLog = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Kiểm tra xem user có phải là ADMIN hoặc STAFF không
        const user = yield prisma.user.findUnique({
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
    }
    catch (error) {
        console.error('Error saving login log:', error);
        // Không throw error để không làm gián đoạn quá trình đăng nhập
        return null;
    }
});
exports.saveLoginLog = saveLoginLog;
/**
 * Lấy lịch sử đăng nhập của người dùng
 */
const getUserLoginHistory = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [logs, total] = yield Promise.all([
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
});
exports.getUserLoginHistory = getUserLoginHistory;

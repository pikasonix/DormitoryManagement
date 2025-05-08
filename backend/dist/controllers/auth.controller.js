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
exports.AuthController = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_1 = require("../services/auth.service");
const ip_location_1 = require("../utils/ip-location");
// Constants
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5002';
const DEFAULT_AVATAR = 'src/assets/default-avatar.png';
// Helpers
const formatUserResponse = (user) => {
    var _a;
    const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
    const avatarUrl = ((_a = user.avatar) === null || _a === void 0 ? void 0 : _a.path)
        ? `${BACKEND_URL}${user.avatar.path}`
        : DEFAULT_AVATAR;
    return Object.assign(Object.assign({}, userWithoutPassword), { avatarUrl });
};
class AuthController {
    static login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    return res.status(400).json({ message: 'Email và mật khẩu không được để trống' });
                }
                const user = yield prisma.user.findUnique({
                    where: { email },
                    include: { avatar: true }
                });
                if (!user) {
                    return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
                }
                if (!user.isActive) {
                    return res.status(401).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
                }
                const isValidPassword = yield bcryptjs_1.default.compare(password, user.password);
                if (!isValidPassword) {
                    // Lưu log đăng nhập thất bại nếu là ADMIN hoặc STAFF
                    if (user.role === client_1.Role.ADMIN || user.role === client_1.Role.STAFF) {
                        const location = yield (0, ip_location_1.getLocationFromIP)(req.ip);
                        yield (0, auth_service_1.saveLoginLog)({
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
                const secret = JWT_SECRET;
                const options = {
                    expiresIn: JWT_EXPIRES_IN
                };
                const token = jsonwebtoken_1.default.sign(payload, secret, options);
                let profile = null;
                if (user.role === client_1.Role.STUDENT) {
                    profile = yield prisma.studentProfile.findUnique({
                        where: { userId: user.id },
                        include: { room: { include: { building: true } } }
                    });
                }
                else if (user.role === client_1.Role.STAFF || user.role === client_1.Role.ADMIN) {
                    profile = yield prisma.staffProfile.findUnique({
                        where: { userId: user.id },
                        include: { managedBuilding: true }
                    });
                    // Lưu log đăng nhập thành công cho ADMIN và STAFF
                    const location = yield (0, ip_location_1.getLocationFromIP)(req.ip);
                    yield (0, auth_service_1.saveLoginLog)({
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
            }
            catch (error) {
                console.error('Login error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Đã xảy ra lỗi trong quá trình đăng nhập'
                });
            }
        });
    }
    static me(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                if (!userId || !userRole) {
                    return res.status(401).json({
                        success: false,
                        message: 'Thông tin xác thực không đầy đủ'
                    });
                }
                const user = yield prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        avatar: true,
                        staffProfile: userRole !== client_1.Role.STUDENT ? {
                            include: {
                                managedBuilding: true
                            }
                        } : undefined,
                        studentProfile: userRole === client_1.Role.STUDENT ? {
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
            }
            catch (error) {
                console.error('Get user error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Đã xảy ra lỗi khi lấy thông tin người dùng'
                });
            }
        });
    }
    static logout(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return res.json({
                    success: true,
                    message: 'Đăng xuất thành công'
                });
            }
            catch (error) {
                console.error('Logout error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Đã xảy ra lỗi khi đăng xuất'
                });
            }
        });
    }
    static register(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const existingUser = yield prisma.user.findUnique({
                    where: { email }
                });
                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: 'Email đã được sử dụng'
                    });
                }
                // Hash password
                const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
                // Create user and student profile in a transaction
                const result = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    // Create user
                    const newUser = yield tx.user.create({
                        data: {
                            email,
                            password: hashedPassword,
                            role: client_1.Role.STUDENT,
                            isActive: true,
                        }
                    });
                    // Create student profile with required fields
                    const today = new Date();
                    const defaultContractEndDate = new Date(today);
                    defaultContractEndDate.setFullYear(today.getFullYear() + 1);
                    const studentProfile = yield tx.studentProfile.create({
                        data: {
                            userId: newUser.id,
                            fullName,
                            studentId: studentId || `S${Math.floor(10000 + Math.random() * 90000)}`,
                            phoneNumber: phoneNumber || "Chưa cập nhật",
                            gender: client_1.Gender.MALE,
                            birthDate: new Date("2000-01-01"),
                            identityCardNumber: `ID${Date.now()}`,
                            faculty: "Khoa chưa xác định",
                            courseYear: new Date().getFullYear() - 2000,
                            status: client_1.StudentStatus.PENDING_APPROVAL,
                            startDate: today,
                            contractEndDate: defaultContractEndDate
                        }
                    });
                    return { user: newUser, profile: studentProfile };
                }));
                const _a = result.user, { password: _ } = _a, userWithoutPassword = __rest(_a, ["password"]);
                return res.status(201).json({
                    success: true,
                    message: 'Đăng ký thành công',
                    data: {
                        user: userWithoutPassword,
                        profile: result.profile
                    }
                });
            }
            catch (error) {
                console.error('Register error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Đã xảy ra lỗi trong quá trình đăng ký'
                });
            }
        });
    }
    static getLoginHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const userId = parseInt(req.params.userId || (((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || 0).toString());
                // Kiểm tra quyền truy cập - chỉ cho phép user xem lịch sử của chính họ hoặc Admin xem của bất kỳ ai
                if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId) !== userId && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== client_1.Role.ADMIN) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền xem lịch sử đăng nhập này'
                    });
                }
                // Kiểm tra user có phải là ADMIN hoặc STAFF không
                const user = yield prisma.user.findUnique({
                    where: { id: userId },
                    select: { role: true }
                });
                if (!user || (user.role !== client_1.Role.ADMIN && user.role !== client_1.Role.STAFF)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Chỉ có thể xem lịch sử đăng nhập của Admin hoặc Staff'
                    });
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const loginHistory = yield (0, auth_service_1.getUserLoginHistory)(userId, page, limit);
                return res.json({
                    success: true,
                    data: loginHistory.data,
                    meta: loginHistory.meta
                });
            }
            catch (error) {
                console.error('Get login history error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Đã xảy ra lỗi khi lấy lịch sử đăng nhập'
                });
            }
        });
    }
}
exports.AuthController = AuthController;

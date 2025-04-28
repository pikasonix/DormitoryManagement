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
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
class AuthController {
    static login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                const user = yield prisma.user.findUnique({
                    where: { email }
                });
                if (!user) {
                    return res.status(401).json({
                        message: 'Email atau password salah'
                    });
                }
                const isValidPassword = yield bcryptjs_1.default.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({
                        message: 'Email atau password salah'
                    });
                }
                const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
                // Hapus password dari response
                const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
                return res.json({
                    token,
                    user: userWithoutPassword
                });
            }
            catch (error) {
                console.error('Login error:', error);
                return res.status(500).json({
                    message: 'Terjadi kesalahan saat login'
                });
            }
        });
    }
    static me(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        message: 'Unauthorized'
                    });
                }
                const user = yield prisma.user.findUnique({
                    where: { id: userId }
                });
                if (!user) {
                    return res.status(404).json({
                        message: 'User tidak ditemukan'
                    });
                }
                // Hapus password dari response
                const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
                return res.json(userWithoutPassword);
            }
            catch (error) {
                console.error('Get user error:', error);
                return res.status(500).json({
                    message: 'Terjadi kesalahan saat mengambil data user'
                });
            }
        });
    }
    static logout(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return res.json({ message: 'Berhasil logout' });
            }
            catch (error) {
                console.error('Logout error:', error);
                return res.status(500).json({
                    message: 'Terjadi kesalahan saat logout'
                });
            }
        });
    }
}
exports.AuthController = AuthController;

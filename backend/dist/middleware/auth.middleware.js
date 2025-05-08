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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';
// Authentication middleware
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new Error('Authentication token is required and must be Bearer type'));
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        let errorMessage = 'Invalid or expired token';
        if (error.name === 'TokenExpiredError') {
            errorMessage = 'Authentication token has expired';
        }
        else if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Invalid authentication token';
        }
        else {
            console.error('Auth middleware error:', error);
        }
        next(new Error(errorMessage));
    }
});
exports.authMiddleware = authMiddleware;
// Role-based access control middleware
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new Error('User authentication data is missing'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new Error('Forbidden: You do not have permission to access this resource'));
        }
        next();
    };
};
exports.checkRole = checkRole;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limit untuk login attempts
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // maksimal 5 percobaan
    message: {
        message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit'
    },
    standardHeaders: true,
    legacyHeaders: false
});
// Rate limit untuk API secara umum
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 menit
    max: 60, // maksimal 60 request per menit
    message: {
        message: 'Terlalu banyak request, silakan coba lagi nanti'
    },
    standardHeaders: true,
    legacyHeaders: false
});

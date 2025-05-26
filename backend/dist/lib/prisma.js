"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Tạo một instance PrismaClient dùng chung trong ứng dụng
exports.prisma = new client_1.PrismaClient();
// Việc export mặc định prisma giúp nhất quán khi import
exports.default = exports.prisma;

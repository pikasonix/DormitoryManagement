import { PrismaClient } from '@prisma/client';

// Tạo một instance PrismaClient dùng chung trong ứng dụng
export const prisma = new PrismaClient();

// Việc export mặc định prisma giúp nhất quán khi import
export default prisma;

import { Role } from '@prisma/client';

// (Không cần import User từ Prisma nữa)
// import { User } from '@prisma/client';

// Định nghĩa cấu trúc của object user sẽ được gán vào req bởi authMiddleware
// Đặt tên là AuthenticatedUser hoặc tương tự để phân biệt với Prisma User
interface AuthenticatedUser {
  userId: number;
  email: string;
  role: Role;
  // Không cần iat, exp ở đây trừ khi bạn cố ý gán chúng vào req.user
}

declare global {
  namespace Express {
    // Mở rộng interface Request gốc của Express
    interface Request {
      // Khai báo thuộc tính user là optional (?) và có kiểu AuthenticatedUser
      user?: AuthenticatedUser;
    }
  }
}

// Thêm export {} để đảm bảo file này được coi là một module.
// Điều này quan trọng khi sử dụng import/export ở top-level trong file .d.ts
// và đảm bảo global augmentation hoạt động đúng cách.
export { };
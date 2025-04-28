import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client'; // Import Role enum
// Không cần import PrismaClient nữa nếu không query DB ở đây

// Định nghĩa cấu trúc payload trong JWT mà chúng ta đã tạo ở login
interface JwtPayload {
  userId: number;
  email: string;
  role: Role;
  iat?: number; // Thường có sẵn (issued at)
  exp?: number; // Thường có sẵn (expiration time)
}

// Mở rộng Request type với cấu trúc user cụ thể hơn thay vì any
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // Sử dụng JwtPayload thay vì any
    }
  }
}

// Lấy secret từ biến môi trường (nhất quán với controller)
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';

// Middleware xác thực token
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => { // Không cần Promise<void | Response> nữa nếu dùng next(error)
  try {
    const authHeader = req.headers.authorization;

    // Kiểm tra header và định dạng Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Sử dụng next để chuyển lỗi, có thể dùng AppError nếu bạn đã định nghĩa
      return next(new Error('Authentication token is required and must be Bearer type'));
      // return res.status(401).json({ message: 'Token xác thực là bắt buộc và phải là dạng Bearer' });
    }

    const token = authHeader.split(' ')[1];

    // Xác thực và giải mã token
    // jwt.verify sẽ throw lỗi nếu token không hợp lệ hoặc hết hạn, được bắt bởi catch block
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // *** THAY ĐỔI: Loại bỏ truy vấn database không cần thiết ***
    // const user = await prisma.user.findUnique({
    //   where: { id: decoded.userId }
    // });
    // if (!user) {
    //   return next(new Error('User associated with this token not found'));
    //   // return res.status(401).json({ message: 'Người dùng không tồn tại' });
    // }

    // *** THAY ĐỔI: Gán payload đã giải mã vào req.user ***
    // Đảm bảo chỉ gán các trường cần thiết từ payload
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
      // Không cần gán iat, exp vào đây trừ khi thực sự cần
    };

    // Chuyển sang middleware/route handler tiếp theo
    next();

  } catch (error: any) {
    // Xử lý lỗi từ jwt.verify (vd: hết hạn, không hợp lệ)
    let errorMessage = 'Invalid or expired token';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Authentication token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid authentication token';
    } else {
      // Log lỗi không mong muốn khác
      console.error('Auth middleware error:', error);
    }
    // Sử dụng next để chuyển lỗi
    next(new Error(errorMessage)); // Hoặc AppError(errorMessage, 401)
    // return res.status(401).json({ message: errorMessage });
  }
};

// Middleware kiểm tra quyền (đặt ở đây cho tiện)
export const checkRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Kiểm tra xem req.user đã được gán bởi authMiddleware chưa
    if (!req.user) {
      // Lỗi này không nên xảy ra nếu authMiddleware chạy trước và thành công
      return next(new Error('User authentication data is missing'));
      // return res.status(401).json({ message: 'Chưa xác thực người dùng' });
    }

    // Kiểm tra xem role của user có nằm trong danh sách được phép không
    if (!allowedRoles.includes(req.user.role)) {
      return next(new Error('Forbidden: You do not have permission to access this resource')); // Hoặc AppError(..., 403)
      // return res.status(403).json({ message: 'Không có quyền truy cập tài nguyên này' });
    }

    // Nếu có quyền, cho phép đi tiếp
    next();
  };
};
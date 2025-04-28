import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import jwt from 'jsonwebtoken';

// Import interface AppError
import { AppError } from '../types/error'; // Điều chỉnh đường dẫn nếu cần

// Helper function để kiểm tra xem một object có khớp với interface AppError không
// (Kiểm tra sự tồn tại và kiểu của thuộc tính 'status')
function isAppError(error: any): error is AppError {
  return error instanceof Error && typeof (error as AppError).status === 'number';
}

export const errorMiddleware = (
  err: Error | AppError | any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('ERROR :', err); // Luôn log lỗi gốc

  let statusCode = 500; // Mặc định là lỗi server
  let status = 'error'; // Mặc định là lỗi không mong muốn
  let message = 'Đã có lỗi xảy ra phía máy chủ.';

  // --- Xử lý các loại lỗi cụ thể ---

  // 1. Lỗi dự kiến (có thuộc tính status)
  if (isAppError(err)) {
    statusCode = err.status ?? 500; // Lấy statusCode từ lỗi hoặc mặc định là 500
    message = err.message;   // Lấy message từ lỗi
    // Giả sử status code < 500 là lỗi 'fail' (client error), >= 500 là 'error' (server error)
    status = statusCode < 500 ? 'fail' : 'error';

    res.status(statusCode).json({
      status: status,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
    return;
  }

  // 2. Lỗi từ Prisma Client
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400; // Mặc định Bad Request
    status = 'fail';
    message = 'Lỗi cơ sở dữ liệu đã xảy ra.';

    switch (err.code) {
      case 'P2002':
        const fields = (err.meta?.target as string[])?.join(', ');
        statusCode = 409; // Conflict
        message = `Dữ liệu đã tồn tại. Trường bị trùng lặp: ${fields}.`;
        break;
      case 'P2003':
        const fieldName = err.meta?.field_name || 'unknown field';
        statusCode = 400; // Hoặc 404
        message = `Thao tác thất bại do ràng buộc khóa ngoại trên trường: ${fieldName}.`;
        break;
      case 'P2014':
        const relation = err.meta?.relation_name || 'unknown relation';
        const model = err.meta?.model_name || 'unknown model';
        message = `Thao tác thất bại. Mối quan hệ '${relation}' bắt buộc trên model '${model}' không được đáp ứng.`;
        break;
      case 'P2025':
        statusCode = 404; // Not Found
        message = `Thao tác thất bại: ${err.meta?.cause || 'Không tìm thấy bản ghi cần thiết.'}`;
        break;
      default:
        message = `Lỗi cơ sở dữ liệu (Code: ${err.code}).`;
    }
    res.status(statusCode).json({ status: status, message });
    return;
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      status: 'fail',
      message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
    return;
  }

  // 3. Lỗi từ Multer
  if (err instanceof multer.MulterError) {
    status = 'fail';
    statusCode = 400;
    message = `Lỗi tải lên tệp: ${err.message}`;
    // (Thêm các kiểm tra err.code cụ thể nếu cần như trước)
    res.status(statusCode).json({ status: status, message });
    return;
  }
  // Bắt lỗi từ fileFilter của Multer
  if (err.message.startsWith('Loại file không hợp lệ')) {
    res.status(400).json({ status: 'fail', message: err.message });
    return;
  }

  // 4. Lỗi từ JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 'fail';
    statusCode = 401; // Unauthorized
    message = err.name === 'TokenExpiredError' ? 'Token xác thực đã hết hạn.' : 'Token xác thực không hợp lệ.';
    res.status(statusCode).json({ status: status, message });
    return;
  }

  // 5. Lỗi Validation từ Zod (kiểm tra cờ isValidationError đã gán)
  if (err.isValidationError === true && err.errors) {
    res.status(err.statusCode || 400).json({ // Mặc định 400 nếu statusCode không có
      status: 'fail',
      message: err.message || 'Dữ liệu không hợp lệ.', // Message chung
      errors: err.errors // Mảng lỗi chi tiết từ Zod đã format
    });
    return;
  }

  // --- Lỗi không xác định (500 Internal Server Error) ---
  // statusCode và message đã có giá trị mặc định ở trên
  res.status(statusCode).json({
    status: status,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
  });
};
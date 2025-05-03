import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import jwt from 'jsonwebtoken';

// Import AppError interface
import { AppError } from '../types/error';

// Helper to check if an object matches the AppError interface
function isAppError(error: any): error is AppError {
  return error instanceof Error && typeof (error as AppError).status === 'number';
}

export const errorMiddleware = (
  err: Error | AppError | any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('ERROR :', err);

  let statusCode = 500;
  let status = 'error';
  let message = 'Đã có lỗi xảy ra phía máy chủ.';

  // 1. Expected errors (with status property)
  if (isAppError(err)) {
    statusCode = err.status ?? 500;
    message = err.message;
    status = statusCode < 500 ? 'fail' : 'error';

    res.status(statusCode).json({
      status: status,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
    return;
  }

  // 2. Prisma Client errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    status = 'fail';
    message = 'Lỗi cơ sở dữ liệu đã xảy ra.';

    switch (err.code) {
      case 'P2002':
        const fields = (err.meta?.target as string[])?.join(', ');
        statusCode = 409;
        message = `Dữ liệu đã tồn tại. Trường bị trùng lặp: ${fields}.`;
        break;
      case 'P2003':
        const fieldName = err.meta?.field_name || 'unknown field';
        statusCode = 400;
        message = `Thao tác thất bại do ràng buộc khóa ngoại trên trường: ${fieldName}.`;
        break;
      case 'P2014':
        const relation = err.meta?.relation_name || 'unknown relation';
        const model = err.meta?.model_name || 'unknown model';
        message = `Thao tác thất bại. Mối quan hệ '${relation}' bắt buộc trên model '${model}' không được đáp ứng.`;
        break;
      case 'P2025':
        statusCode = 404;
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

  // 3. Multer errors
  if (err instanceof multer.MulterError) {
    status = 'fail';
    statusCode = 400;
    message = `Lỗi tải lên tệp: ${err.message}`;
    res.status(statusCode).json({ status: status, message });
    return;
  }
  if (err.message.startsWith('Loại file không hợp lệ')) {
    res.status(400).json({ status: 'fail', message: err.message });
    return;
  }

  // 4. JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 'fail';
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Token xác thực đã hết hạn.' : 'Token xác thực không hợp lệ.';
    res.status(statusCode).json({ status: status, message });
    return;
  }

  // 5. Zod validation errors
  if (err.isValidationError === true && err.errors) {
    res.status(err.statusCode || 400).json({
      status: 'fail',
      message: err.message || 'Dữ liệu không hợp lệ.',
      errors: err.errors
    });
    return;
  }

  // Default error response
  res.status(statusCode).json({
    status: status,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
  });
};
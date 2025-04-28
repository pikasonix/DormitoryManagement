import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod'; // Import AnyZodObject và ZodError

// (Optional) Định nghĩa một class lỗi cụ thể cho validation
// class ValidationError extends Error {
//     statusCode: number;
//     errors: any; // Hoặc dùng type chi tiết hơn từ ZodError['errors']
//     constructor(errors: any) {
//         super("Dữ liệu không hợp lệ."); // Message chung
//         this.name = 'ValidationError';
//         this.statusCode = 400; // Bad Request
//         this.errors = errors; // Mảng lỗi chi tiết từ Zod
//     }
// }


// Middleware factory để tạo middleware validation cho một schema Zod cụ thể
export const validate = (schema: AnyZodObject) => { // Sử dụng AnyZodObject cho rõ ràng hơn
  return async (req: Request, _res: Response, next: NextFunction) => { // Đổi res thành _res vì không dùng trực tiếp
    try {
      // Validate request body bằng schema được cung cấp
      // parseAsync sẽ throw ZodError nếu không hợp lệ
      await schema.parseAsync({
        body: req.body,
        query: req.query, // (Optional) Validate cả query params nếu cần
        params: req.params // (Optional) Validate cả route params nếu cần
      });
      // Nếu thành công, đi tiếp sang middleware/route handler tiếp theo
      next();
    } catch (error: any) {
      // Chỉ bắt lỗi từ Zod
      if (error instanceof ZodError) {
        // --- Cách 1: Tạo lỗi tùy chỉnh (nếu có class ValidationError) ---
        // const validationError = new ValidationError(error.errors);
        // next(validationError);

        // --- Cách 2: Tạo lỗi Error thông thường với thông tin chi tiết ---
        // Format lỗi Zod thành một chuỗi hoặc giữ nguyên mảng errors
        const formattedErrors = error.errors.map(e => ({
          field: e.path.join('.'), // Tên trường bị lỗi (vd: 'body.email')
          message: e.message      // Thông báo lỗi từ Zod
        }));
        const validationError = new Error("Dữ liệu không hợp lệ."); // Message chung
        // Gán thêm thuộc tính để errorMiddleware nhận biết và xử lý
        (validationError as any).statusCode = 400;
        (validationError as any).errors = formattedErrors; // Gán mảng lỗi đã format
        (validationError as any).isValidationError = true; // Đánh dấu là lỗi validation

        next(validationError); // Chuyển lỗi đến global error handler
      } else {
        // Nếu không phải lỗi Zod, chuyển lỗi gốc đi tiếp
        next(error);
      }
    }
  };
};
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
// Helper to check if an object matches the AppError interface
function isAppError(error) {
    return error instanceof Error && typeof error.status === 'number';
}
const errorMiddleware = (err, _req, res, _next) => {
    var _a, _b, _c, _d, _e, _f, _g;
    console.error('ERROR :', err);
    let statusCode = 500;
    let status = 'error';
    let message = 'Đã có lỗi xảy ra phía máy chủ.';
    // 1. Expected errors (with status property)
    if (isAppError(err)) {
        statusCode = (_a = err.status) !== null && _a !== void 0 ? _a : 500;
        message = err.message;
        status = statusCode < 500 ? 'fail' : 'error';
        res.status(statusCode).json(Object.assign({ status: status, message: message }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
        return;
    }
    // 2. Prisma Client errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        statusCode = 400;
        status = 'fail';
        message = 'Lỗi cơ sở dữ liệu đã xảy ra.';
        switch (err.code) {
            case 'P2002':
                const fields = (_c = (_b = err.meta) === null || _b === void 0 ? void 0 : _b.target) === null || _c === void 0 ? void 0 : _c.join(', ');
                statusCode = 409;
                message = `Dữ liệu đã tồn tại. Trường bị trùng lặp: ${fields}.`;
                break;
            case 'P2003':
                const fieldName = ((_d = err.meta) === null || _d === void 0 ? void 0 : _d.field_name) || 'unknown field';
                statusCode = 400;
                message = `Thao tác thất bại do ràng buộc khóa ngoại trên trường: ${fieldName}.`;
                break;
            case 'P2014':
                const relation = ((_e = err.meta) === null || _e === void 0 ? void 0 : _e.relation_name) || 'unknown relation';
                const model = ((_f = err.meta) === null || _f === void 0 ? void 0 : _f.model_name) || 'unknown model';
                message = `Thao tác thất bại. Mối quan hệ '${relation}' bắt buộc trên model '${model}' không được đáp ứng.`;
                break;
            case 'P2025':
                statusCode = 404;
                message = `Thao tác thất bại: ${((_g = err.meta) === null || _g === void 0 ? void 0 : _g.cause) || 'Không tìm thấy bản ghi cần thiết.'}`;
                break;
            default:
                message = `Lỗi cơ sở dữ liệu (Code: ${err.code}).`;
        }
        res.status(statusCode).json({ status: status, message });
        return;
    }
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        res.status(400).json(Object.assign({ status: 'fail', message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.' }, (process.env.NODE_ENV === 'development' && { details: err.message })));
        return;
    }
    // 3. Multer errors
    if (err instanceof multer_1.default.MulterError) {
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
    res.status(statusCode).json(Object.assign({ status: status, message: message }, (process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })));
};
exports.errorMiddleware = errorMiddleware;

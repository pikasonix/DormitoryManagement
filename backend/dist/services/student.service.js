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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class StudentService {
    /**
     * Lấy danh sách tất cả hồ sơ sinh viên với thông tin cơ bản kèm theo.
     * @param options Tùy chọn Prisma findMany (ví dụ: bộ lọc `where`, `orderBy`)
     */
    findAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const students = yield prisma.studentProfile.findMany(Object.assign(Object.assign({}, options), { include: Object.assign({ user: {
                            select: {
                                email: true,
                                isActive: true,
                                avatar: true
                            }
                        }, room: {
                            include: {
                                building: { select: { id: true, name: true } }
                            }
                        } }, ((options === null || options === void 0 ? void 0 : options.include) || {})), orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) || { fullName: 'asc' } }));
                return students;
            }
            catch (error) {
                console.error("[StudentService.findAll] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm một hồ sơ sinh viên bằng ID của nó, bao gồm thông tin chi tiết.
     * @param id ID của StudentProfile
     * @param options Tùy chọn Prisma findUnique (ví dụ: include thêm)
     * @throws Error nếu không tìm thấy
     */
    findOneById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID hồ sơ sinh viên không hợp lệ');
            }
            try {
                const student = yield prisma.studentProfile.findUnique(Object.assign({ where: { id }, include: Object.assign({ user: { select: { id: true, email: true, isActive: true, avatar: true } }, room: { include: { building: true } }, invoices: { orderBy: { issueDate: 'desc' }, take: 5 }, payments: { orderBy: { paymentDate: 'desc' }, take: 5 }, reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } }, vehicleRegistrations: { include: { images: true } }, roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 } }, ((options === null || options === void 0 ? void 0 : options.include) || {})) }, options));
                if (!student) {
                    throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${id}`);
                }
                return student;
            }
            catch (error) {
                console.error(`[StudentService.findOneById] Error fetching student ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${id}`);
                }
                throw error;
            }
        });
    }
}
exports.StudentService = StudentService;

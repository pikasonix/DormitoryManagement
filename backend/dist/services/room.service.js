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
exports.RoomService = void 0;
const client_1 = require("@prisma/client");
class RoomService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    /**
     * Lấy danh sách tất cả các phòng
     */
    findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.room.findMany({
                include: {
                    residents: true
                }
            });
        });
    }
    /**
     * Tìm một phòng theo ID
     */
    findOne(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.room.findUnique({
                where: { id },
                include: {
                    residents: true
                }
            });
        });
    }
    /**
     * Tạo một phòng mới
     */
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.room.create({
                data,
                include: {
                    residents: true
                }
            });
        });
    }
    /**
     * Cập nhật thông tin phòng
     */
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.room.update({
                where: { id },
                data,
                include: {
                    residents: true
                }
            });
        });
    }
    /**
     * Xóa một phòng
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.room.delete({
                where: { id }
            });
        });
    }
}
exports.RoomService = RoomService;

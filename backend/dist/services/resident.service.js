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
exports.ResidentService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ResidentService {
    findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const residents = yield prisma.resident.findMany({
                    include: {
                        documents: true,
                        room: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });
                return residents;
            }
            catch (error) {
                throw error;
            }
        });
    }
    findOne(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const resident = yield prisma.resident.findUnique({
                where: { id },
                include: {
                    documents: true,
                    room: true
                }
            });
            if (!resident) {
                throw new Error('Resident not found');
            }
            return resident;
        });
    }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield prisma.resident.create({
                    data,
                    include: {
                        documents: true,
                        room: true
                    }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.resident.update({
                where: { id },
                data,
                include: {
                    room: true,
                    documents: true
                }
            });
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Delete related documents first
                yield prisma.document.deleteMany({
                    where: { residentId: id }
                });
                // Then delete the resident
                return yield prisma.resident.delete({
                    where: { id }
                });
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.ResidentService = ResidentService;

"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingService = void 0;
const client_1 = require("@prisma/client");
const typedi_1 = require("typedi");
const prisma = new client_1.PrismaClient();
let BuildingService = (() => {
    let _classDecorators = [(0, typedi_1.Service)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BuildingService = _classThis = class {
        /**
         * Tạo một tòa nhà mới và kết nối ảnh nếu có.
         */
        create(buildingData) {
            return __awaiter(this, void 0, void 0, function* () {
                const { imageIds } = buildingData, restData = __rest(buildingData, ["imageIds"]);
                try {
                    const newBuilding = yield prisma.building.create({
                        data: Object.assign(Object.assign({}, restData), { images: imageIds && imageIds.length > 0 ? {
                                connect: imageIds.map(id => ({ id: id }))
                            } : undefined }),
                        include: { images: true }
                    });
                    return newBuilding;
                }
                catch (error) {
                    console.error("[BuildingService.create] Error:", error);
                    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                        throw new Error(`Tên tòa nhà "${restData.name}" đã tồn tại.`);
                    }
                    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                        throw new Error(`Không thể tạo tòa nhà: Một hoặc nhiều ID ảnh không hợp lệ.`);
                    }
                    throw new Error(`Không thể tạo tòa nhà: ${error.message}`);
                }
            });
        }
        /**
         * Lấy danh sách tòa nhà với phân trang, sắp xếp, tìm kiếm và includes.
         */
        getAll(query) {
            return __awaiter(this, void 0, void 0, function* () {
                const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'asc', search = '' } = query;
                const skip = (Number(page) - 1) * Number(limit);
                const allowedSortBy = ['id', 'name', 'address', 'createdAt', 'updatedAt'];
                const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'createdAt';
                const orderBy = { [safeSortBy]: sortOrder === 'desc' ? 'desc' : 'asc' };
                const where = search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { address: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};
                try {
                    const [buildings, total] = yield prisma.$transaction([
                        prisma.building.findMany({
                            where,
                            skip,
                            take: Number(limit),
                            orderBy,
                            include: {
                                images: true,
                                _count: { select: { rooms: true } },
                                staff: {
                                    select: { id: true, fullName: true, position: true },
                                    take: 5
                                },
                            },
                        }),
                        prisma.building.count({ where }),
                    ]);
                    // Biến đổi kết quả để thêm trường totalRooms
                    const transformedBuildings = buildings.map(building => (Object.assign(Object.assign({}, building), { totalRooms: building._count.rooms // Thêm số phòng dựa trên kết quả đếm
                     })));
                    return {
                        items: transformedBuildings,
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / Number(limit))
                    };
                }
                catch (error) {
                    console.error("[BuildingService.getAll] Error:", error);
                    throw new Error(`Không thể lấy danh sách tòa nhà: ${error.message}`);
                }
            });
        }
        /**
         * Lấy thông tin chi tiết một tòa nhà bằng ID.
         */
        getById(id) {
            return __awaiter(this, void 0, void 0, function* () {
                if (isNaN(id)) {
                    throw new Error(`ID tòa nhà không hợp lệ.`);
                }
                try {
                    const building = yield prisma.building.findUnique({
                        where: { id },
                        include: {
                            images: true,
                            rooms: {
                                select: { id: true, number: true, type: true, status: true, capacity: true, actualOccupancy: true },
                                orderBy: { number: 'asc' }
                            },
                            staff: {
                                include: {
                                    user: { select: { id: true, email: true, avatar: true } }
                                }
                            },
                            _count: { select: { rooms: true } }
                        },
                    });
                    if (!building) {
                        throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
                    }
                    // Biến đổi kết quả để thêm trường totalRooms
                    const transformedBuilding = Object.assign(Object.assign({}, building), { totalRooms: building._count.rooms // Thêm số phòng dựa trên kết quả đếm
                     });
                    return transformedBuilding;
                }
                catch (error) {
                    console.error(`[BuildingService.getById] Error fetching building ${id}:`, error);
                    if (error instanceof Error && error.message.includes('Không tìm thấy')) {
                        throw error;
                    }
                    throw new Error(`Không thể lấy thông tin tòa nhà: ${error.message}`);
                }
            });
        }
        /**
         * Cập nhật thông tin tòa nhà và ảnh liên quan.
         */
        update(id, updateData) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                if (isNaN(id)) {
                    throw new Error(`ID tòa nhà không hợp lệ.`);
                }
                // Remove totalRooms field from update data since it's not in the schema
                const _c = updateData, { imageIds, totalRooms } = _c, restUpdateData = __rest(_c, ["imageIds", "totalRooms"]);
                let oldImagePaths = [];
                // Tạo một object dữ liệu cập nhật có cấu trúc rõ ràng
                const dataToUpdate = {};
                // Xử lý các trường một cách rõ ràng và chắc chắn
                dataToUpdate.name = restUpdateData.name;
                dataToUpdate.address = restUpdateData.address;
                // Đặc biệt xử lý riêng trường description 
                // Đảm bảo trường này luôn được gán, kể cả khi là null hoặc chuỗi rỗng
                dataToUpdate.description = restUpdateData.description;
                console.log("Description value to update:", dataToUpdate.description);
                try {
                    const updatedBuilding = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                        const currentBuilding = yield tx.building.findUnique({
                            where: { id },
                            include: { images: { select: { id: true, path: true } } }
                        });
                        if (!currentBuilding) {
                            throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
                        }
                        let imagesUpdate = undefined;
                        if (imageIds !== undefined) {
                            const currentImageIds = currentBuilding.images.map(img => img.id);
                            const newImageIds = Array.isArray(imageIds)
                                ? imageIds.map(imgId => parseInt(imgId)).filter(imgId => !isNaN(imgId))
                                : [];
                            const idsToConnect = newImageIds.filter(imgId => !currentImageIds.includes(imgId));
                            const idsToDisconnect = currentImageIds.filter(imgId => !newImageIds.includes(imgId));
                            oldImagePaths = currentBuilding.images
                                .filter(img => idsToDisconnect.includes(img.id))
                                .map(img => img.path);
                            imagesUpdate = {
                                disconnect: idsToDisconnect.map(imgId => ({ id: imgId })),
                                connect: idsToConnect.map(imgId => ({ id: imgId })),
                            };
                            if (idsToDisconnect.length > 0) {
                                yield tx.media.deleteMany({ where: { id: { in: idsToDisconnect } } });
                            }
                        }
                        const buildingAfterUpdate = yield tx.building.update({
                            where: { id },
                            data: Object.assign(Object.assign({}, dataToUpdate), { images: imagesUpdate }),
                            include: {
                                images: true,
                                _count: { select: { rooms: true } },
                                staff: { select: { id: true, fullName: true } }
                            },
                        });
                        // Thêm trường totalRooms vào kết quả
                        const transformedBuilding = Object.assign(Object.assign({}, buildingAfterUpdate), { totalRooms: buildingAfterUpdate._count.rooms });
                        return transformedBuilding;
                    }));
                    return { building: updatedBuilding, oldImagePaths };
                }
                catch (error) {
                    console.error(`[BuildingService.update] Error updating building ${id}:`, error);
                    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                        if (error.code === 'P2002') {
                            const fields = (_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.join(', ');
                            throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                        }
                        else if (error.code === 'P2025') {
                            throw new Error(`Không tìm thấy tòa nhà (ID: ${id}) hoặc ảnh liên quan để cập nhật.`);
                        }
                    }
                    else if (error instanceof Error && error.message.includes('Không tìm thấy')) {
                        throw error;
                    }
                    throw new Error(`Không thể cập nhật tòa nhà: ${error.message}`);
                }
            });
        }
        /**
         * Xóa một tòa nhà (chỉ khi không còn phòng) và các ảnh liên quan.
         */
        delete(id) {
            return __awaiter(this, void 0, void 0, function* () {
                if (isNaN(id)) {
                    throw new Error(`ID tòa nhà không hợp lệ.`);
                }
                let oldImagePaths = [];
                try {
                    yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                        const buildingToDelete = yield tx.building.findUnique({
                            where: { id },
                            include: {
                                rooms: { select: { id: true } },
                                images: { select: { id: true, path: true } }
                            }
                        });
                        if (!buildingToDelete) {
                            throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
                        }
                        if (buildingToDelete.rooms.length > 0) {
                            throw new Error(`Không thể xóa tòa nhà "${buildingToDelete.name}" vì vẫn còn ${buildingToDelete.rooms.length} phòng thuộc tòa nhà này.`);
                        }
                        const imageIdsToDelete = buildingToDelete.images.map(img => img.id);
                        oldImagePaths = buildingToDelete.images.map(img => img.path);
                        if (imageIdsToDelete.length > 0) {
                            yield tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                        }
                        yield tx.building.delete({
                            where: { id },
                        });
                    }));
                    return { oldImagePaths };
                }
                catch (error) {
                    console.error(`[BuildingService.delete] Error deleting building ${id}:`, error);
                    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                        throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
                    }
                    else if (error instanceof Error && error.message.includes('Không thể xóa tòa nhà')) {
                        throw error;
                    }
                    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                        throw new Error(`Không thể xóa tòa nhà: Vẫn còn dữ liệu liên quan (vd: Nhân viên quản lý).`);
                    }
                    throw new Error(`Không thể xóa tòa nhà: ${error.message}`);
                }
            });
        }
    };
    __setFunctionName(_classThis, "BuildingService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BuildingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BuildingService = _classThis;
})();
exports.BuildingService = BuildingService;

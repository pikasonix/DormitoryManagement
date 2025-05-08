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
exports.AmenityController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AmenityController {
    // Get all amenities
    getAllAmenities(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const search = req.query.search;
                // Build the where clause for search
                const whereClause = {};
                if (search) {
                    whereClause.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ];
                }
                // Execute count and findMany in parallel
                const [totalRecords, amenities] = yield Promise.all([
                    prisma.amenity.count({ where: whereClause }),
                    prisma.amenity.findMany({
                        where: whereClause,
                        orderBy: { name: 'asc' },
                        skip: skip,
                        take: limit
                    })
                ]);
                // Calculate total pages
                const totalPages = Math.ceil(totalRecords / limit);
                res.status(200).json({
                    success: true,
                    data: {
                        amenities,
                        meta: {
                            total: totalRecords,
                            page,
                            limit,
                            totalPages
                        }
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Get a single amenity by ID
    getAmenityById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return next(new Error('Invalid Amenity ID'));
                }
                const amenity = yield prisma.amenity.findUnique({
                    where: { id },
                });
                if (!amenity) {
                    return next(new Error(`Amenity with ID ${id} not found`));
                }
                res.status(200).json({
                    success: true,
                    data: amenity
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Create amenity
    createAmenity(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, description } = req.body;
                if (!name) {
                    return next(new Error('Amenity name is required'));
                }
                const newAmenity = yield prisma.amenity.create({
                    data: {
                        name,
                        description
                    }
                });
                res.status(201).json({
                    success: true,
                    data: newAmenity
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    return next(new Error(`Amenity with name "${req.body.name}" already exists`));
                }
                next(error);
            }
        });
    }
    // Update amenity
    updateAmenity(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return next(new Error('Invalid Amenity ID'));
                }
                const { name, description } = req.body;
                if (!name) {
                    return next(new Error('Amenity name is required'));
                }
                const updatedAmenity = yield prisma.amenity.update({
                    where: { id },
                    data: {
                        name,
                        description
                    }
                });
                res.status(200).json({
                    success: true,
                    data: updatedAmenity
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        return next(new Error(`Amenity with name "${req.body.name}" already exists`));
                    }
                    else if (error.code === 'P2025') {
                        return next(new Error(`Amenity with ID ${req.params.id} not found`));
                    }
                }
                next(error);
            }
        });
    }
    // Delete amenity
    deleteAmenity(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return next(new Error('Invalid Amenity ID'));
                }
                yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    yield tx.roomAmenity.deleteMany({
                        where: { amenityId: id }
                    });
                    yield tx.amenity.delete({
                        where: { id }
                    });
                }));
                res.status(200).json({
                    success: true,
                    message: 'Amenity deleted successfully',
                    data: null
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Amenity with ID ${req.params.id} not found`));
                }
                next(error);
            }
        });
    }
}
exports.AmenityController = AmenityController;

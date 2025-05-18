import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class AmenityController {

  // Get all amenities
  async getAllAmenities(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search as string;

      // Build the where clause for search
      const whereClause: Prisma.AmenityWhereInput = {};
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Execute count and findMany in parallel
      const [totalRecords, amenities] = await Promise.all([
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
    } catch (error) {
      next(error);
    }
  }

  // Get a single amenity by ID
  async getAmenityById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('Invalid Amenity ID'));
      }

      const amenity = await prisma.amenity.findUnique({
        where: { id },
      });

      if (!amenity) {
        return next(new Error(`Amenity with ID ${id} not found`));
      }

      res.status(200).json({
        success: true,
        data: amenity
      });
    } catch (error) {
      next(error);
    }
  }

  // Create amenity
  async createAmenity(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, url } = req.body;

      if (!name) {
        return next(new Error('Amenity name is required'));
      }

      const newAmenity = await prisma.amenity.create({
        data: {
          name,
          description,
          url
        }
      });

      res.status(201).json({
        success: true,
        data: newAmenity
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return next(new Error(`Amenity with name "${req.body.name}" already exists`));
      }
      next(error);
    }
  }

  // Update amenity
  async updateAmenity(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('Invalid Amenity ID'));
      }
      const { name, description, url } = req.body;

      if (!name) {
        return next(new Error('Amenity name is required'));
      }

      const updatedAmenity = await prisma.amenity.update({
        where: { id },
        data: {
          name,
          description,
          url
        }
      });

      res.status(200).json({
        success: true,
        data: updatedAmenity
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return next(new Error(`Amenity with name "${req.body.name}" already exists`));
        } else if (error.code === 'P2025') {
          return next(new Error(`Amenity with ID ${req.params.id} not found`));
        }
      }
      next(error);
    }
  }

  // Delete amenity
  async deleteAmenity(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('Invalid Amenity ID'));
      }

      await prisma.$transaction(async (tx) => {
        await tx.roomAmenity.deleteMany({
          where: { amenityId: id }
        });
        await tx.amenity.delete({
          where: { id }
        });
      });

      res.status(200).json({
        success: true,
        message: 'Amenity deleted successfully',
        data: null
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Amenity with ID ${req.params.id} not found`));
      }
      next(error);
    }
  }
}
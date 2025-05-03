import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class AmenityController {

  // Get all amenities
  async getAllAmenities(_req: Request, res: Response, next: NextFunction) {
    try {
      const amenities = await prisma.amenity.findMany({
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        status: 'success',
        results: amenities.length,
        data: amenities
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
        status: 'success',
        data: amenity
      });
    } catch (error) {
      next(error);
    }
  }

  // Create amenity
  async createAmenity(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return next(new Error('Amenity name is required'));
      }

      const newAmenity = await prisma.amenity.create({
        data: {
          name,
          description
        }
      });

      res.status(201).json({
        status: 'success',
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
      const { name, description } = req.body;

      if (!name) {
        return next(new Error('Amenity name is required'));
      }

      const updatedAmenity = await prisma.amenity.update({
        where: { id },
        data: {
          name,
          description
        }
      });

      res.status(200).json({
        status: 'success',
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
        status: 'success',
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
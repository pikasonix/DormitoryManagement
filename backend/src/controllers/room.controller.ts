import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, RoomStatus, RoomType, FeeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { deleteFile } from '../services/file.service';

const prisma = new PrismaClient();

export class RoomController {

  async getAllRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const { buildingId, status, type, hasVacancy, page, limit, search } = req.query;

      const whereClause: Prisma.RoomWhereInput = {};
      if (buildingId) whereClause.buildingId = parseInt(buildingId as string);
      if (status) whereClause.status = status as RoomStatus;
      if (type) whereClause.type = type as RoomType;
      if (search) {
        whereClause.number = { contains: search as string };
      }

      if (hasVacancy === 'true') {
        whereClause.status = { not: RoomStatus.UNDER_MAINTENANCE };
        whereClause.AND = [
          ...(whereClause.AND as Prisma.RoomWhereInput[] || []),
          { capacity: { gt: prisma.room.fields.actualOccupancy } }
        ];
      } else if (hasVacancy === 'false') {
        whereClause.OR = [
          { status: RoomStatus.FULL },
          { status: RoomStatus.UNDER_MAINTENANCE },
          { capacity: { lte: prisma.room.fields.actualOccupancy } }
        ];
      }

      // Pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;

      // Execute count and findMany in parallel to improve performance
      const [totalRecords, rooms] = await Promise.all([
        prisma.room.count({ where: whereClause }),
        prisma.room.findMany({
          where: whereClause,
          include: {
            building: { select: { id: true, name: true } },
            images: true,
            residents: {
              select: {
                id: true,
                fullName: true,
                studentId: true,
                user: { select: { avatar: true } }
              }
            },
            amenities: {
              include: {
                amenity: true
              }
            }
          },
          orderBy: [
            { building: { name: 'asc' } },
            { floor: 'asc' },
            { number: 'asc' }
          ],
          skip: skip,
          take: limitNum
        })
      ]);

      res.status(200).json({
        status: 'success',
        results: rooms.length,
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum),
        data: rooms
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phòng:', error);
      next(error);
    }
  }

  async getRoomById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('ID phòng không hợp lệ'));
      }

      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          building: true,
          images: true,
          residents: {
            include: { user: { select: { id: true, email: true, isActive: true, avatar: true } } }
          },
          amenities: { include: { amenity: true } },
          maintenances: { orderBy: { reportDate: 'desc' }, take: 5, include: { reportedBy: true, assignedTo: true, images: true } },
          meterReadings: { orderBy: { readingDate: 'desc' }, take: 6 },
          invoices: { where: { roomId: id }, orderBy: { issueDate: 'desc' }, take: 3 }
        }
      });

      if (!room) {
        return next(new Error(`Không tìm thấy phòng với ID ${id}`));
      }

      res.status(200).json({
        status: 'success',
        data: room
      });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết phòng:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Không tìm thấy phòng với ID ${req.params.id}`));
      }
      next(error);
    }
  }

  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        buildingId, number, type, capacity, floor, status, description,
        roomFee, amenities, imageIds
      } = req.body;

      if (!buildingId || !number || !type || !capacity || !floor) {
        return next(new Error('Thiếu trường bắt buộc: buildingId, number, type, capacity, floor'));
      }
      if (!Object.values(RoomType).includes(type as RoomType)) {
        return next(new Error(`Loại phòng không hợp lệ: ${type}`));
      }
      if (status && !Object.values(RoomStatus).includes(status as RoomStatus)) {
        return next(new Error(`Trạng thái phòng không hợp lệ: ${status}`));
      }
      const existingRoom = await prisma.room.findUnique({ where: { buildingId_number: { buildingId: parseInt(buildingId), number } } });
      if (existingRoom) {
        return next(new Error(`Số phòng "${number}" đã tồn tại trong tòa nhà này.`));
      }

      const newRoom = await prisma.room.create({
        data: {
          building: { connect: { id: parseInt(buildingId) } },
          number,
          type: type as RoomType,
          capacity: parseInt(capacity),
          floor: parseInt(floor),
          status: (status as RoomStatus) || RoomStatus.AVAILABLE,
          description: description || null,
          roomFee: roomFee ? new Decimal(roomFee) : new Decimal(0),
          actualOccupancy: 0,
          amenities: amenities && Array.isArray(amenities) && amenities.length > 0 ? {
            create: amenities.map((am: any) => ({
              amenity: { connect: { id: parseInt(am.amenityId) } },
              quantity: am.quantity ? parseInt(am.quantity) : 1,
              notes: am.notes || null
            }))
          } : undefined,
          images: imageIds && Array.isArray(imageIds) && imageIds.length > 0 ? {
            connect: imageIds.map((id: number) => ({ id: parseInt(id as any) }))
          } : undefined
        },
        include: {
          building: true,
          images: true,
          amenities: { include: { amenity: true } }
        }
      });

      res.status(201).json({
        status: 'success',
        data: newRoom
      });
    } catch (error: any) {
      console.error('Lỗi khi tạo phòng:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error('Không tìm thấy tòa nhà hoặc tiện nghi được chỉ định.'));
      }
      next(error);
    }
  }

  async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('ID phòng không hợp lệ'));
      }

      const {
        number, type, capacity, floor, status, description,
        roomFee, amenities, imageIds
      } = req.body;

      if (type && !Object.values(RoomType).includes(type as RoomType)) {
        return next(new Error(`Loại phòng không hợp lệ: ${type}`));
      }
      if (status && !Object.values(RoomStatus).includes(status as RoomStatus)) {
        return next(new Error(`Trạng thái phòng không hợp lệ: ${status}`));
      }
      if (number) {
        const currentRoom = await prisma.room.findUnique({ where: { id }, select: { buildingId: true } });
        if (!currentRoom) return next(new Error(`Không tìm thấy phòng với ID ${id}`));
        const existingRoom = await prisma.room.findUnique({ where: { buildingId_number: { buildingId: currentRoom.buildingId, number } } });
        if (existingRoom && existingRoom.id !== id) {
          return next(new Error(`Số phòng "${number}" đã tồn tại trong tòa nhà này.`));
        }
      }

      let oldImagePaths: string[] = [];

      const updatedRoom = await prisma.$transaction(async (tx) => {
        let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
        if (imageIds !== undefined) {
          const currentImages = await tx.room.findUnique({
            where: { id },
            select: { images: { select: { id: true, path: true } } }
          });
          const currentImageIds = currentImages?.images.map(img => img.id) || [];
          const newImageIds = Array.isArray(imageIds) ? imageIds.map(id => parseInt(id as any)).filter(id => !isNaN(id)) : [];

          const idsToConnect = newImageIds.filter(id => !currentImageIds.includes(id));
          const idsToDisconnect = currentImageIds.filter(id => !newImageIds.includes(id));

          oldImagePaths = currentImages?.images.filter(img => idsToDisconnect.includes(img.id)).map(img => img.path) || [];

          imagesUpdate = {
            disconnect: idsToDisconnect.map(id => ({ id })),
            connect: idsToConnect.map(id => ({ id })),
          };
        }

        let amenitiesUpdate: Prisma.RoomAmenityUpdateManyWithoutRoomNestedInput | undefined = undefined;
        if (amenities !== undefined) {
          const newAmenitiesData = Array.isArray(amenities) ? amenities.map((am: any) => ({
            amenityId: parseInt(am.amenityId),
            quantity: am.quantity ? parseInt(am.quantity) : 1,
            notes: am.notes || null
          })).filter(am => !isNaN(am.amenityId)) : [];

          amenitiesUpdate = {
            deleteMany: {},
            create: newAmenitiesData
          };
        }

        const roomUpdateData: Prisma.RoomUpdateInput = {
          number: number || undefined,
          type: type as RoomType,
          capacity: capacity ? parseInt(capacity) : undefined,
          floor: floor ? parseInt(floor) : undefined,
          status: status as RoomStatus,
          description: description,
          roomFee: roomFee !== undefined ? new Decimal(roomFee) : undefined,
          images: imagesUpdate,
          amenities: amenitiesUpdate
        };

        const roomAfterUpdate = await tx.room.update({
          where: { id },
          data: roomUpdateData,
          include: {
            building: true,
            images: true,
            amenities: { include: { amenity: true } }
          }
        });

        const mediaIdsToDelete = oldImagePaths.length > 0
          ? (await tx.media.findMany({ where: { path: { in: oldImagePaths } }, select: { id: true } })).map(m => m.id)
          : [];

        if (mediaIdsToDelete.length > 0) {
          await tx.media.deleteMany({ where: { id: { in: mediaIdsToDelete } } });
        }

        return roomAfterUpdate;
      });

      if (oldImagePaths.length > 0 && typeof deleteFile === 'function') {
        await Promise.allSettled(oldImagePaths.map(filePath => deleteFile(filePath)));
      } else if (oldImagePaths.length > 0) {
        console.warn(`[RoomController] deleteFile function not available, cannot delete old room images.`);
      }

      res.status(200).json({
        status: 'success',
        data: updatedRoom
      });
    } catch (error: any) {
      console.error('Lỗi khi cập nhật phòng:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return next(new Error(`Số phòng "${req.body.number}" đã tồn tại trong tòa nhà này.`));
        } else if (error.code === 'P2025') {
          return next(new Error(`Không tìm thấy phòng hoặc tài nguyên liên quan (ID: ${req.params.id})`));
        }
      }
      next(error);
    }
  }

  async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('ID phòng không hợp lệ'));
      }

      let imagePathsToDelete: string[] = [];

      await prisma.$transaction(async (tx) => {
        const roomToDelete = await tx.room.findUnique({
          where: { id },
          include: {
            images: { select: { id: true, path: true } },
            residents: { select: { id: true } }
          }
        });

        if (!roomToDelete) {
          throw new Error(`Không tìm thấy phòng với ID ${id}`);
        }

        imagePathsToDelete = roomToDelete.images.map(img => img.path);

        await tx.roomAmenity.deleteMany({ where: { roomId: id } });
        await tx.utilityMeterReading.deleteMany({ where: { roomId: id } });
        await tx.invoice.deleteMany({ where: { roomId: id } });
        await tx.maintenance.deleteMany({ where: { roomId: id } });

        const residentIds = roomToDelete.residents.map(r => r.id);
        if (residentIds.length > 0) {
          await tx.studentProfile.updateMany({
            where: { id: { in: residentIds } },
            data: { roomId: null }
          });
        }

        const imageIdsToDelete = roomToDelete.images.map(img => img.id);
        if (imageIdsToDelete.length > 0) {
          await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
        }

        await tx.room.delete({
          where: { id }
        });
      });

      if (imagePathsToDelete.length > 0 && typeof deleteFile === 'function') {
        await Promise.allSettled(imagePathsToDelete.map(filePath => deleteFile(filePath)));
      } else if (imagePathsToDelete.length > 0) {
        console.warn(`[RoomController] deleteFile function not available, cannot delete room images.`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Phòng đã được xóa thành công',
        data: null
      });
    } catch (error: any) {
      console.error('Lỗi khi xóa phòng:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return next(new Error(`Không tìm thấy phòng hoặc tài nguyên liên quan (ID: ${req.params.id})`));
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return next(new Error(`Không thể xóa phòng vì vẫn còn dữ liệu liên quan (vd: sinh viên, hóa đơn...). Vui lòng kiểm tra lại.`));
      }

      next(error);
    }
  }
}
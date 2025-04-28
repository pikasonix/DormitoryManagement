import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, RoomStatus, RoomType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { deleteFile } from '../services/file.service'; // Import hàm xóa file

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

export class RoomController {

  // Lấy danh sách tất cả các phòng (có thể lọc)
  async getAllRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const { buildingId, status, type, hasVacancy } = req.query;

      // --- Xây dựng điều kiện lọc (Where Clause) ---
      const whereClause: Prisma.RoomWhereInput = {};
      if (buildingId) whereClause.buildingId = parseInt(buildingId as string);
      if (status) whereClause.status = status as RoomStatus;
      if (type) whereClause.type = type as RoomType;
      if (hasVacancy === 'true') {
        whereClause.status = { not: RoomStatus.UNDER_MAINTENANCE };
        // Sử dụng AND để kết hợp điều kiện: phải có capacity > actualOccupancy
        whereClause.AND = [
          ...(whereClause.AND as Prisma.RoomWhereInput[] || []), // Giữ lại các điều kiện AND cũ nếu có
          { capacity: { gt: prisma.room.fields.actualOccupancy } } // Dùng tên field trong Prisma
        ];
      } else if (hasVacancy === 'false') {
        // Tìm phòng không còn chỗ HOẶC đang bảo trì
        whereClause.OR = [
          { status: RoomStatus.FULL },
          { status: RoomStatus.UNDER_MAINTENANCE },
          { capacity: { lte: prisma.room.fields.actualOccupancy } } // Dùng tên field
        ];
      }
      // --- Kết thúc xây dựng điều kiện lọc ---


      const rooms = await prisma.room.findMany({
        where: whereClause,
        include: {
          building: { select: { id: true, name: true } }, // Thông tin tòa nhà
          images: true, // Lấy danh sách ảnh phòng
          residents: { // Đổi tên từ residents -> studentProfile
            select: { // Chỉ lấy thông tin cần thiết của sinh viên
              id: true,
              fullName: true,
              studentId: true,
              user: { select: { avatar: true } } // Lấy avatar nếu cần
            }
          },
          amenities: { // Lấy tiện nghi và thông tin chi tiết amenity
            include: {
              amenity: true
            }
          }
        },
        orderBy: [ // Sắp xếp theo tòa nhà, tầng, số phòng
          { building: { name: 'asc' } },
          { floor: 'asc' },
          { number: 'asc' }
        ]
      });

      res.status(200).json({
        status: 'success',
        results: rooms.length,
        data: rooms
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phòng:', error);
      next(error);
    }
  }

  // Lấy thông tin chi tiết một phòng bằng ID
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
          residents: { // Đổi tên include và select user/avatar
            include: { user: { select: { id: true, email: true, isActive: true, avatar: true } } }
          },
          amenities: { include: { amenity: true } },
          // Include thêm các thông tin liên quan khác nếu cần cho trang chi tiết phòng
          maintenances: { orderBy: { reportDate: 'desc' }, take: 5, include: { reportedBy: true, assignedTo: true, images: true } },
          meterReadings: { orderBy: { readingDate: 'desc' }, take: 6 },
          invoices: { where: { roomId: id }, orderBy: { issueDate: 'desc' }, take: 3 } // Chỉ lấy hóa đơn của phòng này
        }
      });

      if (!room) {
        return next(new Error(`Không tìm thấy phòng với ID ${id}`)); // Hoặc AppError 404
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

  // Tạo phòng mới
  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        buildingId, number, type, capacity, floor, status, price, description,
        amenities, // Mảng [{ amenityId: number, quantity?: number, notes?: string }]
        imageIds   // Mảng [number] - các ID của Media đã upload
      } = req.body;

      // --- Validation cơ bản ---
      if (!buildingId || !number || !type || !capacity || !floor || price === undefined || price === null) {
        return next(new Error('Thiếu trường bắt buộc: buildingId, number, type, capacity, floor, price'));
      }
      // Thêm validation cho type, status, number/buildingId unique...
      if (!Object.values(RoomType).includes(type as RoomType)) {
        return next(new Error(`Loại phòng không hợp lệ: ${type}`));
      }
      if (status && !Object.values(RoomStatus).includes(status as RoomStatus)) {
        return next(new Error(`Trạng thái phòng không hợp lệ: ${status}`));
      }
      const existingRoom = await prisma.room.findUnique({ where: { buildingId_number: { buildingId: parseInt(buildingId), number } } });
      if (existingRoom) {
        return next(new Error(`Số phòng "${number}" đã tồn tại trong tòa nhà này.`)); // Hoặc AppError 409
      }
      // --- Kết thúc Validation ---

      const newRoom = await prisma.room.create({
        data: {
          building: { connect: { id: parseInt(buildingId) } },
          number,
          type: type as RoomType,
          capacity: parseInt(capacity),
          floor: parseInt(floor),
          status: (status as RoomStatus) || RoomStatus.AVAILABLE, // Mặc định là AVAILABLE
          price: new Decimal(price), // Đảm bảo là Decimal
          description: description || null,
          actualOccupancy: 0, // Phòng mới chưa có ai ở
          // Kết nối tiện nghi
          amenities: amenities && Array.isArray(amenities) && amenities.length > 0 ? {
            create: amenities.map((am: any) => ({
              amenity: { connect: { id: parseInt(am.amenityId) } },
              quantity: am.quantity ? parseInt(am.quantity) : 1,
              notes: am.notes || null
            }))
          } : undefined,
          // Kết nối ảnh
          images: imageIds && Array.isArray(imageIds) && imageIds.length > 0 ? {
            connect: imageIds.map((id: number) => ({ id: parseInt(id as any) })) // ParseInt để đảm bảo là số
          } : undefined
        },
        include: { // Include để trả về response đầy đủ
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
        // Lỗi không tìm thấy building hoặc amenity để connect
        return next(new Error('Không tìm thấy tòa nhà hoặc tiện nghi được chỉ định.')); // Hoặc AppError 404
      }
      next(error);
    }
  }

  // Cập nhật thông tin phòng
  async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('ID phòng không hợp lệ'));
      }

      const {
        number, type, capacity, floor, status, price, description,
        amenities, // Mảng [{ amenityId: number, quantity?: number, notes?: string }] - Sẽ THAY THẾ tiện nghi cũ
        imageIds   // Mảng [number] - Sẽ THAY THẾ ảnh cũ
      } = req.body;

      // --- Validation ---
      if (type && !Object.values(RoomType).includes(type as RoomType)) {
        return next(new Error(`Loại phòng không hợp lệ: ${type}`));
      }
      if (status && !Object.values(RoomStatus).includes(status as RoomStatus)) {
        return next(new Error(`Trạng thái phòng không hợp lệ: ${status}`));
      }
      // Kiểm tra unique số phòng nếu number thay đổi (cần buildingId)
      if (number) {
        const currentRoom = await prisma.room.findUnique({ where: { id }, select: { buildingId: true } });
        if (!currentRoom) return next(new Error(`Không tìm thấy phòng với ID ${id}`));
        const existingRoom = await prisma.room.findUnique({ where: { buildingId_number: { buildingId: currentRoom.buildingId, number } } });
        if (existingRoom && existingRoom.id !== id) {
          return next(new Error(`Số phòng "${number}" đã tồn tại trong tòa nhà này.`)); // Hoặc AppError 409
        }
      }
      // --- Kết thúc Validation ---


      let oldImagePaths: string[] = []; // Lưu trữ đường dẫn ảnh cũ cần xóa

      // *** SỬ DỤNG TRANSACTION ***
      const updatedRoom = await prisma.$transaction(async (tx) => {
        // --- Xử lý cập nhật Ảnh ---
        let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
        if (imageIds !== undefined) { // Chỉ xử lý nếu imageIds được gửi lên (có thể là mảng rỗng để xóa hết)
          const currentImages = await tx.room.findUnique({
            where: { id },
            select: { images: { select: { id: true, path: true } } }
          });
          const currentImageIds = currentImages?.images.map(img => img.id) || [];
          const newImageIds = Array.isArray(imageIds) ? imageIds.map(id => parseInt(id as any)).filter(id => !isNaN(id)) : [];

          const idsToConnect = newImageIds.filter(id => !currentImageIds.includes(id));
          const idsToDisconnect = currentImageIds.filter(id => !newImageIds.includes(id));

          // Lưu lại path của ảnh bị disconnect để xóa file vật lý
          oldImagePaths = currentImages?.images.filter(img => idsToDisconnect.includes(img.id)).map(img => img.path) || [];


          imagesUpdate = {
            disconnect: idsToDisconnect.map(id => ({ id })),
            connect: idsToConnect.map(id => ({ id })),
          };
        }
        // --- Kết thúc xử lý Ảnh ---


        // --- Xử lý cập nhật Tiện nghi (Xóa cũ, tạo mới) ---
        let amenitiesUpdate: Prisma.RoomAmenityUpdateManyWithoutRoomNestedInput | undefined = undefined;
        if (amenities !== undefined) { // Chỉ xử lý nếu amenities được gửi lên (có thể là mảng rỗng)
          const newAmenitiesData = Array.isArray(amenities) ? amenities.map((am: any) => ({
            amenityId: parseInt(am.amenityId),
            quantity: am.quantity ? parseInt(am.quantity) : 1,
            notes: am.notes || null
          })).filter(am => !isNaN(am.amenityId)) : []; // Lọc amenityId không hợp lệ

          amenitiesUpdate = {
            deleteMany: {}, // Xóa hết RoomAmenity cũ của phòng này
            create: newAmenitiesData // Tạo lại dựa trên mảng mới
          };
        }
        // --- Kết thúc xử lý Tiện nghi ---


        // --- Cập nhật các trường thông tin cơ bản của Phòng ---
        const roomUpdateData: Prisma.RoomUpdateInput = {
          number: number || undefined,
          type: type as RoomType,
          capacity: capacity ? parseInt(capacity) : undefined,
          floor: floor ? parseInt(floor) : undefined,
          status: status as RoomStatus,
          price: price !== undefined && price !== null ? new Decimal(price) : undefined,
          description: description,
          // Áp dụng cập nhật ảnh và tiện nghi
          images: imagesUpdate,
          amenities: amenitiesUpdate
        };
        // --- Kết thúc chuẩn bị ---


        // Thực hiện cập nhật phòng
        const roomAfterUpdate = await tx.room.update({
          where: { id },
          data: roomUpdateData,
          include: { // Include để trả về response
            building: true,
            images: true,
            amenities: { include: { amenity: true } }
          }
        });

        // Xóa các media record của ảnh bị disconnect
        const mediaIdsToDelete = oldImagePaths.length > 0
          ? (await tx.media.findMany({ where: { path: { in: oldImagePaths } }, select: { id: true } })).map(m => m.id)
          : [];

        if (mediaIdsToDelete.length > 0) {
          await tx.media.deleteMany({ where: { id: { in: mediaIdsToDelete } } });
        }


        return roomAfterUpdate; // Trả về phòng đã cập nhật
      });
      // *** KẾT THÚC TRANSACTION ***


      // Xóa file ảnh vật lý cũ SAU KHI transaction thành công
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
        if (error.code === 'P2002') { // Unique constraint (vd: buildingId_number)
          return next(new Error(`Số phòng "${req.body.number}" đã tồn tại trong tòa nhà này.`));
        } else if (error.code === 'P2025') { // Record not found (phòng, building, amenity, media)
          return next(new Error(`Không tìm thấy phòng hoặc tài nguyên liên quan (ID: ${req.params.id})`));
        }
      }
      next(error);
    }
  }

  // Xóa phòng
  async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new Error('ID phòng không hợp lệ'));
      }

      let imagePathsToDelete: string[] = []; // Lưu đường dẫn ảnh cần xóa file

      // *** SỬ DỤNG TRANSACTION ***
      await prisma.$transaction(async (tx) => {
        // 1. Tìm phòng và các thông tin liên quan cần xóa/cập nhật
        const roomToDelete = await tx.room.findUnique({
          where: { id },
          include: {
            images: { select: { id: true, path: true } }, // Lấy ảnh để xóa
            residents: { select: { id: true } } // Lấy sinh viên đang ở để cập nhật roomId
            // Lấy các ID khác cần xóa trước (nếu không có cascade)
            // roomAmenities: { select: { amenityId: true } }, // RoomAmenity sẽ bị xóa trực tiếp
            // meterReadings: { select: { id: true } },
            // invoices: { select: { id: true } }, // Chỉ invoice của phòng
            // maintenances: { select: { id: true } },
            // fromTransfers: { select: { id: true } },
            // toTransfers: { select: { id: true } },
          }
        });

        if (!roomToDelete) {
          throw new Error(`Không tìm thấy phòng với ID ${id}`); // Rollback
        }

        imagePathsToDelete = roomToDelete.images.map(img => img.path); // Lưu path ảnh

        // 2. Xóa các bản ghi phụ thuộc (nếu không có cascade delete mạnh mẽ)
        // Hoặc cập nhật các bản ghi liên quan
        await tx.roomAmenity.deleteMany({ where: { roomId: id } });
        await tx.utilityMeterReading.deleteMany({ where: { roomId: id } });
        await tx.invoice.deleteMany({ where: { roomId: id } }); // Xóa hóa đơn của phòng
        await tx.maintenance.deleteMany({ where: { roomId: id } });
        // Cập nhật yêu cầu chuyển phòng liên quan đến phòng này thành null hoặc xóa?
        // Nên cân nhắc logic nghiệp vụ ở đây. Tạm thời không xóa Transfer.
        // await tx.roomTransfer.deleteMany({ where: { OR: [{ fromRoomId: id }, { toRoomId: id }] } });

        // Cập nhật roomId của sinh viên đang ở thành null
        const residentIds = roomToDelete.residents.map(r => r.id);
        if (residentIds.length > 0) {
          await tx.studentProfile.updateMany({
            where: { id: { in: residentIds } },
            data: { roomId: null }
          });
        }


        // 3. Xóa các bản ghi Media của ảnh phòng
        const imageIdsToDelete = roomToDelete.images.map(img => img.id);
        if (imageIdsToDelete.length > 0) {
          // Ngắt kết nối trước khi xóa Media (dù không cần thiết nếu xóa ngay sau đó)
          // await tx.room.update({ where: { id }, data: { images: { disconnect: imageIdsToDelete.map(imgId => ({ id: imgId })) } } });
          await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
        }


        // 4. Xóa Phòng
        await tx.room.delete({
          where: { id }
        });

        // Transaction thành công
      });
      // *** KẾT THÚC TRANSACTION ***


      // Xóa file ảnh vật lý SAU KHI transaction thành công
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
      // Xử lý lỗi Foreign Key nếu có sinh viên chưa được chuyển đi? (P2003, P2014)
      // Lỗi P2003: Foreign key constraint failed on the field: `...`
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return next(new Error(`Không thể xóa phòng vì vẫn còn dữ liệu liên quan (vd: sinh viên, hóa đơn...). Vui lòng kiểm tra lại.`));
      }

      next(error);
    }
  }
}
import { Request, Response, NextFunction } from 'express'; // Thêm NextFunction
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma cho error types

// Lưu ý: Nên sử dụng một instance PrismaClient duy nhất (singleton)
const prisma = new PrismaClient();

// Đổi tên class
export class AmenityController {

  // Get all amenities
  async getAllAmenities(_req: Request, res: Response, next: NextFunction) { // Đổi tên hàm, thêm next
    try {
      // Đổi prisma.facility thành prisma.amenity
      // Loại bỏ include không còn phù hợp (bookings, maintenanceLogs)
      const amenities = await prisma.amenity.findMany({
        orderBy: { name: 'asc' },
        // Optional: include các phòng đang sử dụng tiện nghi này nếu cần
        // include: {
        //   rooms: { // Quan hệ qua RoomAmenity
        //     select: {
        //       room: { // Lấy thông tin phòng
        //         select: { id: true, number: true, building: { select: { name: true } } }
        //       },
        //       quantity: true // Lấy số lượng trong phòng đó
        //     }
        //   }
        // }
      });

      res.status(200).json({ // Chuẩn hóa response
        status: 'success',
        results: amenities.length,
        data: amenities
      });
    } catch (error) {
      // Chuyển lỗi cho global error handler
      next(error);
    }
  }

  // Get a single amenity by ID
  async getAmenityById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        // Sử dụng return next() để thoát hàm và gửi lỗi
        return next(new Error('Invalid Amenity ID')); // Hoặc dùng AppError nếu bạn đã định nghĩa
      }

      const amenity = await prisma.amenity.findUnique({
        where: { id },
        // Optional: include phòng nếu cần xem chi tiết
        // include: { rooms: { include: { room: true } } }
      });

      if (!amenity) {
        return next(new Error(`Amenity with ID ${id} not found`)); // Hoặc dùng AppError(..., 404)
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
  async createAmenity(req: Request, res: Response, next: NextFunction) { // Đổi tên hàm, thêm next
    try {
      // Chỉ lấy các trường có trong model Amenity mới
      const { name, description } = req.body;

      if (!name) {
        return next(new Error('Amenity name is required')); // Hoặc AppError(..., 400)
      }

      // Đổi prisma.facility thành prisma.amenity
      const newAmenity = await prisma.amenity.create({
        data: {
          name,
          description // description có thể là optional tùy schema của bạn
        }
      });

      res.status(201).json({ // Chuẩn hóa response
        status: 'success',
        data: newAmenity
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Handle unique constraint violation (tên tiện nghi có thể là unique)
        return next(new Error(`Amenity with name "${req.body.name}" already exists`)); // Hoặc AppError(..., 409)
      }
      // Chuyển lỗi khác cho global error handler
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

      if (!name) { // Tên thường là bắt buộc khi cập nhật
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
          return next(new Error(`Amenity with name "${req.body.name}" already exists`)); // Hoặc AppError(..., 409)
        } else if (error.code === 'P2025') {
          // Lỗi P2025 nghĩa là bản ghi cần update không tìm thấy
          return next(new Error(`Amenity with ID ${req.params.id} not found`)); // Hoặc AppError(..., 404)
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

      // Cần xử lý các bản ghi RoomAmenity liên quan trước khi xóa Amenity
      // Cách tốt nhất là dùng transaction
      await prisma.$transaction(async (tx) => {
        // 1. Xóa tất cả các liên kết trong RoomAmenity
        await tx.roomAmenity.deleteMany({
          where: { amenityId: id }
        });
        // 2. Xóa Amenity
        await tx.amenity.delete({
          where: { id }
        });
      });

      res.status(200).json({ // Trả về 200 hoặc 204 No Content đều được
        status: 'success',
        message: 'Amenity deleted successfully',
        data: null // Hoặc không cần data
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // Lỗi P2025 nghĩa là bản ghi cần xóa không tìm thấy
        return next(new Error(`Amenity with ID ${req.params.id} not found`)); // Hoặc AppError(..., 404)
      }
      next(error);
    }
  }

  // --- Các hàm createBooking và createMaintenanceLog đã bị XÓA ---
  // Logic quản lý RoomAmenity (thêm/xóa amenity khỏi phòng) nên nằm ở RoomController.
}
import { Request, Response, NextFunction } from 'express'; // Thêm NextFunction
import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../services/dashboard.service';

// Lưu ý: Nên sử dụng một instance PrismaClient duy nhất (singleton)
// được khởi tạo ở một file khác (vd: src/utils/prisma.ts) và import vào đây.
const prisma = new PrismaClient();
const dashboardService = new DashboardService();

export class DashboardController {
  // Lấy các số liệu thống kê tổng quan
  async getStats(_req: Request, res: Response, next: NextFunction) { // Thêm next
    try {
      // Sử dụng service để lấy dữ liệu thống kê
      const stats = await dashboardService.getStats();

      // Lấy thêm thông tin về số phòng trống
      const availableRooms = await prisma.room.count({
        where: { status: 'AVAILABLE' }
      });

      // Lấy thông tin về hóa đơn chưa thanh toán
      const unpaidInvoices = await prisma.invoice.count({
        where: { status: 'UNPAID' }
      });

      res.status(200).json({ // Thêm status code và chuẩn hóa response
        status: 'success',
        data: {
          ...stats,
          availableRooms,
          unpaidInvoices
        }
      });
    } catch (error) {
      // Chuyển lỗi cho global error handler
      next(error);
    }
  }

  // Lấy thống kê sinh viên theo giới tính
  async getStudentsByGender(_req: Request, res: Response, next: NextFunction) { // Đổi tên hàm, thêm next
    try {
      // Đổi prisma.resident thành prisma.studentProfile
      const stats = await prisma.studentProfile.groupBy({
        by: ['gender'],
        _count: {
          gender: true // Đếm theo field gender
        },
      });

      // Định dạng lại kết quả cho dễ hiểu hơn (tùy chọn)
      const formattedStats = stats.map(item => ({
        gender: item.gender,
        count: item._count.gender
      }));

      res.status(200).json({ // Thêm status code và chuẩn hóa response
        status: 'success',
        data: formattedStats
      });
    } catch (error) {
      // Chuyển lỗi cho global error handler
      next(error);
    }
  }

  // Lấy tình trạng sử dụng phòng
  async getRoomsOccupancy(_req: Request, res: Response, next: NextFunction) { // Thêm next
    try {
      // Lấy thông tin phòng bao gồm cả actualOccupancy
      const rooms = await prisma.room.findMany({
        select: { // Chỉ chọn các trường cần thiết
          id: true,
          number: true,
          capacity: true,
          actualOccupancy: true, // Sử dụng trường này thay vì _count
          status: true,
          building: { // Lấy thêm tên tòa nhà
            select: {
              name: true
            }
          }
        },
        orderBy: [
          { building: { name: 'asc' } },
          { number: 'asc' }
        ]
      });

      // Có thể map lại nếu cần định dạng khác, nhưng trả về trực tiếp cũng ổn
      // const occupancy = rooms.map(room => ({
      //   id: room.id,
      //   buildingName: room.building.name,
      //   number: room.number,
      //   capacity: room.capacity,
      //   occupied: room.actualOccupancy, // Sử dụng actualOccupancy
      //   status: room.status
      // }));

      res.status(200).json({ // Thêm status code và chuẩn hóa response
        status: 'success',
        results: rooms.length,
        data: rooms // Trả về trực tiếp danh sách phòng với thông tin occupancy
      });
    } catch (error) {
      // Chuyển lỗi cho global error handler
      next(error);
    }
  }

  // Lấy các hoạt động gần đây (ví dụ: sinh viên mới được tạo)
  async getRecentActivities(_req: Request, res: Response, next: NextFunction) { // Thêm next
    try {
      // Đổi prisma.resident thành prisma.studentProfile
      // Đổi select name thành fullName
      const recentStudents = await prisma.studentProfile.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true, // Đổi từ name
          createdAt: true,
          updatedAt: true,
          user: { // Lấy thêm email nếu cần
            select: { email: true }
          }
        }
      });

      res.status(200).json({ // Thêm status code và chuẩn hóa response
        status: 'success',
        results: recentStudents.length,
        data: recentStudents
      });
    } catch (error) {
      // Chuyển lỗi cho global error handler
      next(error);
    }
  }
}
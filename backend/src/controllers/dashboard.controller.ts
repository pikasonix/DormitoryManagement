import { Request, Response, NextFunction } from 'express'; // Thêm NextFunction
import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../services/dashboard.service';

// Lưu ý: Nên sử dụng một instance PrismaClient duy nhất (singleton)
// được khởi tạo ở một file khác (vd: src/utils/prisma.ts) và import vào đây.
const prisma = new PrismaClient();
const dashboardService = new DashboardService();

export class DashboardController {
  // Lấy các số liệu thống kê tổng quan
  async getStats(req: Request, res: Response, next: NextFunction) { // Thêm next
    try {
      // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;

      // Sử dụng service để lấy dữ liệu thống kê, truyền buildingId để lọc nếu cần
      const stats = await dashboardService.getStats(buildingId);

      // Lấy thêm thông tin về số phòng trống
      const availableRoomFilter: any = { status: 'AVAILABLE' };
      // Nếu có buildingId, lọc theo tòa nhà
      if (buildingId) {
        availableRoomFilter.buildingId = buildingId;
      }

      const availableRooms = await prisma.room.count({
        where: availableRoomFilter
      });

      // Lấy thông tin về hóa đơn chưa thanh toán
      // Đối với hóa đơn, cần join để lấy theo buildingId từ phòng
      const unpaidInvoiceFilter: any = { status: 'UNPAID' };

      // Cách đếm hóa đơn khi lọc theo tòa nhà
      let unpaidInvoices = 0;
      if (buildingId) {
        // Lấy hóa đơn theo tòa nhà - cần join qua room -> building
        unpaidInvoices = await prisma.invoice.count({
          where: {
            status: 'UNPAID',
            room: {
              buildingId: buildingId
            }
          }
        });
      } else {
        // Không lọc theo tòa nhà
        unpaidInvoices = await prisma.invoice.count({
          where: unpaidInvoiceFilter
        });
      }

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
  async getStudentsByGender(req: Request, res: Response, next: NextFunction) { // Đổi tên hàm, thêm next
    try {
      // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;

      // Define type for our statistics
      type GenderStat = {
        gender: string;
        count: number;
      };

      // Initialize with proper type
      let formattedStats: GenderStat[] = [];

      if (buildingId) {
        // Lấy danh sách ID của các phòng trong tòa nhà
        const roomIds = await prisma.room.findMany({
          where: { buildingId },
          select: { id: true }
        }).then(rooms => rooms.map(r => r.id));

        if (roomIds.length > 0) {
          // Đếm sinh viên theo giới tính và theo phòng
          const maleCount = await prisma.studentProfile.count({
            where: {
              gender: 'MALE',
              roomId: { in: roomIds }
            }
          });

          const femaleCount = await prisma.studentProfile.count({
            where: {
              gender: 'FEMALE',
              roomId: { in: roomIds }
            }
          });

          // Tạo kết quả thống kê
          formattedStats = [
            { gender: 'MALE', count: maleCount },
            { gender: 'FEMALE', count: femaleCount }
          ];
        }
      } else {
        // Lấy thống kê sinh viên theo giới tính, không lọc
        const stats = await prisma.studentProfile.groupBy({
          by: ['gender'],
          _count: {
            gender: true // Đếm theo field gender
          },
        });

        // Định dạng lại kết quả cho dễ hiểu hơn
        formattedStats = stats.map(item => ({
          gender: item.gender || 'UNKNOWN',
          count: item._count.gender
        }));
      }

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
  async getRoomsOccupancy(req: Request, res: Response, next: NextFunction) { // Thêm next
    try {
      // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;

      // Xây dựng các filter dựa trên buildingId
      const roomFilter: any = {};
      if (buildingId) {
        roomFilter.buildingId = buildingId;
      }

      // Lấy thông tin phòng bao gồm cả actualOccupancy
      const rooms = await prisma.room.findMany({
        where: roomFilter,
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
  async getRecentActivities(req: Request, res: Response, next: NextFunction) { // Thêm next
    try {
      // Kiểm tra xem có yêu cầu lọc theo buildingId hay không
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;

      // Xây dựng các filter dựa trên buildingId
      let studentFilter = {};

      // Nếu có buildingId, lọc sinh viên theo phòng thuộc tòa nhà
      if (buildingId) {
        // Lấy danh sách ID của các phòng trong tòa nhà
        const roomIds = await prisma.room.findMany({
          where: { buildingId },
          select: { id: true }
        }).then(rooms => rooms.map(r => r.id));

        // Lọc sinh viên theo phòng thuộc tòa nhà
        if (roomIds.length > 0) {
          studentFilter = { roomId: { in: roomIds } };
        }
      }

      // Đổi prisma.resident thành prisma.studentProfile
      // Đổi select name thành fullName
      const recentStudents = await prisma.studentProfile.findMany({
        where: studentFilter,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true, // Đổi từ name
          createdAt: true,
          updatedAt: true,
          room: {
            select: {
              number: true,
              building: {
                select: { name: true }
              }
            }
          },
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
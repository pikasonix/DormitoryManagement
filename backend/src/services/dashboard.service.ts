import { PrismaClient } from '@prisma/client';

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

export class DashboardService {

  /**
   * Lấy các số liệu thống kê tổng quan cho dashboard.
   */
  async getStats() {
    const [
      totalStudents,    // Đổi tên biến và model
      totalRooms,
      maleStudents,     // Đổi tên biến và model
      femaleStudents,   // Đổi tên biến và model
      totalBuildings,   // Thêm thống kê tòa nhà
      pendingMaintenance // Thêm thống kê bảo trì đang chờ
    ] = await Promise.all([
      prisma.studentProfile.count(), // Dùng StudentProfile
      prisma.room.count(),
      prisma.studentProfile.count({ where: { gender: 'MALE' } }), // Dùng StudentProfile
      prisma.studentProfile.count({ where: { gender: 'FEMALE' } }), // Dùng StudentProfile
      prisma.building.count(),
      prisma.maintenance.count({ where: { status: 'PENDING' } }) // Đếm báo hỏng đang chờ
    ]);

    return {
      totalStudents,    // Đổi key
      totalRooms,
      totalBuildings,
      maleStudents,     // Đổi key
      femaleStudents,   // Đổi key
      pendingMaintenance
    };
  }

  /**
   * Thống kê sinh viên theo giới tính.
   */
  async getStudentsByGender() { // Đổi tên hàm
    // Dùng StudentProfile
    const stats = await prisma.studentProfile.groupBy({
      by: ['gender'],
      _count: {
        gender: true // Đếm theo field gender
      },
    });

    // Định dạng lại kết quả cho dễ hiểu hơn
    return stats.map(item => ({
      gender: item.gender,
      count: item._count.gender // Lấy count từ _count.gender
    }));
  }

  /**
   * Thống kê sinh viên theo Khoa/Viện.
   * (Thay thế cho getResidentsByEducation)
   */
  async getStudentsByFaculty() { // Đổi tên hàm và logic
    // Dùng StudentProfile
    const stats = await prisma.studentProfile.groupBy({
      by: ['faculty'], // Nhóm theo Khoa/Viện
      _count: {
        faculty: true // Đếm theo Khoa/Viện
      },
      orderBy: { // Sắp xếp theo số lượng giảm dần (tùy chọn)
        _count: {
          faculty: 'desc'
        }
      }
    });

    return stats.map(item => ({
      faculty: item.faculty || 'Chưa xác định', // Xử lý trường hợp null
      count: item._count.faculty
    }));
  }

  /**
   * Lấy danh sách sinh viên được tạo gần đây.
   * @param limit Số lượng sinh viên cần lấy (mặc định 5)
   */
  async getRecentStudents(limit = 5) { // Đổi tên hàm
    // Dùng StudentProfile
    return prisma.studentProfile.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true, // Đổi từ name
        faculty: true,  // Thay education bằng faculty
        gender: true,
        createdAt: true,
        user: { // Lấy thêm email user nếu cần
          select: { email: true }
        },
        room: { // Lấy số phòng
          select: {
            number: true,
            building: { select: { name: true } } // Lấy cả tên tòa nhà
          }
        }
      }
    });
  }

  /**
   * Lấy thông tin về tình trạng sử dụng phòng.
   */
  async getRoomOccupancy() {
    const rooms = await prisma.room.findMany({
      select: { // Chỉ chọn các trường cần thiết
        id: true,
        number: true,
        capacity: true,
        actualOccupancy: true, // *** Sử dụng trường này ***
        status: true,
        building: { // Lấy tên tòa nhà
          select: { name: true }
        }
      },
      orderBy: [
        { building: { name: 'asc' } },
        { number: 'asc' }
      ]
      // Loại bỏ include: { _count: { select: { residents: true } } }
    });

    // Tính toán số chỗ trống và định dạng lại kết quả
    return rooms.map(room => ({
      roomId: room.id, // Thêm ID phòng
      buildingName: room.building.name,
      roomNumber: room.number,
      capacity: room.capacity,
      occupied: room.actualOccupancy, // *** Sử dụng actualOccupancy ***
      available: room.capacity - room.actualOccupancy, // Tính chỗ trống
      status: room.status
    }));
  }

  /**
  * (Ví dụ) Lấy thống kê báo cáo bảo trì theo trạng thái.
  */
  async getMaintenanceStatsByStatus() {
    const stats = await prisma.maintenance.groupBy({
      by: ['status'],
      _count: {
        status: true
      },
    });

    return stats.map(item => ({
      status: item.status,
      count: item._count.status
    }));
  }
}
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {

  /**
   * Lấy các số liệu thống kê tổng quan cho dashboard.
   * @param buildingId ID của tòa nhà cần lọc (tùy chọn)
   */
  async getStats(buildingId?: number) {
    // Xây dựng các filter dựa trên buildingId
    const studentFilter: any = {};
    const roomFilter: any = {};
    const maintenanceFilter: any = { status: 'PENDING' };

    // Nếu có buildingId, áp dụng filter cho cả sinh viên, phòng và bảo trì
    if (buildingId) {
      // Lọc phòng trực tiếp theo buildingId
      roomFilter.buildingId = buildingId;

      // Đầu tiên lấy danh sách ID của các phòng trong tòa nhà
      const roomIds = await prisma.room.findMany({
        where: { buildingId: buildingId },
        select: { id: true }
      });

      const roomIdList = roomIds.map(r => r.id);

      // Lọc sinh viên theo phòng thuộc tòa nhà
      if (roomIdList.length > 0) {
        studentFilter.roomId = { in: roomIdList };
        // Lọc yêu cầu bảo trì theo phòng thuộc tòa nhà  
        maintenanceFilter.roomId = { in: roomIdList };
      } else {
        // Nếu không có phòng nào trong tòa nhà, trả về 0 cho tất cả
        studentFilter.id = -1; // Filter không thể có
        maintenanceFilter.id = -1; // Filter không thể có
      }
    }

    const [
      totalStudents,
      totalRooms,
      maleStudents,
      femaleStudents,
      totalBuildings,
      pendingMaintenance
    ] = await Promise.all([
      prisma.studentProfile.count({ where: studentFilter }),
      prisma.room.count({ where: roomFilter }),
      prisma.studentProfile.count({ where: { ...studentFilter, gender: 'MALE' } }),
      prisma.studentProfile.count({ where: { ...studentFilter, gender: 'FEMALE' } }),
      buildingId ? Promise.resolve(1) : prisma.building.count(), // Nếu có buildingId, chỉ có 1 tòa nhà
      prisma.maintenance.count({ where: maintenanceFilter })
    ]);

    return {
      totalStudents,
      totalRooms,
      totalBuildings,
      maleStudents,
      femaleStudents,
      pendingMaintenance
    };
  }

  /**
   * Thống kê sinh viên theo giới tính.
   */
  async getStudentsByGender() {
    const stats = await prisma.studentProfile.groupBy({
      by: ['gender'],
      _count: {
        gender: true
      },
    });

    return stats.map(item => ({
      gender: item.gender,
      count: item._count.gender
    }));
  }

  /**
   * Thống kê sinh viên theo Khoa/Viện.
   */
  async getStudentsByFaculty() {
    const stats = await prisma.studentProfile.groupBy({
      by: ['faculty'],
      _count: {
        faculty: true
      },
      orderBy: {
        _count: {
          faculty: 'desc'
        }
      }
    });

    return stats.map(item => ({
      faculty: item.faculty || 'Chưa xác định',
      count: item._count.faculty
    }));
  }

  /**
   * Lấy danh sách sinh viên được tạo gần đây.
   * @param limit Số lượng sinh viên cần lấy (mặc định 5)
   */
  async getRecentStudents(limit = 5) {
    return prisma.studentProfile.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        faculty: true,
        gender: true,
        createdAt: true,
        user: {
          select: { email: true }
        },
        room: {
          select: {
            number: true,
            building: { select: { name: true } }
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
      select: {
        id: true,
        number: true,
        capacity: true,
        actualOccupancy: true,
        status: true,
        building: {
          select: { name: true }
        }
      },
      orderBy: [
        { building: { name: 'asc' } },
        { number: 'asc' }
      ]
    });

    return rooms.map(room => ({
      roomId: room.id,
      buildingName: room.building.name,
      roomNumber: room.number,
      capacity: room.capacity,
      occupied: room.actualOccupancy,
      available: room.capacity - room.actualOccupancy,
      status: room.status
    }));
  }

  /**
  * Lấy thống kê báo cáo bảo trì theo trạng thái.
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
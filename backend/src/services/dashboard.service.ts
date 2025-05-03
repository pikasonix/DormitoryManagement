import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {

  /**
   * Lấy các số liệu thống kê tổng quan cho dashboard.
   */
  async getStats() {
    const [
      totalStudents,
      totalRooms,
      maleStudents,
      femaleStudents,
      totalBuildings,
      pendingMaintenance
    ] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.room.count(),
      prisma.studentProfile.count({ where: { gender: 'MALE' } }),
      prisma.studentProfile.count({ where: { gender: 'FEMALE' } }),
      prisma.building.count(),
      prisma.maintenance.count({ where: { status: 'PENDING' } })
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
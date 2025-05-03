import { PrismaClient, Room, Prisma } from '@prisma/client'

export class RoomService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  /**
   * Lấy danh sách tất cả các phòng
   */
  async findAll(): Promise<Room[]> {
    return this.prisma.room.findMany({
      include: {
        residents: true
      }
    })
  }

  /**
   * Tìm một phòng theo ID
   */
  async findOne(id: number): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { id },
      include: {
        residents: true
      }
    })
  }

  /**
   * Tạo một phòng mới
   */
  async create(data: Prisma.RoomCreateInput): Promise<Room> {
    return this.prisma.room.create({
      data,
      include: {
        residents: true
      }
    })
  }

  /**
   * Cập nhật thông tin phòng
   */
  async update(id: number, data: Prisma.RoomUpdateInput): Promise<Room> {
    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        residents: true
      }
    })
  }

  /**
   * Xóa một phòng
   */
  async delete(id: number): Promise<Room> {
    return this.prisma.room.delete({
      where: { id }
    })
  }
}
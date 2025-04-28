import { PrismaClient, Room, Prisma } from '@prisma/client'

export class RoomService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async findAll(): Promise<Room[]> {
    return this.prisma.room.findMany({
      include: {
        residents: true
      }
    })
  }

  async findOne(id: number): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: { id },
      include: {
        residents: true
      }
    })
  }

  async create(data: Prisma.RoomCreateInput): Promise<Room> {
    return this.prisma.room.create({
      data,
      include: {
        residents: true
      }
    })
  }

  async update(id: number, data: Prisma.RoomUpdateInput): Promise<Room> {
    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        residents: true
      }
    })
  }

  async delete(id: number): Promise<Room> {
    return this.prisma.room.delete({
      where: { id }
    })
  }
} 
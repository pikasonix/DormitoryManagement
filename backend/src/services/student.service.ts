import { PrismaClient, Prisma, StudentProfile, User } from '@prisma/client';

const prisma = new PrismaClient();

export class StudentService {

  /**
   * Lấy danh sách tất cả hồ sơ sinh viên với thông tin cơ bản kèm theo.
   * @param options Tùy chọn Prisma findMany (ví dụ: bộ lọc `where`, `orderBy`)
   */
  async findAll(options?: Prisma.StudentProfileFindManyArgs): Promise<StudentProfile[]> {
    try {
      const students = await prisma.studentProfile.findMany({
        ...options,
        include: {
          user: {
            select: {
              email: true,
              isActive: true,
              avatar: true
            }
          },
          room: {
            include: {
              building: { select: { id: true, name: true } }
            }
          },
          ...(options?.include || {})
        },
        orderBy: options?.orderBy || { fullName: 'asc' }
      });
      return students;
    } catch (error) {
      console.error("[StudentService.findAll] Error:", error);
      throw error;
    }
  }

  /**
   * Tìm một hồ sơ sinh viên bằng ID của nó, bao gồm thông tin chi tiết.
   * @param id ID của StudentProfile
   * @param options Tùy chọn Prisma findUnique (ví dụ: include thêm)
   * @throws Error nếu không tìm thấy
   */
  async findOneById(id: number, options?: Prisma.StudentProfileFindUniqueArgs): Promise<StudentProfile | null> {
    if (isNaN(id)) {
      throw new Error('ID hồ sơ sinh viên không hợp lệ');
    }

    try {
      const student = await prisma.studentProfile.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, isActive: true, avatar: true } },
          room: { include: { building: true } },
          invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
          payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
          reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
          vehicleRegistrations: { include: { images: true } },
          roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 },
          ...(options?.include || {})
        },
        ...options,
      });

      if (!student) {
        throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${id}`);
      }

      return student;
    } catch (error) {
      console.error(`[StudentService.findOneById] Error fetching student ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${id}`);
      }
      throw error;
    }
  }
}
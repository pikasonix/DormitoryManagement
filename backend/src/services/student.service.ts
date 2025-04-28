import { PrismaClient, Prisma, StudentProfile, User } from '@prisma/client';
// Import AppError if you have it defined for consistent error handling
// import { AppError } from '../types/AppError';

// Lưu ý: Nên sử dụng instance PrismaClient singleton từ một file utils
// Ví dụ: import prisma from '../utils/prisma';
const prisma = new PrismaClient(); // Tạm thời giữ lại new instance

// Đổi tên class
export class StudentService {

  /**
   * Lấy danh sách tất cả hồ sơ sinh viên với thông tin cơ bản kèm theo.
   * @param options Tùy chọn Prisma findMany (ví dụ: bộ lọc `where`, `orderBy`)
   */
  async findAll(options?: Prisma.StudentProfileFindManyArgs): Promise<StudentProfile[]> {
    try {
      const students = await prisma.studentProfile.findMany({
        // Áp dụng các tùy chọn được truyền vào (nếu có)
        ...options,
        // Ghi đè hoặc bổ sung include để đảm bảo có thông tin cần thiết
        include: {
          user: { // Lấy thông tin user liên quan
            select: {
              email: true,
              isActive: true,
              avatar: true // Lấy thông tin avatar
            }
          },
          room: { // Lấy thông tin phòng và tòa nhà
            include: {
              building: { select: { id: true, name: true } }
            }
          },
          // Ghi đè hoặc thêm include từ options nếu cần
          ...(options?.include || {})
        },
        // Mặc định sắp xếp nếu không có trong options
        orderBy: options?.orderBy || { fullName: 'asc' }
      });
      return students;
    } catch (error) {
      console.error("[StudentService.findAll] Error:", error);
      // Ném lại lỗi để controller xử lý hoặc chuyển đến error middleware
      throw error;
    }
  }

  /**
   * Tìm một hồ sơ sinh viên bằng ID của nó, bao gồm thông tin chi tiết.
   * @param id ID của StudentProfile
   * @param options Tùy chọn Prisma findUnique (ví dụ: include thêm)
   * @throws AppError nếu không tìm thấy
   */
  async findOneById(id: number, options?: Prisma.StudentProfileFindUniqueArgs): Promise<StudentProfile | null> {
    if (isNaN(id)) {
      // Ném lỗi nếu ID không hợp lệ
      throw new Error('ID hồ sơ sinh viên không hợp lệ'); // Hoặc AppError(..., 400)
    }

    try {
      const student = await prisma.studentProfile.findUnique({
        where: { id },
        // Ghi đè hoặc bổ sung include mặc định cho trang chi tiết
        include: {
          user: { select: { id: true, email: true, isActive: true, avatar: true } },
          room: { include: { building: true } },
          invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
          payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
          reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
          vehicleRegistrations: { include: { images: true } },
          roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 },
          // Cho phép ghi đè hoặc thêm include từ options nếu cần
          ...(options?.include || {})
        },
        // Áp dụng các tùy chọn khác nếu có
        ...options,
      });

      if (!student) {
        throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${id}`); // Hoặc AppError(..., 404)
      }

      return student;
    } catch (error) {
      console.error(`[StudentService.findOneById] Error fetching student ${id}:`, error);
      // Ném lại lỗi Prisma hoặc lỗi "Not Found"
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${id}`); // Hoặc AppError(..., 404)
      }
      throw error;
    }
  }


  // --- Các hàm CRUD phức tạp (create, update, delete) đã được chuyển logic vào Controller ---
  // Lý do: Các thao tác này yêu cầu tạo/cập nhật/xóa nhiều model liên quan (User, Profile, Media),
  // xử lý mật khẩu, và cần được thực hiện trong một transaction để đảm bảo tính toàn vẹn dữ liệu.
  // Việc đặt logic transaction trực tiếp trong controller giúp quản lý luồng dễ dàng hơn.

  /*
  async create(data: any) {
      // Logic tạo User + StudentProfile + Avatar (nếu có) + Room (nếu có) trong transaction
      // -> Nên thực hiện trong StudentController.createStudent
      throw new Error("Create logic is handled in StudentController using transactions.");
  }
  */

  /*
  async update(id: number, data: any) {
      // Logic cập nhật User (avatar) + StudentProfile + Room (nếu có) trong transaction
      // -> Nên thực hiện trong StudentController.updateStudent
       throw new Error("Update logic is handled in StudentController using transactions.");
  }
  */

  /*
  async delete(id: number) {
      // Logic xóa User (cascade Profile) + Payments + Invoices + Transfers + Maintenances + Vehicles + Media trong transaction
      // -> Nên thực hiện trong StudentController.deleteStudent
      throw new Error("Delete logic is handled in StudentController using transactions.");
  }
  */

  // --- Có thể thêm các hàm truy vấn cụ thể khác ở đây ---
  // Ví dụ:
  // async findByRoom(roomId: number) { ... }
  // async findByStatus(status: StudentStatus) { ... }
  // async searchByName(nameQuery: string) { ... }

}
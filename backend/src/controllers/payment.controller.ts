import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, InvoiceStatus } from '@prisma/client'; // Import Prisma và Enums
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

// Lấy danh sách thanh toán (có thể lọc)
export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Lấy tất cả các tham số lọc từ query params
    const {
      id,
      studentId,
      studentProfileId,
      invoiceId,
      method, // Tham số từ frontend
      page,
      limit,
      transactionCode
    } = req.query;

    // Lọc và phân trang
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Xây dựng mệnh đề lọc (where)
    const whereClause: Prisma.PaymentWhereInput = {};

    // Lọc theo ID payment
    if (id) {
      whereClause.id = parseInt(id as string);
    }

    // Lọc theo sinh viên (mã sinh viên)
    if (studentId) {
      whereClause.studentProfile = {
        studentId: {
          contains: studentId as string,
          mode: 'insensitive'
        }
      };
    }

    // Lọc theo sinh viên (ID profile)
    if (studentProfileId) {
      whereClause.studentProfileId = parseInt(studentProfileId as string);
    }

    // Lọc theo hóa đơn
    if (invoiceId) {
      whereClause.invoiceId = parseInt(invoiceId as string);
    }

    // Lọc theo phương thức thanh toán
    if (method) {
      whereClause.paymentMethod = method as string; // Sử dụng giá trị chính xác từ frontend
    }

    // Lọc theo mã giao dịch (nếu có)
    if (transactionCode) {
      whereClause.transactionCode = {
        contains: transactionCode as string,
        mode: 'insensitive' // Tìm kiếm không phân biệt chữ hoa/thường
      };
    }

    // Đếm tổng số bản ghi phù hợp với điều kiện lọc
    const totalRecords = await prisma.payment.count({
      where: whereClause
    });

    // Lấy danh sách thanh toán với phân trang và lọc
    const payments = await prisma.payment.findMany({
      where: whereClause,
      skip,
      take: limitNum,
      include: {
        studentProfile: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            room: { select: { id: true, number: true, building: { select: { name: true } } } }
          }
        },
        invoice: {
          select: {
            id: true,
            billingMonth: true,
            billingYear: true,
            totalAmount: true,
            status: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    res.status(200).json({
      status: 'success',
      results: payments.length,
      total: totalRecords,
      meta: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum),
        total: totalRecords
      },
      payments: payments
    });
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách thanh toán:', error);
    next(error);
  }
};

// Lấy thông tin chi tiết một thanh toán
export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      // Sử dụng return để đảm bảo không chạy code phía dưới
      return next(new Error('ID thanh toán không hợp lệ')); // Dịch và dùng next
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        studentProfile: { // Đổi include
          select: { id: true, fullName: true, studentId: true, room: { select: { number: true } } }
        },
        invoice: { // Include hóa đơn và các mục trong hóa đơn
          include: {
            items: true
          }
        }
      }
    });

    if (!payment) {
      return next(new Error(`Không tìm thấy thanh toán với ID ${id}`)); // Dịch và dùng next
    }

    res.status(200).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết thanh toán:', error);
    next(error); // Chuyển lỗi
  }
};

// Tạo thanh toán mới (Quan trọng: Cần Transaction)
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Các trường cần thiết từ body theo schema mới
    const { studentProfileId, invoiceId, amount, paymentMethod, transactionCode, notes } = req.body;

    // --- Validation cơ bản ---
    if (!studentProfileId || !invoiceId || amount === undefined || amount === null) {
      return next(new Error('Thiếu thông tin bắt buộc: studentProfileId, invoiceId, amount')); // Dịch và dùng next
    }
    const numericAmount = new Decimal(amount);
    if (numericAmount.isNaN() || numericAmount.isNegative()) {
      return next(new Error('Số tiền (amount) không hợp lệ'));
    }
    const profileId = parseInt(studentProfileId);
    const invId = parseInt(invoiceId);
    if (isNaN(profileId) || isNaN(invId)) {
      return next(new Error('StudentProfileId hoặc InvoiceId không hợp lệ'));
    }
    // --- Kết thúc Validation ---


    // *** SỬ DỤNG TRANSACTION ***
    const newPayment = await prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin hóa đơn cần cập nhật
      const invoice = await tx.invoice.findUnique({
        where: { id: invId }
      });

      if (!invoice) {
        // Throw lỗi để rollback transaction
        throw new Error(`Không tìm thấy hóa đơn với ID ${invId}`);
      }
      // Kiểm tra xem sinh viên thanh toán có khớp với hóa đơn không (nếu là hóa đơn cá nhân)
      if (invoice.studentProfileId && invoice.studentProfileId !== profileId) {
        throw new Error(`Hóa đơn ${invId} không thuộc về sinh viên ${profileId}`);
      }


      // 2. Tạo bản ghi thanh toán mới
      const createdPayment = await tx.payment.create({
        data: {
          studentProfileId: profileId,
          invoiceId: invId,
          amount: numericAmount, // Sử dụng Decimal
          paymentMethod: paymentMethod || null, // Cho phép null
          transactionCode: transactionCode || null, // Cho phép null
          notes: notes || null, // Cho phép null
          paymentDate: new Date() // Ngày thanh toán là hiện tại
        },
        include: { // Include để trả về đủ thông tin
          studentProfile: { select: { id: true, fullName: true } },
          invoice: { select: { id: true, totalAmount: true } }
        }
      });

      // 3. Cập nhật hóa đơn
      const currentPaidAmount = invoice.paidAmount;
      const newPaidAmount = currentPaidAmount.add(numericAmount); // Cộng dồn số tiền đã trả

      let newStatus: InvoiceStatus = invoice.status; // Mặc định giữ nguyên status

      // Xác định trạng thái mới của hóa đơn
      if (newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount)) {
        newStatus = InvoiceStatus.PAID; // Đã trả đủ
      } else if (newPaidAmount.isPositive()) {
        newStatus = InvoiceStatus.PARTIALLY_PAID; // Trả một phần
      } else {
        // Trường hợp này ít xảy ra khi tạo mới, nhưng để logic đầy đủ
        newStatus = InvoiceStatus.UNPAID;
      }

      // Cập nhật paidAmount và status cho hóa đơn
      await tx.invoice.update({
        where: { id: invId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      // Transaction thành công, trả về thanh toán đã tạo
      return createdPayment;
    });
    // *** KẾT THÚC TRANSACTION ***


    res.status(201).json({
      status: 'success',
      data: newPayment
    });
  } catch (error: any) {
    console.error('Lỗi khi tạo thanh toán:', error);
    // Trả về lỗi cụ thể hơn nếu là lỗi trong transaction
    if (error.message.includes('Không tìm thấy hóa đơn') || error.message.includes('Hóa đơn không thuộc về sinh viên')) {
      next(new Error(error.message)); // Hoặc AppError(..., 400/404)
    } else {
      next(error); // Chuyển lỗi chung
    }
  }
};

// Cập nhật thanh toán (Quan trọng: Cần Transaction)
export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new Error('ID thanh toán không hợp lệ'));
    }
    // Chỉ cho phép cập nhật amount, paymentMethod, transactionCode, notes
    const { amount, paymentMethod, transactionCode, notes } = req.body;

    // --- Validation ---
    let numericAmount: Decimal | undefined = undefined;
    if (amount !== undefined && amount !== null) {
      numericAmount = new Decimal(amount);
      if (numericAmount.isNaN() || numericAmount.isNegative()) {
        return next(new Error('Số tiền (amount) không hợp lệ'));
      }
    } else {
      // Không cho phép cập nhật thành null/undefined nếu amount được gửi lên
      // Nếu không gửi amount thì không cập nhật
    }
    // --- Kết thúc Validation ---


    // *** SỬ DỤNG TRANSACTION ***
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin thanh toán hiện tại và hóa đơn liên quan
      const currentPayment = await tx.payment.findUnique({
        where: { id },
        include: {
          invoice: true // Cần thông tin hóa đơn để cập nhật
        }
      });

      if (!currentPayment || !currentPayment.invoice) {
        throw new Error(`Không tìm thấy thanh toán với ID ${id} hoặc hóa đơn liên quan`);
      }

      const invoice = currentPayment.invoice;
      let amountDifference = new Decimal(0); // Khởi tạo chênh lệch số tiền

      // Tạo data để update payment
      const paymentUpdateData: Prisma.PaymentUpdateInput = {
        paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined, // Chỉ update nếu được cung cấp
        transactionCode: transactionCode !== undefined ? transactionCode : undefined,
        notes: notes !== undefined ? notes : undefined,
      };

      // Chỉ cập nhật amount và tính difference nếu amount mới được cung cấp và khác amount cũ
      if (numericAmount !== undefined && !numericAmount.equals(currentPayment.amount)) {
        amountDifference = numericAmount.sub(currentPayment.amount); // Tính chênh lệch
        paymentUpdateData.amount = numericAmount; // Cập nhật amount trong payment
      }


      // 2. Cập nhật bản ghi Payment
      const paymentAfterUpdate = await tx.payment.update({
        where: { id },
        data: paymentUpdateData,
        include: { // Include để trả về response
          studentProfile: { select: { id: true, fullName: true } },
          invoice: { select: { id: true, totalAmount: true, status: true } }
        }
      });


      // 3. Nếu số tiền thay đổi -> Cập nhật hóa đơn
      if (!amountDifference.isZero()) {
        const currentPaidAmount = invoice.paidAmount;
        const newPaidAmount = currentPaidAmount.add(amountDifference); // Cộng/trừ chênh lệch

        let newStatus: InvoiceStatus = invoice.status;
        if (newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount)) {
          newStatus = InvoiceStatus.PAID;
        } else if (newPaidAmount.isPositive()) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        } else {
          newStatus = InvoiceStatus.UNPAID; // Có thể về lại UNPAID nếu trừ tiền
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus
          }
        });
      }

      // Transaction thành công
      return paymentAfterUpdate;
    });
    // *** KẾT THÚC TRANSACTION ***

    res.status(200).json({
      status: 'success',
      data: updatedPayment
    });
  } catch (error: any) {
    console.error('Lỗi khi cập nhật thanh toán:', error);
    if (error.message.includes('Không tìm thấy thanh toán')) {
      next(new Error(error.message)); // Hoặc AppError(..., 404)
    } else {
      next(error); // Chuyển lỗi chung
    }
  }
};

// Xóa thanh toán (Quan trọng: Cần Transaction)
export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new Error('ID thanh toán không hợp lệ'));
    }

    // *** SỬ DỤNG TRANSACTION ***
    await prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin thanh toán và hóa đơn liên quan
      const paymentToDelete = await tx.payment.findUnique({
        where: { id },
        include: { invoice: true }
      });

      if (!paymentToDelete || !paymentToDelete.invoice) {
        throw new Error(`Không tìm thấy thanh toán với ID ${id} hoặc hóa đơn liên quan`);
      }

      const invoice = paymentToDelete.invoice;
      const amountToDelete = paymentToDelete.amount;

      // 2. Cập nhật hóa đơn: Trừ số tiền đã xóa khỏi paidAmount
      const currentPaidAmount = invoice.paidAmount;
      const newPaidAmount = currentPaidAmount.sub(amountToDelete); // Trừ đi số tiền của payment bị xóa

      let newStatus: InvoiceStatus = invoice.status;
      if (newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount)) {
        // Ít xảy ra khi xóa, nhưng để logic đầy đủ
        newStatus = InvoiceStatus.PAID;
      } else if (newPaidAmount.isPositive()) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      } else {
        newStatus = InvoiceStatus.UNPAID; // Có thể về lại UNPAID
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      // 3. Xóa bản ghi Payment
      await tx.payment.delete({
        where: { id }
      });

      // Transaction thành công, không cần trả về gì cụ thể từ transaction
    });
    // *** KẾT THÚC TRANSACTION ***

    res.status(200).json({
      status: 'success',
      message: 'Thanh toán đã được xóa thành công',
      data: null
    });
  } catch (error: any) {
    console.error('Lỗi khi xóa thanh toán:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      next(new Error(`Không tìm thấy thanh toán với ID ${req.params.id}`)); // Hoặc AppError(..., 404)
    } else if (error.message.includes('Không tìm thấy thanh toán')) {
      next(new Error(error.message)); // Hoặc AppError(..., 404)
    } else {
      next(error); // Chuyển lỗi chung
    }
  }
};
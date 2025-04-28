import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, Role, StudentStatus, MediaType, RoomType, RoomStatus, MaintenanceStatus, Prisma } from '@prisma/client'; // Thêm các type cần thiết
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal nếu cần xử lý Decimal trực tiếp

// --- Error Handling ---
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Lỗi dự kiến (vd: validation, not found)
    Error.captureStackTrace(this, this.constructor);
  }
}

// --- Types ---
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: Role;
  };
  // Thêm files nếu dùng multer trực tiếp trong route thay vì middleware riêng
  // files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

// --- Initialization ---
const app = express();
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

// --- CORS Configuration ---
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173', // Default Vite dev port
  'http://localhost:4173', // Default Vite preview port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  /\.vercel\.app$/, // Allow all Vercel deployments (regex)
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Check if origin is allowed
    if (allowedOrigins.some(allowedOrigin =>
      typeof allowedOrigin === 'string' ? allowedOrigin === origin : allowedOrigin.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Chỉ định rõ các header được phép
  exposedHeaders: ['Content-Length', 'Content-Type'], // Chỉ định header client có thể đọc
  maxAge: 86400 // Cache preflight requests for 1 day
};

// --- Basic Middleware ---
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight across the board
app.use(express.json({ limit: '10mb' })); // Giảm giới hạn nếu không cần lớn
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- File Handling Setup ---
const uploadsDir = path.join(__dirname, '../uploads'); // Đảm bảo đường dẫn đúng
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory at: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
} else {
  console.log(`Uploads directory already exists at: ${uploadsDir}`);
}

// Serve static files from /uploads
app.use('/uploads', express.static(uploadsDir)); // Đảm bảo đường dẫn ảo khớp

// Multer Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Tạo tên file duy nhất để tránh ghi đè
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  },
  fileFilter: (_req, file, cb) => {
    // Mở rộng các loại file được phép nếu cần
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error(`File format ${path.extname(file.originalname)} is not allowed.`));
  }
});

// Helper function to safely delete files
const deleteFile = (filePath: string) => {
  // Tạo đường dẫn tuyệt đối từ đường dẫn tương đối lưu trong DB (vd: /uploads/filename.jpg)
  const absolutePath = path.join(__dirname, '..', filePath); // Điều chỉnh nếu cần
  console.log(`Attempting to delete file at: ${absolutePath}`);
  fs.unlink(absolutePath, (err) => {
    if (err) {
      // Log lỗi nhưng không làm crash server (vd: file đã bị xóa thủ công)
      console.error(`Error deleting file ${absolutePath}:`, err);
    } else {
      console.log(`Successfully deleted file: ${absolutePath}`);
    }
  });
};


// --- Middleware ---

// Authentication Middleware
const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token is required', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret') as { userId: number; email: string; role: Role; iat: number; exp: number };
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token has expired', 401));
    }
    return next(new AppError('Invalid authentication token', 401));
  }
};

// Role Check Middleware
const checkRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      // Should be caught by authMiddleware first, but good practice
      return next(new AppError('User not authenticated', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};


// --- Routes ---

// Test & Health Check
app.get('/test', (_req: Request, res: Response) => res.json({ message: 'Server is operational' }));
app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/db-health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'Database connection successful', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database connection error:', error);
    next(new AppError('Database connection failed', 503)); // Service Unavailable
  }
});

// --- Authentication Routes ---
app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { // Include avatar information
        avatar: true
      }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Incorrect email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated', 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as jwt.SignOptions
    );

    // Fetch profile based on role
    let profile:
      | { room: { building: { id: number; createdAt: Date; updatedAt: Date; name: string; address: string | null; description: string | null; }; } & { number: string; id: number; createdAt: Date; updatedAt: Date; floor: number; capacity: number; actualOccupancy: number; price: Decimal; } | null; }
      | { managedBuilding: { id: number; createdAt: Date; updatedAt: Date; name: string; address: string | null; description: string | null; } | null; }
      | null = null;
    if (user.role === Role.STUDENT) {
      profile = (await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: { room: { include: { building: true } } }
      })) || null;
    } else if (user.role === Role.STAFF || user.role === Role.ADMIN) {
      profile = await prisma.staffProfile.findUnique({
        where: { userId: user.id },
        include: { managedBuilding: true }
      });
    }

    // Remove password from user object before sending
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      user: userWithoutPassword,
      profile
    });

  } catch (error) {
    next(error); // Pass error to global handler
  }
});

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId; // User is guaranteed by authMiddleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        avatar: true, // Select the related avatar media record
        staffProfile: req.user!.role !== Role.STUDENT ? { // Conditionally select profile
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            position: true,
            managedBuildingId: true,
            managedBuilding: { select: { id: true, name: true } }
          }
        } : undefined,
        studentProfile: req.user!.role === Role.STUDENT ? {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            roomId: true,
            room: { select: { id: true, number: true, building: { select: { id: true, name: true } } } }
          }
        } : undefined
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      user
    });

  } catch (error) {
    next(error);
  }
});

// app.post('/api/auth/logout', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // Vì backend không lưu token state, nên logout đơn giản chỉ là trả lời thành công
//     res.status(200).json({
//       status: 'success',
//       message: 'Logout successful'
//     });
//   } catch (error) {
//     next(error); // Pass error to global handler
//   }
// });

// --- Media Upload Route ---
// Generic endpoint to upload a file and create a Media record
app.post('/api/media/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const { mediaType, alt, isPublic } = req.body; // Get media type from request body

    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    // Validate MediaType
    if (!mediaType || !Object.values(MediaType).includes(mediaType as MediaType)) {
      // If invalid or missing, attempt to delete the uploaded file
      deleteFile(path.join('/uploads', file.filename)); // Construct relative path
      throw new AppError(`Invalid or missing mediaType. Allowed types: ${Object.values(MediaType).join(', ')}`, 400);
    }

    // Create Media record in the database
    const createdMedia = await prisma.media.create({
      data: {
        filename: file.filename,
        originalFilename: file.originalname,
        path: `/uploads/${file.filename}`, // Store relative path accessible via static serving
        mimeType: file.mimetype,
        size: file.size,
        mediaType: mediaType as MediaType,
        alt: alt || null,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true, // Default to public
        // uploadedById: req.user!.userId // Optional: Link to the user who uploaded it
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      media: createdMedia
    });

  } catch (error: any) {
    // If any error occurs after file is potentially saved by multer, try to delete it
    if (req.file) {
      deleteFile(path.join('/uploads', req.file.filename));
    }
    // Handle specific Multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size exceeds the 10MB limit', 400));
      }
      // Add other Multer error codes if needed
      return next(new AppError(`File upload error: ${error.message}`, 400));
    }
    // Handle file filter error
    if (error.message.startsWith('File format')) {
      return next(new AppError(error.message, 400));
    }
    next(error); // Pass other errors to global handler
  }
});

// --- Media Deletion Route ---
app.delete('/api/media/:id', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mediaId = parseInt(req.params.id);

    if (isNaN(mediaId)) {
      throw new AppError('Invalid Media ID', 400);
    }

    // Find the media record to get the file path before deleting
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new AppError('Media not found', 404);
    }

    // Check permissions more granularly if needed (e.g., can only delete own uploads, or media related to managed building/room)

    // Use transaction to ensure DB delete and file delete are linked (though file delete failure is less critical)
    await prisma.$transaction(async (tx) => {
      // Before deleting Media, check if it's used as an avatar and disconnect
      await tx.user.updateMany({
        where: { avatarId: mediaId },
        data: { avatarId: null }
      });

      // Add similar checks/disconnects for Room, Building, Maintenance, Vehicle if needed,
      // although many-to-many relations usually handle this via relation tables.
      // Direct relations like avatarId *need* to be nullified first.

      // Delete the Media record from the database
      await tx.media.delete({
        where: { id: mediaId }
      });
    });

    // After successful DB deletion, delete the physical file
    deleteFile(media.path); // Pass the relative path stored in DB

    res.status(200).json({
      status: 'success',
      message: 'Media deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});


// --- User & Profile Routes ---

// Update User Profile (Generic for Student/Staff based on User ID)
// This is more flexible than separate student/staff update endpoints if updates are similar
app.put('/api/users/:userId/profile', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userIdToUpdate = parseInt(req.params.userId);
    const requestingUserId = req.user!.userId;
    const requestingUserRole = req.user!.role;
    const { avatarId, // Expecting the ID of a Media record uploaded via /api/media/upload
      ...profileData // Rest of the data for either StudentProfile or StaffProfile
    } = req.body;

    // --- Authorization ---
    const targetUser = await prisma.user.findUnique({ where: { id: userIdToUpdate } });
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    const isSelf = userIdToUpdate === requestingUserId;
    const isAdmin = requestingUserRole === Role.ADMIN;
    const isStaff = requestingUserRole === Role.STAFF;

    // Rules: Admin can update anyone. Staff can update students, maybe other staff? (Define policy). User can update self.
    if (!isSelf && !isAdmin && !(isStaff && targetUser.role === Role.STUDENT)) {
      // Add more specific staff permissions if needed
      throw new AppError('You do not have permission to update this profile', 403);
    }

    // --- Avatar Update ---
    let oldAvatarPath: string | null = null;
    if (avatarId !== undefined) { // Check if avatarId is provided in the request
      const currentUser = await prisma.user.findUnique({
        where: { id: userIdToUpdate },
        select: { avatarId: true, avatar: { select: { path: true } } }
      });

      const newAvatarId = avatarId ? parseInt(avatarId) : null; // Allow unsetting avatar

      if (currentUser?.avatarId !== newAvatarId) {
        // --- Transaction for Avatar Update ---
        await prisma.$transaction(async (tx) => {
          // 1. Update User's avatarId
          await tx.user.update({
            where: { id: userIdToUpdate },
            data: { avatarId: newAvatarId },
          });

          // 2. If there was an old avatar AND it's not the same as the new one (edge case?), mark its path for deletion
          if (currentUser?.avatarId && currentUser.avatarId !== newAvatarId) {
            const oldAvatar = await tx.media.findUnique({ where: { id: currentUser.avatarId } });
            if (oldAvatar) {
              oldAvatarPath = oldAvatar.path;
              // 3. Delete the old Media record (physical file deletion happens outside transaction)
              await tx.media.delete({ where: { id: currentUser.avatarId } });
            }
          }
        });
        // --- End Transaction ---
      }
    }
    // Delete the old physical file *after* the transaction succeeded
    if (oldAvatarPath) {
      deleteFile(oldAvatarPath);
    }


    // --- Profile Data Update ---
    let updatedProfile;
    if (targetUser.role === Role.STUDENT) {
      // Validate and structure data for StudentProfile update
      const studentUpdateData: Prisma.StudentProfileUpdateInput = {
        fullName: profileData.fullName,
        gender: profileData.gender,
        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
        identityCardNumber: profileData.identityCardNumber,
        ethnicity: profileData.ethnicity,
        religion: profileData.religion,
        priorityObject: profileData.priorityObject,
        phoneNumber: profileData.phoneNumber,
        personalEmail: profileData.personalEmail,
        faculty: profileData.faculty,
        courseYear: profileData.courseYear ? parseInt(profileData.courseYear) : undefined,
        className: profileData.className,
        permanentProvince: profileData.permanentProvince,
        permanentDistrict: profileData.permanentDistrict,
        permanentAddress: profileData.permanentAddress,
        // Fields typically updated by Staff/Admin
        ...((isAdmin || isStaff) && {
          studentId: profileData.studentId, // Allow update if needed
          status: profileData.status as StudentStatus,
          startDate: profileData.startDate ? new Date(profileData.startDate) : undefined,
          checkInDate: profileData.checkInDate ? new Date(profileData.checkInDate) : null,
          checkOutDate: profileData.checkOutDate ? new Date(profileData.checkOutDate) : null,
          contractEndDate: profileData.contractEndDate ? new Date(profileData.contractEndDate) : undefined,
          // Assign room only if roomId is provided
          ...(profileData.roomId !== undefined && {
            room: profileData.roomId ? { connect: { id: parseInt(profileData.roomId) } } : { disconnect: true }
          })
        }),
        // Family/Emergency Info
        fatherName: profileData.fatherName,
        fatherDobYear: profileData.fatherDobYear ? parseInt(profileData.fatherDobYear) : null,
        fatherPhone: profileData.fatherPhone,
        fatherAddress: profileData.fatherAddress,
        motherName: profileData.motherName,
        motherDobYear: profileData.motherDobYear ? parseInt(profileData.motherDobYear) : null,
        motherPhone: profileData.motherPhone,
        motherAddress: profileData.motherAddress,
        emergencyContactRelation: profileData.emergencyContactRelation,
        emergencyContactPhone: profileData.emergencyContactPhone,
        emergencyContactAddress: profileData.emergencyContactAddress,
      };
      updatedProfile = await prisma.studentProfile.update({
        where: { userId: userIdToUpdate },
        data: studentUpdateData,
        include: { room: { include: { building: true } } }
      });
    } else if (targetUser.role === Role.STAFF || targetUser.role === Role.ADMIN) {
      // Validate and structure data for StaffProfile update
      const staffUpdateData: Prisma.StaffProfileUpdateInput = {
        fullName: profileData.fullName,
        phoneNumber: profileData.phoneNumber,
        position: profileData.position,
        identityCardNumber: profileData.identityCardNumber,
        gender: profileData.gender,
        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
        address: profileData.address,
        // Only Admin/Staff can typically change managed building
        ...((isAdmin || isStaff) && {
          managedBuilding: profileData.managedBuildingId !== undefined
            ? (profileData.managedBuildingId ? { connect: { id: parseInt(profileData.managedBuildingId) } } : { disconnect: true })
            : undefined
        })
      };
      updatedProfile = await prisma.staffProfile.update({
        where: { userId: userIdToUpdate },
        data: staffUpdateData,
        include: { managedBuilding: true }
      });
    } else {
      // Should not happen if role is checked, but good to handle
      throw new AppError('Cannot update profile for this user role', 400);
    }

    // Refetch user to include updated avatar info
    const updatedUser = await prisma.user.findUnique({
      where: { id: userIdToUpdate },
      include: { avatar: true }
    });
    const { password: _, ...userWithoutPassword } = updatedUser!;


    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user: userWithoutPassword,
      profile: updatedProfile
    });

  } catch (error) {
    next(error);
  }
});


// --- Student Routes (Specific actions if needed, otherwise use /api/users/:userId/profile) ---

// GET all students (accessible by Staff/Admin)
app.get('/api/students', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { email: true, isActive: true, avatar: true } }, // Include avatar
        room: { include: { building: { select: { id: true, name: true } } } }
      },
      orderBy: { fullName: 'asc' }
    });
    res.status(200).json({ status: 'success', results: students.length, data: students });
  } catch (error) {
    next(error);
  }
});

// GET specific student by profile ID
app.get('/api/students/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) throw new AppError('Invalid student profile ID', 400);

    const student = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { id: true, email: true, isActive: true, avatar: true } },
        room: { include: { building: true, amenities: { include: { amenity: true } } } },
        invoices: { orderBy: { issueDate: 'desc' }, take: 5 }, // Include recent invoices
        payments: { orderBy: { paymentDate: 'desc' }, take: 5 }, // Include recent payments
        roomTransfers: { orderBy: { transferDate: 'desc' }, take: 3 },
        reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 5, include: { images: true } }, // Include maintenance images
        vehicleRegistrations: { include: { images: true } }, // Include vehicle images
      }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    // Authorization: Allow self, staff, admin
    const requestingUserId = req.user!.userId;
    const requestingUserRole = req.user!.role;
    if (student.userId !== requestingUserId && requestingUserRole === Role.STUDENT) {
      throw new AppError('You do not have permission to view this profile', 403);
    }


    res.status(200).json({ status: 'success', data: student });
  } catch (error) {
    next(error);
  }
});

// DELETE Student (by profile ID) - Primarily for Admin
app.delete('/api/students/:id', authMiddleware, checkRole([Role.ADMIN]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) throw new AppError('Invalid student profile ID', 400);

    // Use transaction for deletion cascade
    const deletedData = await prisma.$transaction(async (tx) => {
      // 1. Find student to get userId and potentially related media
      const studentProfile = await tx.studentProfile.findUnique({
        where: { id: profileId },
        include: {
          user: { select: { id: true, avatarId: true } },
          // Include relations that might hold Media IDs if not cascaded properly
          vehicleRegistrations: { select: { id: true, images: { select: { id: true, path: true } } } },
          reportedMaintenances: { select: { id: true, images: { select: { id: true, path: true } } } },
        }
      });

      if (!studentProfile) {
        throw new AppError('Student profile not found', 404); // Will rollback transaction
      }
      const userId = studentProfile.user.id;

      // --- Collect Media to Delete ---
      const mediaToDelete: { id: number, path: string }[] = [];
      if (studentProfile.user.avatarId) {
        const avatarMedia = await tx.media.findUnique({ where: { id: studentProfile.user.avatarId }, select: { path: true } });
        if (avatarMedia) mediaToDelete.push({ id: studentProfile.user.avatarId, path: avatarMedia.path });
      }
      studentProfile.vehicleRegistrations.forEach(vr => vr.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));
      studentProfile.reportedMaintenances.forEach(m => m.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));


      // 2. Explicitly delete related records if cascade is not set or for safety
      // (Payments, Invoices (if personal), Transfers, Maintenance reports, Vehicle Regs)
      // Prisma's onDelete: Cascade on User->StudentProfile should handle most, but let's be explicit if needed.
      await tx.payment.deleteMany({ where: { studentProfileId: profileId } });
      await tx.invoice.deleteMany({ where: { studentProfileId: profileId } }); // Only personal invoices
      await tx.roomTransfer.deleteMany({ where: { studentProfileId: profileId } });
      await tx.maintenance.deleteMany({ where: { reportedById: profileId } });
      await tx.vehicleRegistration.deleteMany({ where: { studentProfileId: profileId } });
      // Note: Room occupancy should be handled separately (e.g., when student checks out or is deleted)


      // 3. Delete the User record (this should cascade delete the StudentProfile)
      await tx.user.delete({ where: { id: userId } });

      // 4. Delete related Media records (after User is deleted to avoid FK constraints if any remain)
      const uniqueMediaIds = [...new Set(mediaToDelete.map(m => m.id))]; // Avoid duplicate deletes
      if (uniqueMediaIds.length > 0) {
        await tx.media.deleteMany({ where: { id: { in: uniqueMediaIds } } });
      }


      return { mediaPathsToDelete: [...new Set(mediaToDelete.map(m => m.path))] }; // Return paths for physical deletion
    });

    // 5. Delete physical files outside the transaction
    deletedData.mediaPathsToDelete.forEach(deleteFile);

    res.status(200).json({ status: 'success', message: 'Student deleted successfully' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      next(new AppError('Student profile not found', 404));
    } else {
      next(error);
    }
  }
});


// --- Building Routes ---
app.get('/api/buildings', authMiddleware, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        images: true, // Include building images
        rooms: {
          select: { id: true, number: true, type: true, status: true, actualOccupancy: true, capacity: true },
          orderBy: { number: 'asc' }
        },
        staff: { // Staff managing this building
          select: { id: true, fullName: true, position: true, user: { select: { email: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ status: 'success', results: buildings.length, data: buildings });
  } catch (error) {
    next(error);
  }
});

// Add other Building CRUD operations (POST, PUT, DELETE) similarly, handling `imageIds` for images.


// --- Room Routes ---
app.get('/api/rooms', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { buildingId, status, type, hasVacancy } = req.query;

    const whereClause: Prisma.RoomWhereInput = {};
    if (buildingId) whereClause.buildingId = parseInt(buildingId as string);
    if (status) whereClause.status = status as RoomStatus;
    if (type) whereClause.type = type as RoomType;
    if (hasVacancy === 'true') {
      whereClause.status = { not: RoomStatus.UNDER_MAINTENANCE }; // Exclude maintenance rooms implicitly
      whereClause.OR = [ // Either available OR full but capacity > occupancy (should not happen if logic is correct, but safe)
        { status: RoomStatus.AVAILABLE },
        { capacity: { gt: prisma.room.fields.actualOccupancy } }
      ]
    } else if (hasVacancy === 'false') {
      whereClause.OR = [
        { status: RoomStatus.FULL },
        { status: RoomStatus.UNDER_MAINTENANCE }, // Include maintenance if specifically not looking for vacancy
        { capacity: { lte: prisma.room.fields.actualOccupancy } }
      ]
    }


    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        building: { select: { id: true, name: true } },
        images: true, // Include room images
        residents: { select: { id: true, fullName: true, studentId: true, user: { select: { avatar: true } } } },
        amenities: { include: { amenity: true } }
      },
      orderBy: [{ building: { name: 'asc' } }, { floor: 'asc' }, { number: 'asc' }]
    });

    // Add calculated availableSpace if needed client-side
    // const roomsWithVacancy = rooms.map(r => ({...r, availableSpace: r.capacity - r.actualOccupancy }));

    res.status(200).json({ status: 'success', results: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
});

app.get('/api/rooms/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid Room ID', 400);

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        building: true,
        images: true, // Include images
        residents: { include: { user: { select: { email: true, isActive: true, avatar: true } } } },
        amenities: { include: { amenity: true } },
        maintenances: { include: { reportedBy: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } }, images: true }, orderBy: { reportDate: 'desc' } },
        meterReadings: { orderBy: { readingDate: 'desc' }, take: 6 }, // last 6 readings
        invoices: { orderBy: { issueDate: 'desc' }, take: 3 }, // Last 3 room invoices
      }
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    res.status(200).json({ status: 'success', data: room });
  } catch (error) {
    next(error);
  }
});

app.post('/api/rooms', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      buildingId, number, type, capacity, floor, status, price, description,
      amenities, // Expects array like [{ amenityId: number, quantity?: number, notes?: string }]
      imageIds   // Expects array of Media IDs [number] from uploaded images
    } = req.body;

    // Basic Validation
    if (!buildingId || !number || !type || !capacity || !floor || !price) {
      throw new AppError('Missing required fields: buildingId, number, type, capacity, floor, price', 400);
    }

    // TODO: Add more validation (e.g., check if building exists, room number unique in building)

    const newRoom = await prisma.room.create({
      data: {
        building: { connect: { id: parseInt(buildingId) } },
        number,
        type: type as RoomType,
        capacity: parseInt(capacity),
        floor: parseInt(floor),
        status: (status as RoomStatus) || RoomStatus.AVAILABLE,
        price: new Decimal(price), // Ensure price is Decimal
        description,
        actualOccupancy: 0,
        // Connect amenities
        amenities: amenities && Array.isArray(amenities) ? {
          create: amenities.map((am: any) => ({
            amenity: { connect: { id: parseInt(am.amenityId) } },
            quantity: am.quantity ? parseInt(am.quantity) : 1,
            notes: am.notes
          }))
        } : undefined,
        // Connect images
        images: imageIds && Array.isArray(imageIds) ? {
          connect: imageIds.map((id: number) => ({ id: id }))
        } : undefined
      },
      include: { building: true, images: true, amenities: { include: { amenity: true } } } // Include relations in response
    });

    res.status(201).json({ status: 'success', data: newRoom });
  } catch (error) {
    next(error);
  }
});

app.put('/api/rooms/:id', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid Room ID', 400);

    const {
      number, type, capacity, floor, status, price, description,
      amenities, // Array like [{ amenityId: number, quantity?: number, notes?: string }] - This will REPLACE existing amenities
      imageIds   // Array of Media IDs [number] - This will REPLACE existing images
    } = req.body;

    // --- Transaction for Update ---
    const updatedRoom = await prisma.$transaction(async (tx) => {
      // 1. Get current room data (needed for image/amenity diff)
      const currentRoom = await tx.room.findUnique({
        where: { id },
        include: { images: { select: { id: true } }, amenities: { select: { amenityId: true } } }
      });
      if (!currentRoom) throw new AppError('Room not found', 404);

      // --- Prepare Image Update ---
      const currentImageIds = currentRoom.images.map(img => img.id);
      const newImageIds = imageIds && Array.isArray(imageIds) ? imageIds.map(id => parseInt(id)) : [];
      const imageIdsToConnect = newImageIds; // Connect all new IDs
      const imageIdsToDisconnect = currentImageIds.filter(id => !newImageIds.includes(id)); // Disconnect old IDs not in new list

      // --- Prepare Amenity Update ---
      // Simplest approach: Delete all existing and create new ones based on request
      const newAmenitiesData = amenities && Array.isArray(amenities) ? amenities.map((am: any) => ({
        amenityId: parseInt(am.amenityId),
        quantity: am.quantity ? parseInt(am.quantity) : 1,
        notes: am.notes
      })) : [];


      // 2. Update basic room info and relations in one go
      const roomUpdate = await tx.room.update({
        where: { id },
        data: {
          number,
          type: type as RoomType,
          capacity: capacity ? parseInt(capacity) : undefined,
          floor: floor ? parseInt(floor) : undefined,
          status: status as RoomStatus,
          price: price ? new Decimal(price) : undefined,
          description,
          // Update images: disconnect old, connect new
          images: {
            disconnect: imageIdsToDisconnect.map(id => ({ id })),
            connect: imageIdsToConnect.map(id => ({ id })),
          },
          // Update amenities: delete existing, create new
          amenities: {
            deleteMany: {}, // Delete all existing RoomAmenity for this room
            create: newAmenitiesData.map(am => ({ // Create new ones
              amenityId: am.amenityId,
              quantity: am.quantity,
              notes: am.notes,
            })),
          },
        },
        include: { building: true, images: true, amenities: { include: { amenity: true } } } // Include relations in response
      });

      // 3. Find Media records to delete physically (those that were disconnected)
      if (imageIdsToDisconnect.length > 0) {
        const mediaToDelete = await tx.media.findMany({
          where: { id: { in: imageIdsToDisconnect } },
          select: { id: true, path: true }
        });
        return { room: roomUpdate, mediaPathsToDelete: mediaToDelete.map(m => m.path) };
      }

      return { room: roomUpdate, mediaPathsToDelete: [] };
    });
    // --- End Transaction ---

    // 4. Delete physical files outside the transaction
    updatedRoom.mediaPathsToDelete.forEach(deleteFile);

    res.status(200).json({ status: 'success', data: updatedRoom.room });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      next(new AppError('Room or related entity not found during update', 404));
    } else {
      next(error);
    }
  }
});

// Add DELETE /api/rooms/:id route if needed

// --- Amenity Routes ---
// GET all amenities
app.get('/api/amenities', authMiddleware, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: { name: 'asc' },
      // Optionally include rooms count or details if needed frequently
      // include: { _count: { select: { rooms: true } } }
    });
    res.status(200).json({ status: 'success', results: amenities.length, data: amenities });
  } catch (error) {
    next(error);
  }
});

// POST create amenity
app.post('/api/amenities', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new AppError('Amenity name is required', 400);

    const newAmenity = await prisma.amenity.create({
      data: { name, description }
    });
    res.status(201).json({ status: 'success', data: newAmenity });
  } catch (error) {
    // Handle potential unique constraint error on name
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      next(new AppError('An amenity with this name already exists', 409)); // 409 Conflict
    } else {
      next(error);
    }
  }
});

// PUT update amenity
app.put('/api/amenities/:id', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid Amenity ID', 400);
    const { name, description } = req.body;
    if (!name) throw new AppError('Amenity name is required', 400);

    const updatedAmenity = await prisma.amenity.update({
      where: { id },
      data: { name, description },
    });
    res.status(200).json({ status: 'success', data: updatedAmenity });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Unique constraint violation
        next(new AppError('An amenity with this name already exists', 409));
      } else if (error.code === 'P2025') { // Record not found
        next(new AppError('Amenity not found', 404));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
});

// DELETE amenity
app.delete('/api/amenities/:id', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid Amenity ID', 400);

    // Use transaction to ensure related RoomAmenity are deleted first (if not using cascade delete)
    await prisma.$transaction(async (tx) => {
      // 1. Delete references in RoomAmenity first if cascade isn't automatic/reliable
      await tx.roomAmenity.deleteMany({ where: { amenityId: id } });
      // 2. Delete the Amenity itself
      await tx.amenity.delete({ where: { id } });
    });

    res.status(200).json({ status: 'success', message: 'Amenity deleted successfully' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      next(new AppError('Amenity not found', 404));
    } else {
      next(error);
    }
  }
});


// --- Maintenance Routes ---
app.get('/api/maintenances', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { roomId, status, assignedToId, buildingId } = req.query;
    const where: Prisma.MaintenanceWhereInput = {};

    if (status) where.status = status as MaintenanceStatus;
    if (assignedToId) where.assignedToId = parseInt(assignedToId as string);
    if (roomId) where.roomId = parseInt(roomId as string);
    if (buildingId) where.room = { buildingId: parseInt(buildingId as string) }; // Filter by building

    const maintenances = await prisma.maintenance.findMany({
      where,
      include: {
        room: { select: { id: true, number: true, building: { select: { id: true, name: true } } } },
        reportedBy: { select: { id: true, fullName: true, studentId: true } },
        assignedTo: { select: { id: true, fullName: true, position: true } },
        images: true // Include images
      },
      orderBy: { reportDate: 'desc' }
    });
    res.status(200).json({ status: 'success', results: maintenances.length, data: maintenances });
  } catch (error) {
    next(error);
  }
});

// Student report maintenance
app.post('/api/maintenances', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reporterUserId = req.user!.userId;
    const { roomId, issue, notes, imageIds } = req.body;

    if (!roomId || !issue) {
      throw new AppError('Room ID and issue description are required', 400);
    }

    // Find the student profile of the reporter
    const reporterProfile = await prisma.studentProfile.findUnique({
      where: { userId: reporterUserId },
      select: { id: true, roomId: true }
    });

    if (!reporterProfile) {
      throw new AppError('Student profile not found for the reporting user', 404);
    }

    // Optional: Verify the reported room matches the student's room or is a common area they can access
    // if (parseInt(roomId) !== reporterProfile.roomId) {
    //     // Check if it's a valid room ID even if not their own
    //     const roomExists = await prisma.room.findUnique({ where: { id: parseInt(roomId) }});
    //     if (!roomExists) throw new AppError('Reported room not found', 404);
    //     // Potentially add logic for common area reporting
    // }

    const newMaintenance = await prisma.maintenance.create({
      data: {
        room: { connect: { id: parseInt(roomId) } },
        reportedBy: { connect: { id: reporterProfile.id } }, // Connect using profile ID
        issue,
        notes,
        status: MaintenanceStatus.PENDING,
        reportDate: new Date(),
        images: imageIds && Array.isArray(imageIds) ? {
          connect: imageIds.map((id: number) => ({ id: id }))
        } : undefined
      },
      include: {
        room: { select: { number: true, building: { select: { name: true } } } },
        reportedBy: { select: { fullName: true } },
        images: true
      }
    });

    res.status(201).json({ status: 'success', data: newMaintenance });

  } catch (error) {
    next(error);
  }
});

// Update maintenance (assign staff, change status, add notes, change images)
app.put('/api/maintenances/:id', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid Maintenance ID', 400);

    const {
      issue, status, assignedToId, completedDate, notes,
      imageIds // Array of Media IDs [number] - This will REPLACE existing images
    } = req.body;

    // --- Transaction for Update ---
    const updatedMaintenanceResult = await prisma.$transaction(async (tx) => {
      // 1. Get current maintenance data
      const currentMaintenance = await tx.maintenance.findUnique({
        where: { id },
        include: { images: { select: { id: true } }, room: true } // Include room for status update
      });
      if (!currentMaintenance) throw new AppError('Maintenance request not found', 404);

      // --- Prepare Image Update ---
      const currentImageIds = currentMaintenance.images.map(img => img.id);
      const newImageIds = imageIds && Array.isArray(imageIds) ? imageIds.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
      const imageIdsToConnect = newImageIds;
      const imageIdsToDisconnect = currentImageIds.filter(id => !newImageIds.includes(id));

      // --- Prepare Update Data ---
      const updateData: Prisma.MaintenanceUpdateInput = {
        issue,
        status: status as MaintenanceStatus,
        assignedTo: assignedToId !== undefined
          ? (assignedToId ? { connect: { id: parseInt(assignedToId) } } : { disconnect: true })
          : undefined,
        completedDate: completedDate ? new Date(completedDate) : (status === MaintenanceStatus.COMPLETED ? new Date() : null), // Set complete date if status is COMPLETED
        notes,
        images: {
          disconnect: imageIdsToDisconnect.map(id => ({ id })),
          connect: imageIdsToConnect.map(id => ({ id })),
        }
      };

      // 2. Update the Maintenance record
      const updatedMaintenance = await tx.maintenance.update({
        where: { id },
        data: updateData,
        include: {
          room: { select: { id: true, number: true, building: { select: { id: true, name: true } } } },
          reportedBy: { select: { id: true, fullName: true } },
          assignedTo: { select: { id: true, fullName: true } },
          images: true
        }
      });

      // 3. Update Room Status if maintenance starts/completes
      if (status === MaintenanceStatus.IN_PROGRESS && currentMaintenance.room.status !== RoomStatus.UNDER_MAINTENANCE) {
        await tx.room.update({ where: { id: currentMaintenance.roomId }, data: { status: RoomStatus.UNDER_MAINTENANCE } });
      } else if (status === MaintenanceStatus.COMPLETED && currentMaintenance.room.status === RoomStatus.UNDER_MAINTENANCE) {
        // Determine the correct status after maintenance (Available or Full)
        const roomAfterUpdate = await tx.room.findUnique({ where: { id: currentMaintenance.roomId } });
        const nextStatus = roomAfterUpdate && roomAfterUpdate.actualOccupancy >= roomAfterUpdate.capacity ? RoomStatus.FULL : RoomStatus.AVAILABLE;
        await tx.room.update({ where: { id: currentMaintenance.roomId }, data: { status: nextStatus } });
      }

      // 4. Find Media records to delete physically
      let mediaPathsToDelete: string[] = [];
      if (imageIdsToDisconnect.length > 0) {
        const mediaToDelete = await tx.media.findMany({
          where: { id: { in: imageIdsToDisconnect } },
          select: { path: true }
        });
        mediaPathsToDelete = mediaToDelete.map(m => m.path);
      }

      return { maintenance: updatedMaintenance, mediaPathsToDelete };

    });
    // --- End Transaction ---

    // 5. Delete physical files
    updatedMaintenanceResult.mediaPathsToDelete.forEach(deleteFile);


    res.status(200).json({ status: 'success', data: updatedMaintenanceResult.maintenance });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      next(new AppError('Maintenance request or related entity not found', 404));
    } else {
      next(error);
    }
  }
});

// DELETE maintenance request
app.delete('/api/maintenances/:id', authMiddleware, checkRole([Role.ADMIN, Role.STAFF]), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid Maintenance ID', 400);

    const deletedResult = await prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenance.findUnique({
        where: { id },
        include: { images: { select: { id: true, path: true } }, room: true }
      });

      if (!maintenance) {
        throw new AppError('Maintenance request not found', 404);
      }

      const imageIdsToDelete = maintenance.images.map(img => img.id);
      const imagePathsToDelete = maintenance.images.map(img => img.path);

      // Disconnect images before deleting media if necessary, or handle via cascade
      await tx.maintenance.update({
        where: { id },
        data: { images: { disconnect: imageIdsToDelete.map(id => ({ id })) } }
      });


      // Delete the maintenance record
      await tx.maintenance.delete({ where: { id } });

      // Delete associated Media records
      if (imageIdsToDelete.length > 0) {
        await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
      }

      // Update room status if it was under maintenance
      if (maintenance.room.status === RoomStatus.UNDER_MAINTENANCE && maintenance.status !== MaintenanceStatus.COMPLETED) {
        const roomAfterUpdate = await tx.room.findUnique({ where: { id: maintenance.roomId } });
        const nextStatus = roomAfterUpdate && roomAfterUpdate.actualOccupancy >= roomAfterUpdate.capacity ? RoomStatus.FULL : RoomStatus.AVAILABLE;
        await tx.room.update({ where: { id: maintenance.roomId }, data: { status: nextStatus } });
      }

      return { imagePathsToDelete };
    });

    // Delete physical files
    deletedResult.imagePathsToDelete.forEach(deleteFile);

    res.status(200).json({ status: 'success', message: 'Maintenance request deleted successfully' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      next(new AppError('Maintenance request not found', 404));
    } else {
      next(error);
    }
  }
});


// --- TODO: Add Routes for ---
// - Invoices (GET, POST, PUT, DELETE - with items)
// - Payments (CRUD already partially there, refine permissions/logic)
// - Utility Meter Readings (GET, POST, PUT, DELETE)
// - Room Transfers (GET, POST, PUT for approval/status change)
// - Vehicle Registrations (GET, POST, PUT, DELETE - including image handling like Maintenance)
// - Staff Profiles (GET, POST, PUT, DELETE - maybe use /api/users/:userId/profile)

// --- Global Error Handler ---
// MUST be the last middleware
app.use((err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('ERROR ', err);

  // Handle specific Prisma errors if needed
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Foreign key constraint failed
    if (err.code === 'P2003') {
      return res.status(400).json({ status: 'fail', message: `Invalid input: A related record does not exist. Field: ${err.meta?.field_name}` });
    }
    // Record to update not found
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'fail', message: `Resource not found. ${err.meta?.cause || ''}` });
    }
    // Unique constraint violation
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[])?.join(', ');
      return res.status(409).json({ status: 'fail', message: `Duplicate value detected for field(s): ${fields}` }); // 409 Conflict
    }
    // Add more Prisma error codes as needed
  }

  // Handle operational errors (created with AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Show stack in dev
    });
  }

  // Handle generic errors (Multer, etc.) - Try to provide specific messages if possible
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ status: 'fail', message: `File upload error: ${err.message} (Code: ${err.code})` });
  }


  // Handle unexpected errors (programming or other unknown errors)
  // Don't leak error details in production
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went very wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// --- Server Start ---
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not Set'}`);
  console.log(`Node ENV: ${process.env.NODE_ENV}`);
  console.log('=================================');
  // Log registered routes or main endpoints if helpful
});

// --- Graceful Shutdown ---
const shutdown = async (signal: string) => {
  console.log(`\n${signal} signal received. Shutting down gracefully...`);
  try {
    // Add any cleanup tasks here (e.g., closing connections)
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT')); // Handle Ctrl+C

// --- Unhandled Exceptions/Rejections ---
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(error.name, error.message);
  console.error(error.stack);
  // Perform minimal cleanup if possible, then exit
  process.exit(1); // Mandatory exit
});

process.on('unhandledRejection', (reason: any, promise) => {
  console.error('🚨 UNHANDLED REJECTION! Shutting down...');
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Perform minimal cleanup if possible, then exit
  process.exit(1); // Mandatory exit
});

export default app; // Export app for testing or other uses
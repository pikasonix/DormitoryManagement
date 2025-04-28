"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://frontend-pc0niwnjr-house-of-hope.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 600, // 10 menit
    preflightContinue: false
};
// Basic middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Ensure uploads directory exists first
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Serve static files
app.use('/uploads', express_1.default.static(uploadsDir, {
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
    }
}));
// Multer configuration
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Format file ${file.originalname} tidak didukung`));
        }
    }
});
// Upload middleware
const uploadMiddleware = (req, res, next) => {
    const uploadFields = upload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'documents', maxCount: 5 }
    ]);
    uploadFields(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    res.status(400).json({
                        message: 'Error upload file',
                        error: 'Ukuran file terlalu besar (maksimal 20MB)'
                    });
                    return;
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    res.status(400).json({
                        message: 'Error upload file',
                        error: 'Terlalu banyak file (maksimal 5 dokumen)'
                    });
                    return;
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    res.status(400).json({
                        message: 'Error upload file',
                        error: 'Field tidak sesuai (gunakan photo atau documents)'
                    });
                    return;
                }
            }
            res.status(400).json({
                message: 'Error upload file',
                error: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
            return;
        }
        // Log request body dan files untuk debug
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);
        next();
    });
};
// Auth routes
app.post('/api/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            res.status(400).json({
                message: 'Email dan password harus diisi'
            });
            return;
        }
        // Find user
        const user = yield prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            res.status(401).json({
                message: 'Email atau password salah'
            });
            return;
        }
        // Check password
        const isValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isValid) {
            res.status(401).json({
                message: 'Email atau password salah'
            });
            return;
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1d' });
        // Send response
        res.json({
            message: 'Login berhasil',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Test route
app.get('/test', (_req, res) => {
    res.json({ message: 'Server is running' });
});
// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
// Residents routes
app.get('/api/residents', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const residents = yield prisma.resident.findMany({
            include: {
                documents: true,
                room: true
            }
        });
        res.json(residents);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Create resident
app.post('/api/residents', uploadMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const data = JSON.parse(req.body.data);
        const files = req.files;
        // Validasi status
        if (!Object.values(client_1.ResidentStatus).includes(data.status)) {
            res.status(400).json({
                message: `Status tidak valid: ${data.status}`
            });
            return;
        }
        // Validasi field berdasarkan status
        const requiredFields = [
            'name', 'nik', 'birthPlace', 'birthDate', 'gender',
            'address', 'education', 'schoolName', 'assistance',
            'roomId', 'status'
        ];
        // Tambahkan validasi khusus untuk ALUMNI
        if (data.status === client_1.ResidentStatus.ALUMNI) {
            requiredFields.push('exitDate', 'alumniNotes');
        }
        const missingFields = requiredFields.filter(field => !data[field]);
        if (missingFields.length > 0) {
            res.status(400).json({
                message: 'Semua field wajib harus diisi',
                missingFields
            });
            return;
        }
        // Cek apakah NIK sudah ada
        const existingResident = yield prisma.resident.findUnique({
            where: { nik: data.nik }
        });
        if (existingResident) {
            res.status(400).json({
                message: 'NIK sudah terdaftar',
                error: 'DUPLICATE_NIK'
            });
            return;
        }
        // Format data untuk create
        const residentData = Object.assign(Object.assign({ name: data.name, nik: data.nik, birthPlace: data.birthPlace, birthDate: data.birthDate, gender: data.gender, address: data.address, phone: data.phone || null, education: data.education, schoolName: data.schoolName, grade: data.grade || null, major: data.major || null, assistance: data.assistance, details: data.details || null, status: data.status, createdAt: new Date() }, (data.status === client_1.ResidentStatus.ALUMNI ? {
            exitDate: new Date(data.exitDate),
            alumniNotes: data.alumniNotes
        } : {
            exitDate: null,
            alumniNotes: null
        })), { room: {
                connect: { id: parseInt(data.roomId) }
            }, documents: {
                create: [
                    ...((files === null || files === void 0 ? void 0 : files.photo) ? [{
                            name: files.photo[0].originalname,
                            path: `/uploads/${files.photo[0].filename}`,
                            type: 'photo'
                        }] : []),
                    ...((files === null || files === void 0 ? void 0 : files.documents) ?
                        files.documents.map(file => ({
                            name: file.originalname,
                            path: `/uploads/${file.filename}`,
                            type: 'document'
                        }))
                        : [])
                ]
            } });
        // Buat resident
        const resident = yield prisma.resident.create({
            data: residentData,
            include: {
                room: true,
                documents: true
            }
        });
        // Kirim response
        res.status(201).json({
            message: 'Data penghuni berhasil ditambahkan',
            data: {
                id: resident.id,
                name: resident.name,
                status: resident.status,
                exitDate: resident.exitDate
            }
        });
        return;
    }
    catch (error) {
        console.error('Error creating resident:', error);
        // Handle Prisma errors
        if (error.code === 'P2002' && ((_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.includes('nik'))) {
            res.status(400).json({
                message: 'NIK sudah terdaftar',
                error: 'DUPLICATE_NIK'
            });
            return;
        }
        res.status(500).json({
            message: 'Gagal membuat data penghuni',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
        return;
    }
}));
// Rooms routes
app.get('/api/rooms', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Fetching rooms...');
        const rooms = yield prisma.room.findMany({
            include: {
                residents: true,
                _count: {
                    select: { residents: true }
                }
            }
        });
        // Transform data untuk menambahkan info okupansi
        const roomsWithOccupancy = rooms.map(room => ({
            id: room.id,
            number: room.number,
            type: room.type,
            capacity: room.capacity,
            floor: room.floor,
            description: room.description,
            occupancy: room._count.residents,
            availableSpace: room.capacity - room._count.residents,
            residents: room.residents
        }));
        res.json(roomsWithOccupancy);
    }
    catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({
            message: 'Gagal mengambil data kamar',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Get single room
app.get('/api/rooms/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const room = yield prisma.room.findUnique({
            where: { id },
            include: {
                residents: true,
                _count: {
                    select: { residents: true }
                }
            }
        });
        if (!room) {
            res.status(404).json({ message: 'Kamar tidak ditemukan' });
            return;
        }
        // Add occupancy info
        const roomWithOccupancy = Object.assign(Object.assign({}, room), { occupancy: room._count.residents, availableSpace: room.capacity - room._count.residents });
        res.json(roomWithOccupancy);
    }
    catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({
            message: 'Gagal mengambil data kamar',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Get single resident
app.get('/api/residents/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const resident = yield prisma.resident.findUnique({
            where: { id },
            include: {
                documents: true,
                room: true
            }
        });
        if (!resident) {
            res.status(404).json({ message: 'Penghuni tidak ditemukan' });
            return;
        }
        res.json(resident);
    }
    catch (error) {
        console.error('Error fetching resident:', error);
        res.status(500).json({
            message: 'Gagal mengambil data penghuni',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Update resident
app.put('/api/residents/:id', uploadMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const files = req.files;
        console.log('Update request for resident:', id);
        console.log('Request body:', req.body);
        console.log('Request files:', files);
        // Parse resident data
        let data;
        try {
            data = JSON.parse(req.body.data);
        }
        catch (e) {
            console.error('Error parsing data:', e);
            res.status(400).json({
                message: 'Format data tidak valid',
                error: e.message
            });
            return;
        }
        // Start transaction
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // Update resident data
            yield tx.resident.update({
                where: { id: Number(id) },
                data: {
                    name: data.name,
                    nik: data.nik,
                    birthPlace: data.birthPlace,
                    birthDate: data.birthDate,
                    gender: data.gender,
                    address: data.address,
                    phone: data.phone || null,
                    education: data.education,
                    schoolName: data.schoolName,
                    grade: data.grade || null,
                    major: data.major || null,
                    assistance: data.assistance,
                    details: data.details || null,
                    status: data.status,
                    exitDate: data.exitDate ? new Date(data.exitDate) : null,
                    alumniNotes: data.alumniNotes || null,
                    roomId: parseInt(data.roomId)
                }
            });
            // Handle photo if uploaded
            if ((_a = files === null || files === void 0 ? void 0 : files.photo) === null || _a === void 0 ? void 0 : _a[0]) {
                console.log('Processing photo:', files.photo[0].originalname);
                // Delete old photo
                yield tx.document.deleteMany({
                    where: {
                        residentId: Number(id),
                        type: 'photo'
                    }
                });
                // Create new photo
                yield tx.document.create({
                    data: {
                        name: files.photo[0].originalname,
                        path: `/uploads/${files.photo[0].filename}`,
                        type: 'photo',
                        residentId: Number(id)
                    }
                });
            }
            // Handle documents if uploaded
            if ((_b = files === null || files === void 0 ? void 0 : files.documents) === null || _b === void 0 ? void 0 : _b.length) {
                console.log('Processing documents:', files.documents.map(f => f.originalname));
                // Delete old documents
                yield tx.document.deleteMany({
                    where: {
                        residentId: Number(id),
                        type: 'document'
                    }
                });
                // Create new documents
                yield tx.document.createMany({
                    data: files.documents.map(file => ({
                        name: file.originalname,
                        path: `/uploads/${file.filename}`,
                        type: 'document',
                        residentId: Number(id)
                    }))
                });
            }
            // Get final data
            return yield tx.resident.findUnique({
                where: { id: Number(id) },
                include: {
                    room: true,
                    documents: true
                }
            });
        }));
        console.log('Update completed successfully');
        res.json({
            message: 'Data penghuni berhasil diperbarui',
            data: result
        });
    }
    catch (error) {
        console.error('Error updating resident:', error);
        res.status(500).json({
            message: 'Gagal memperbarui data penghuni',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Auth middleware
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            res.status(401).json({ message: 'Token tidak ditemukan' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Token tidak valid' });
        return;
    }
});
// Check auth status
app.get('/api/auth/me', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'User tidak terautentikasi' });
            return;
        }
        const user = yield prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });
        if (!user) {
            res.status(404).json({ message: 'User tidak ditemukan' });
            return;
        }
        res.json({
            user,
            isAuthenticated: true
        });
    }
    catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            message: 'Gagal memeriksa status autentikasi',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Payments routes
app.get('/api/payments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { residentId } = req.query;
        console.log('Getting payments with query:', { residentId });
        const payments = yield prisma.payment.findMany({
            where: {
                residentId: residentId ? Number(residentId) : undefined
            },
            include: {
                resident: {
                    include: {
                        room: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        console.log(`Found ${payments.length} payments`);
        res.json(payments);
    }
    catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({
            message: 'Gagal mengambil data pembayaran',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
app.post('/api/payments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { residentId, amount, type, status, notes } = req.body;
        console.log('Creating payment:', req.body);
        const payment = yield prisma.payment.create({
            data: {
                residentId: Number(residentId),
                amount: Number(amount),
                type,
                status,
                notes,
                date: new Date()
            },
            include: {
                resident: {
                    include: {
                        room: true
                    }
                }
            }
        });
        console.log('Payment created:', payment);
        res.status(201).json(payment);
    }
    catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({
            message: 'Gagal membuat pembayaran',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
app.get('/api/payments/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const payment = yield prisma.payment.findUnique({
            where: { id: Number(id) },
            include: {
                resident: {
                    include: {
                        room: true
                    }
                }
            }
        });
        if (!payment) {
            return res.status(404).json({ message: 'Pembayaran tidak ditemukan' });
        }
        return res.json(payment);
    }
    catch (error) {
        console.error('Error getting payment:', error);
        return res.status(500).json({ message: 'Gagal mengambil data pembayaran' });
    }
}));
app.put('/api/payments/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { amount, type, status, notes } = req.body;
        const payment = yield prisma.payment.update({
            where: { id: Number(id) },
            data: {
                amount: Number(amount),
                type,
                status,
                notes
            },
            include: {
                resident: {
                    include: {
                        room: true
                    }
                }
            }
        });
        return res.json(payment);
    }
    catch (error) {
        console.error('Error updating payment:', error);
        return res.status(500).json({ message: 'Gagal mengupdate pembayaran' });
    }
}));
app.delete('/api/payments/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.payment.delete({
            where: { id: Number(id) }
        });
        return res.json({ message: 'Pembayaran berhasil dihapus' });
    }
    catch (error) {
        console.error('Error deleting payment:', error);
        return res.status(500).json({ message: 'Gagal menghapus pembayaran' });
    }
}));
// Facilities routes
app.get('/api/facilities', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const facilities = yield prisma.facility.findMany({
            include: {
                bookings: {
                    where: {
                        startTime: {
                            lte: new Date()
                        },
                        endTime: {
                            gte: new Date()
                        }
                    },
                    include: {
                        resident: true
                    }
                },
                maintenanceLogs: {
                    orderBy: {
                        startDate: 'desc'
                    }
                }
            }
        });
        res.json(facilities);
    }
    catch (error) {
        console.error('Error getting facilities:', error);
        res.status(500).json({ message: 'Gagal mengambil data fasilitas' });
    }
}));
app.post('/api/facilities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, type, capacity, status, image, description, location, maintenanceSchedule } = req.body;
        console.log('Creating facility with data:', req.body);
        const facility = yield prisma.facility.create({
            data: {
                name,
                type,
                capacity: parseInt(capacity),
                status,
                image,
                description,
                location,
                maintenanceSchedule
            }
        });
        console.log('Facility created:', facility);
        res.status(201).json(facility);
    }
    catch (error) {
        console.error('Error creating facility:', error);
        res.status(500).json({
            message: 'Gagal membuat fasilitas baru',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));
app.post('/api/facilities/:id/bookings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { residentId, startTime, endTime, purpose, notes } = req.body;
        const booking = yield prisma.booking.create({
            data: {
                facilityId: parseInt(id),
                residentId: parseInt(residentId),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                purpose,
                notes,
                status: 'pending'
            },
            include: {
                facility: true,
                resident: true
            }
        });
        res.status(201).json(booking);
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Gagal membuat booking' });
    }
}));
app.post('/api/facilities/:id/maintenance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { type, description, startDate, status, notes } = req.body;
        const maintenanceLog = yield prisma.maintenanceLog.create({
            data: {
                facilityId: parseInt(id),
                type,
                description,
                startDate: new Date(startDate),
                status,
                notes
            },
            include: {
                facility: true
            }
        });
        if (status === 'in_progress') {
            yield prisma.facility.update({
                where: { id: parseInt(id) },
                data: { status: 'maintenance' }
            });
        }
        res.status(201).json(maintenanceLog);
    }
    catch (error) {
        console.error('Error creating maintenance log:', error);
        res.status(500).json({ message: 'Gagal membuat log maintenance' });
    }
}));
// Update facility
app.put('/api/facilities/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, type, capacity, status, image, description, location, maintenanceSchedule } = req.body;
        const facility = yield prisma.facility.update({
            where: { id: Number(id) },
            data: {
                name,
                type,
                capacity: parseInt(capacity),
                status,
                image,
                description,
                location,
                maintenanceSchedule
            }
        });
        res.json(facility);
    }
    catch (error) {
        console.error('Error updating facility:', error);
        res.status(500).json({ message: 'Gagal memperbarui fasilitas' });
    }
}));
// Delete facility
app.delete('/api/facilities/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.facility.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Fasilitas berhasil dihapus' });
    }
    catch (error) {
        console.error('Error deleting facility:', error);
        res.status(500).json({ message: 'Gagal menghapus fasilitas' });
    }
}));
// Get facility by ID
app.get('/api/facilities/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const facility = yield prisma.facility.findUnique({
            where: {
                id: Number(id)
            },
            include: {
                bookings: {
                    include: {
                        resident: true
                    },
                    orderBy: {
                        startTime: 'asc'
                    }
                },
                maintenanceLogs: {
                    where: {
                        status: 'in_progress'
                    }
                }
            }
        });
        if (!facility) {
            res.status(404).json({ message: 'Fasilitas tidak ditemukan' });
            return;
        }
        res.json(facility);
        return;
    }
    catch (error) {
        console.error('Error getting facility:', error);
        res.status(500).json({ message: 'Gagal mengambil data fasilitas' });
        return;
    }
}));
// Update maintenance log
app.put('/api/facilities/maintenance/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { type, description, startDate, status, endDate, notes } = req.body;
        const maintenanceLog = yield prisma.maintenanceLog.update({
            where: { id: Number(id) },
            data: {
                type,
                description,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                status,
                notes
            },
            include: {
                facility: true
            }
        });
        // Update facility status if maintenance is completed
        if (status === 'completed') {
            yield prisma.facility.update({
                where: { id: maintenanceLog.facilityId },
                data: { status: 'available' }
            });
        }
        res.json(maintenanceLog);
        return;
    }
    catch (error) {
        console.error('Error updating maintenance log:', error);
        res.status(500).json({ message: 'Gagal mengupdate log maintenance' });
        return;
    }
}));
// Delete maintenance log
app.delete('/api/facilities/maintenance/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Get maintenance log first to check facility status
        const maintenanceLog = yield prisma.maintenanceLog.findUnique({
            where: { id: Number(id) },
            include: {
                facility: true
            }
        });
        if (!maintenanceLog) {
            res.status(404).json({ message: 'Log maintenance tidak ditemukan' });
            return;
        }
        // Delete the maintenance log
        yield prisma.maintenanceLog.delete({
            where: { id: Number(id) }
        });
        // If this was an active maintenance, update facility status back to available
        if (maintenanceLog.status === 'in_progress' && maintenanceLog.facility.status === 'maintenance') {
            yield prisma.facility.update({
                where: { id: maintenanceLog.facilityId },
                data: { status: 'available' }
            });
        }
        res.json({ message: 'Log maintenance berhasil dihapus' });
        return;
    }
    catch (error) {
        console.error('Error deleting maintenance log:', error);
        res.status(500).json({ message: 'Gagal menghapus log maintenance' });
        return;
    }
}));
// Log registered routes on startup
console.log('\n=== Registered Routes ===');
console.log('Available endpoints:');
console.log('- Test: http://localhost:5002/test');
console.log('- Health: http://localhost:5002/health');
console.log('- Login: http://localhost:5002/api/auth/login');
console.log('- Rooms: http://localhost:5002/api/rooms');
console.log('- Residents: http://localhost:5002/api/residents');
console.log('- Payments: http://localhost:5002/api/payments');
console.log('- Facilities: http://localhost:5002/api/facilities');
console.log('=================================');
// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log('Available endpoints:');
    console.log('- Test: http://localhost:5002/test');
    console.log('- Health: http://localhost:5002/health');
    console.log('- Login: http://localhost:5002/api/auth/login');
    console.log('- Rooms: http://localhost:5002/api/rooms');
    console.log('- Residents: http://localhost:5002/api/residents');
    console.log('- Payments: http://localhost:5002/api/payments');
    console.log('=================================');
});
// Handle shutdown
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Shutting down...');
    yield prisma.$disconnect();
    process.exit(0);
}));
// Upload files for resident
app.post('/api/residents/:id/files', uploadMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const files = req.files;
        console.log('Files upload request for resident:', id);
        console.log('Files:', files);
        // Check if resident exists
        const existingResident = yield prisma.resident.findUnique({
            where: { id: Number(id) }
        });
        if (!existingResident) {
            res.status(404).json({ message: 'Penghuni tidak ditemukan' });
            return;
        }
        // Handle photo
        if ((_a = files === null || files === void 0 ? void 0 : files.photo) === null || _a === void 0 ? void 0 : _a[0]) {
            yield prisma.document.deleteMany({
                where: {
                    residentId: Number(id),
                    type: 'photo'
                }
            });
            yield prisma.document.create({
                data: {
                    name: files.photo[0].originalname,
                    path: `/uploads/${files.photo[0].filename}`,
                    type: 'photo',
                    residentId: Number(id)
                }
            });
        }
        // Handle documents
        if ((_b = files === null || files === void 0 ? void 0 : files.documents) === null || _b === void 0 ? void 0 : _b.length) {
            yield prisma.document.deleteMany({
                where: {
                    residentId: Number(id),
                    type: 'document'
                }
            });
            yield prisma.document.createMany({
                data: files.documents.map(file => ({
                    name: file.originalname,
                    path: `/uploads/${file.filename}`,
                    type: 'document',
                    residentId: Number(id)
                }))
            });
        }
        // Get updated data
        const updatedResident = yield prisma.resident.findUnique({
            where: { id: Number(id) },
            include: {
                room: true,
                documents: true
            }
        });
        res.json({
            message: 'File berhasil diupload',
            data: updatedResident
        });
    }
    catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({
            message: 'Gagal mengupload file',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}));
// Upload photo for resident
app.post('/api/residents/:id/photo', upload.single('photo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            res.status(400).json({ message: 'Tidak ada file yang diupload' });
            return;
        }
        // Check if resident exists
        const existingResident = yield prisma.resident.findUnique({
            where: { id: Number(id) }
        });
        if (!existingResident) {
            res.status(404).json({ message: 'Penghuni tidak ditemukan' });
            return;
        }
        // Delete old photo
        yield prisma.document.deleteMany({
            where: {
                residentId: Number(id),
                type: 'photo'
            }
        });
        // Create new photo document
        yield prisma.document.create({
            data: {
                name: file.originalname,
                path: `/uploads/${file.filename}`,
                type: 'photo',
                residentId: Number(id)
            }
        });
        res.json({ message: 'Foto berhasil diupload' });
    }
    catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({
            message: 'Gagal mengupload foto',
            error: process.env.NODE_ENV === 'development' ?
                (error instanceof Error ? error.message : String(error)) :
                undefined
        });
    }
}));
// Upload single document for resident
app.post('/api/residents/:id/document', upload.single('document'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            res.status(400).json({ message: 'Tidak ada file yang diupload' });
            return;
        }
        // Check if resident exists
        const existingResident = yield prisma.resident.findUnique({
            where: { id: Number(id) }
        });
        if (!existingResident) {
            res.status(404).json({ message: 'Penghuni tidak ditemukan' });
            return;
        }
        // Create new document
        yield prisma.document.create({
            data: {
                name: file.originalname,
                path: `/uploads/${file.filename}`,
                type: 'document',
                residentId: Number(id)
            }
        });
        res.json({ message: 'Dokumen berhasil diupload' });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({
            message: 'Gagal mengupload dokumen',
            error: process.env.NODE_ENV === 'development' ?
                error instanceof Error ? error.message : String(error) :
                undefined
        });
    }
}));
// Global error handler
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ?
            err instanceof Error ? err.message : String(err) :
            undefined
    });
});
// Handle unknown errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason instanceof Error ? reason.message : String(reason));
});
exports.default = app;

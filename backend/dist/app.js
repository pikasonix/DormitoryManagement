"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
// Import router chính
const routes_1 = __importDefault(require("./routes"));
// Import middleware xử lý lỗi global
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
// --- Cấu hình CORS ---
const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
    /\.vercel\.app$/,
    // Allow local network IPs in development
    ...(isDev ? [/^http:\/\/192\.168\.\d+\.\d+:\d+$/] : []),
];
const corsOptions = {
    origin: (origin, callback) => {
        // In development, we can be more permissive
        if (isDev && !origin) {
            callback(null, true);
            return;
        }
        if (!origin || allowedOrigins.some(allowed => typeof allowed === 'string'
            ? allowed === origin
            : allowed.test(origin))) {
            callback(null, true);
        }
        else {
            console.error(`[CORS] Origin ${origin} not allowed`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400
};
// --- Áp dụng Middleware Cơ bản ---
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: Object.assign(Object.assign({}, helmet_1.default.contentSecurityPolicy.getDefaultDirectives()), { "img-src": ["'self'", "data:", "blob:", "http://localhost:5002", "*"] })
    },
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve uploaded files
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
app.use((req, _res, next) => {
    console.log(`[Request Log] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});
// --- Gắn API Routes Chính ---
app.use('/api', routes_1.default);
// --- Xử lý Route không khớp (404 Not Found) ---
app.use((_req, res) => {
    res.status(404).json({
        status: 'fail',
        message: 'Endpoint không tồn tại.'
    });
});
// --- Global Error Handling Middleware ---
app.use(error_middleware_1.errorMiddleware);
exports.default = app;

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
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load .env first
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// --- Log và Kiểm tra Cấu hình ---
console.log('--- Application Configuration ---');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`PORT: ${process.env.PORT || '5002 (default)'}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not Set'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Not Set - Using default!'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set (hidden)' : 'Not Set!'}`);
console.log('---------------------------------');
// --- Kiểm tra biến môi trường bắt buộc ---
try {
    if (!process.env.DATABASE_URL)
        throw new Error('DATABASE_URL is missing');
    if (!process.env.JWT_SECRET)
        console.warn('[ENV Warning] JWT_SECRET is missing, using default insecure key!');
    console.log('[ENV Check] Required environment variables checked.');
}
catch (error) {
    console.error('[ENV Check] Fatal Error:', error.message);
    process.exit(1);
}
// --- Xử lý Lỗi không mong muốn (Process Level) ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION!');
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION!');
    console.error('Uncaught Exception:', error.name, error.message);
    console.error(error.stack);
    process.exit(1);
});
// --- Khởi động Server và Kiểm tra Kết nối DB ---
const PORT = Number(process.env.PORT) || 5002;
let server;
const initializeApp = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[DB Check] Attempting to connect to the database...');
        yield prisma.$connect();
        console.log('[DB Check] Database connected successfully!');
        server = http_1.default.createServer(app_1.default);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 Server listening on port ${PORT}(http://localhost:${PORT})`);
            console.log(`   Network access via: http://<your-ip>:${PORT}`);
            console.log(`   Press Ctrl+C to stop\n`);
        });
    }
    catch (error) {
        console.error('[Initialization] Failed to initialize application:', error);
        yield prisma.$disconnect().catch(err => console.error('[DB] Error disconnecting after failed init:', err));
        process.exit(1);
    }
});
// --- Graceful Shutdown ---
const shutdown = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`\n${signal} signal received. Shutting down gracefully...`);
    if (server) {
        server.close(() => __awaiter(void 0, void 0, void 0, function* () {
            console.log('[Server] HTTP server closed.');
            try {
                yield prisma.$disconnect();
                console.log('[DB] Database connection closed.');
                process.exit(0);
            }
            catch (error) {
                console.error('[DB] Error disconnecting from database:', error);
                process.exit(1);
            }
        }));
        setTimeout(() => {
            console.error('[Server] Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    }
    else {
        console.log('[Server] Server was not running. Exiting.');
        yield prisma.$disconnect().catch(err => console.error('[DB] Error disconnecting during shutdown:', err));
        process.exit(0);
    }
});
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
initializeApp();

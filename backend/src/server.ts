import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config(); // Load .env first

import app from './app';
import http from 'http';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  if (!process.env.JWT_SECRET) console.warn('[ENV Warning] JWT_SECRET is missing, using default insecure key!');
  console.log('[ENV Check] Required environment variables checked.');
} catch (error: any) {
  console.error('[ENV Check] Fatal Error:', error.message);
  process.exit(1);
}

// --- Xử lý Lỗi không mong muốn (Process Level) ---
process.on('unhandledRejection', (reason: any, promise) => {
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
let server: http.Server;

const initializeApp = async () => {
  try {
    console.log('[DB Check] Attempting to connect to the database...');
    await prisma.$connect();
    console.log('[DB Check] Database connected successfully!');

    server = http.createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server listening on port ${PORT}(http://localhost:${PORT})`);
      console.log(`   Network access via: http://<your-ip>:${PORT}`);
      console.log(`   Press Ctrl+C to stop\n`);
    });

  } catch (error) {
    console.error('[Initialization] Failed to initialize application:', error);
    await prisma.$disconnect().catch(err => console.error('[DB] Error disconnecting after failed init:', err));
    process.exit(1);
  }
};

// --- Graceful Shutdown ---
const shutdown = async (signal: string) => {
  console.log(`\n${signal} signal received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      try {
        await prisma.$disconnect();
        console.log('[DB] Database connection closed.');
        process.exit(0);
      } catch (error) {
        console.error('[DB] Error disconnecting from database:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);

  } else {
    console.log('[Server] Server was not running. Exiting.');
    await prisma.$disconnect().catch(err => console.error('[DB] Error disconnecting during shutdown:', err));
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

initializeApp();
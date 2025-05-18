import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';

// Import router chính
import apiRouter from './routes';

// Import middleware xử lý lỗi global
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// --- Cấu hình CORS ---
const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  /\.vercel\.app$/,
];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // For development, allow all origins

    if (isDev) {
      callback(null, true);
      return;
    }

    if (!origin || allowedOrigins.some(allowed =>
      typeof allowed === 'string'
        ? allowed === origin
        : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "http://localhost:5002", "*"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[Request Log] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// --- Gắn API Routes Chính ---
app.use('/api', apiRouter);

// --- Xử lý Route không khớp (404 Not Found) ---
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'fail',
    message: 'Endpoint không tồn tại.'
  });
});

// --- Global Error Handling Middleware ---
app.use(errorMiddleware);

export default app;
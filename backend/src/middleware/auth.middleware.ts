import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

// JWT payload structure
interface JwtPayload {
  userId: number;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';

// Authentication middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new Error('Authentication token is required and must be Bearer type'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();

  } catch (error: any) {
    let errorMessage = 'Invalid or expired token';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Authentication token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid authentication token';
    } else {
      console.error('Auth middleware error:', error);
    }
    next(new Error(errorMessage));
  }
};

// Role-based access control middleware
export const checkRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new Error('User authentication data is missing'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new Error('Forbidden: You do not have permission to access this resource'));
    }

    next();
  };
};
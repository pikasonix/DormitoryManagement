import { Role } from '@prisma/client';

interface AuthenticatedUser {
  userId: number;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export { };
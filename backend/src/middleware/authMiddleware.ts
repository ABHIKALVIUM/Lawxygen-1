import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface User {
      userId?: string;
      id?: string;
      email?: string;
      name?: string;
      avatar_url?: string;
    }
  }
}

export type AuthRequest = Request;

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'TokenExpired', message: 'Access token expired' });
    } else {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  }
};

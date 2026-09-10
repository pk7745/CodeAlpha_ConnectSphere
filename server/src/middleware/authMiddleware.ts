import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import { sanitizeUser } from '../utils/sanitize';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required',
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Expected: Bearer <token>',
      });
      return;
    }

    const token = parts[1];
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      res.status(401).json({
        error: 'Unauthorized',
        message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid or tampered token',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authenticated user no longer exists',
      });
      return;
    }

    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication processing failure',
    });
  }
}
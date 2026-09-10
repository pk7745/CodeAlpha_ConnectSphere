import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import { sanitizeUser } from '../utils/sanitize';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export async function socketAuthMiddleware(
  socket: TypedSocket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    // Check auth token in handshake auth or authorization header
    let token: string | undefined = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.authorization) {
      const parts = socket.handshake.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      next(new Error('Authentication token required'));
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      next(new Error(err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid or tampered token'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      next(new Error('Authenticated user no longer exists'));
      return;
    }

    socket.data.user = sanitizeUser(user);
    next();
  } catch (error) {
    console.error('[SocketAuthMiddleware] Internal error during authentication');
    next(new Error('Authentication internal failure'));
  }
}
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import { socketAuthMiddleware } from './authMiddleware';
import { registerMeetingHandlers } from './meetingHandler';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types';

export type AppSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let ioInstance: AppSocketServer | null = null;

export function initSocketServer(server: http.Server): AppSocketServer {
  const configuredOrigins = config.clientUrl
    ? config.clientUrl.split(',').map((u) => u.trim()).filter(Boolean)
    : [];

  const socketCorsOrigin =
    configuredOrigins.length > 0 && !configuredOrigins.includes('*')
      ? configuredOrigins
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => callback(null, true);

  const io: AppSocketServer = new SocketIOServer(server, {
    cors: {
      origin: socketCorsOrigin as any,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Handshake Authentication Middleware
  io.use(socketAuthMiddleware);

  // Connection Lifecycle
  io.on('connection', (socket) => {
    registerMeetingHandlers(io, socket);
  });

  ioInstance = io;
  return io;
}

export function getSocketServer(): AppSocketServer | null {
  return ioInstance;
}
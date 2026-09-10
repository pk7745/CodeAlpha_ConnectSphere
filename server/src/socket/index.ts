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
  const io: AppSocketServer = new SocketIOServer(server, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
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
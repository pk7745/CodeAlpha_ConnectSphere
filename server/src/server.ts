import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import meetingRoutes from './routes/meetingRoutes';

const app = express();
const server = http.createServer(app);

// Security & Middleware
app.use(helmet());
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static route for uploads with security
app.use('/uploads', express.static(config.uploadDir));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);

// Socket.IO setup
export const io = new SocketIOServer(server, {
  cors: {
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    console.log(`[ConnectSphere Server] Running on http://localhost:${config.port}`);
    console.log(`[ConnectSphere Server] Client origin configured for: ${config.clientUrl}`);
  });
}

export { app, server };
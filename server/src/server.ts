import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { prisma } from './lib/prisma';
import { storageProvider } from './services/storage';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import meetingRoutes from './routes/meetingRoutes';
import fileRoutes from './routes/fileRoutes';
import collaborationRoutes from './routes/collaborationRoutes';
import aiRoutes from './routes/aiRoutes';
import pollRoutes from './routes/pollRoutes';
import { initSocketServer } from './socket';

// Validate required environment variables in production
validateConfig();

const app = express();
const server = http.createServer(app);

// Configured origins for CORS
const configuredOrigins = config.clientUrl
  ? config.clientUrl.split(',').map((u) => u.trim()).filter(Boolean)
  : [];

const corsOriginHandler = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow non-browser requests (health checks, server-to-server, curl)
  if (!origin) return callback(null, true);

  // If specific CLIENT_URL is configured, enforce strictly
  if (configuredOrigins.length > 0 && !configuredOrigins.includes('*')) {
    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: origin ${origin} is not allowed`));
  }

  // If CLIENT_URL is not configured yet (initial deployment), allow request origin
  return callback(null, true);
};

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes (all file access is authenticated via /api/meetings/:meetingId/files)

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/meetings', fileRoutes);
app.use('/api/meetings', collaborationRoutes);
app.use('/api/meetings', aiRoutes);
app.use('/api/meetings', pollRoutes);
app.use('/api/meetings', meetingRoutes);

// Centralized error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ConnectSphere Error]:', err?.message || err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    error: config.nodeEnv === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    message: config.nodeEnv === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

// Socket.IO Server Initialization (shares the exact same HTTP server instance)
export const io = initSocketServer(server);

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[ConnectSphere Server] Running on http://0.0.0.0:${config.port}`);
    console.log(`[ConnectSphere Server] Client origin configured for: ${config.clientUrl}`);
    console.log(`[ConnectSphere Server] Environment: ${config.nodeEnv}`);
  });
}

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`[ConnectSphere Server] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    console.log('[ConnectSphere Server] HTTP server stopped accepting connections.');
    try {
      if (io) {
        await io.close();
        console.log('[ConnectSphere Server] Socket.IO server closed.');
      }
      await prisma.$disconnect();
      console.log('[ConnectSphere Server] Prisma connection cleanly disconnected.');
      process.exit(0);
    } catch (err) {
      console.error('[ConnectSphere Server] Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force termination if cleanup hangs past 10s
  setTimeout(() => {
    console.error('[ConnectSphere Server] Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };
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

// Root endpoint: friendly server status response for browser and API clients
app.get('/', (req: express.Request, res: express.Response) => {
  if (req.accepts('html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ConnectSphere API Server</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 36px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 18px;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 8px #22c55e;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 700;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 20px;
    }
    .info {
      background: #0f172a;
      border-radius: 8px;
      padding: 14px;
      text-align: left;
      font-family: monospace;
      font-size: 13px;
      margin-bottom: 20px;
      color: #cbd5e1;
    }
    .info div { margin: 4px 0; }
    .info a { color: #38bdf8; text-decoration: none; }
    .btn {
      display: inline-block;
      background: #6366f1;
      color: white;
      text-decoration: none;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
    }
    .btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span>API Online &amp; Ready</div>
    <h1>ConnectSphere API</h1>
    <p>&ldquo;Meet. Collaborate. Get Things Done.&rdquo;<br />Backend API &amp; Real-Time WebRTC signaling service is live.</p>
    <div class="info">
      <div><strong>Status:</strong> 200 OK</div>
      <div><strong>Health:</strong> <a href="/api/health">/api/health</a></div>
      <div><strong>Storage:</strong> ${config.storageProvider}</div>
      <div><strong>Environment:</strong> ${config.nodeEnv}</div>
    </div>
    <a class="btn" href="/api/health">Check Health Status</a>
  </div>
</body>
</html>`);
  }

  return res.status(200).json({
    name: 'ConnectSphere API Server',
    status: 'online',
    tagline: 'Meet. Collaborate. Get Things Done.',
    version: '1.0.0',
    environment: config.nodeEnv,
    storage: config.storageProvider,
    uptime: process.uptime(),
    health: '/api/health',
  });
});

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
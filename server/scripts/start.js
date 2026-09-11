const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const url = process.env.DATABASE_URL || '';
const isPg = url.startsWith('postgres') || process.env.NODE_ENV === 'production';

if (isPg && url) {
  console.log('[ConnectSphere Startup] Checking database migrations on Neon PostgreSQL...');
  try {
    execSync('npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    console.log('[ConnectSphere Startup] Migrations deployed successfully.');
  } catch (err) {
    console.warn('[ConnectSphere Startup] migrate deploy warning, ensuring schema with db push...', err.message);
    try {
      execSync('npx prisma db push --schema=prisma/schema.postgresql.prisma --accept-data-loss', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      });
      console.log('[ConnectSphere Startup] Database schema synchronized with db push.');
    } catch (pushErr) {
      console.error('[ConnectSphere Startup Error] Failed to push schema to database:', pushErr.message);
    }
  }
}

// Boot Express & Socket.IO server
require('../dist/server.js');

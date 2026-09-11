const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const url = process.env.DATABASE_URL || '';
const isPg = url.startsWith('postgres') || process.env.NODE_ENV === 'production';
const schemaPath = isPg ? 'prisma/schema.postgresql.prisma' : 'prisma/schema.prisma';

console.log(`[ConnectSphere Prisma] Generating client using ${isPg ? 'PostgreSQL (production)' : 'SQLite (development)'} schema: ${schemaPath}`);

try {
  execSync(`npx prisma generate --schema=${schemaPath}`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
  console.log('[ConnectSphere Prisma] Client generated successfully.');
} catch (err) {
  console.error('[ConnectSphere Prisma Error] Generation failed:', err.message);
  process.exit(1);
}

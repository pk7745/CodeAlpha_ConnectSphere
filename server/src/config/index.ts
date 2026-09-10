import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Also check cwd .env

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'connectsphere_default_dev_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10),
  storageProvider: process.env.STORAGE_PROVIDER || (process.env.NODE_ENV === 'production' && process.env.S3_BUCKET ? 'cloud' : 'local'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  s3: {
    endpoint: process.env.S3_ENDPOINT || undefined,
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    region: process.env.S3_REGION || 'auto',
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

export function validateConfig(): void {
  if (config.nodeEnv === 'production') {
    const missing: string[] = [];
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.CLIENT_URL) missing.push('CLIENT_URL');

    if (missing.length > 0) {
      throw new Error(
        `[ConnectSphere Configuration Error] Missing required production environment variables: ${missing.join(', ')}`
      );
    }

    if (config.storageProvider === 'cloud') {
      const missingStorage: string[] = [];
      if (!config.s3.bucket) missingStorage.push('S3_BUCKET');
      if (!config.s3.accessKeyId) missingStorage.push('S3_ACCESS_KEY_ID');
      if (!config.s3.secretAccessKey) missingStorage.push('S3_SECRET_ACCESS_KEY');

      if (missingStorage.length > 0) {
        console.warn(
          `[ConnectSphere Storage Warning] Cloud storage selected (STORAGE_PROVIDER=cloud) but missing credentials: ${missingStorage.join(', ')}. Falling back to local temporary storage.`
        );
      }
    } else {
      console.warn(
        '[ConnectSphere Storage Notice] Running in production with STORAGE_PROVIDER=local. Note that Render free tier filesystem is ephemeral; configure CloudStorageProvider (e.g. Cloudflare R2 or Supabase) for persistent file uploads.'
      );
    }
  }
}

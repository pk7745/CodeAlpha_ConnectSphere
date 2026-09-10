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
  storageProvider: process.env.STORAGE_PROVIDER || (process.env.NODE_ENV === 'production' && process.env.SUPABASE_URL ? 'supabase' : 'local'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'connectsphere-files',
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

    if (config.storageProvider === 'supabase' || config.storageProvider === 'cloud') {
      const missingStorage: string[] = [];
      if (!config.supabase.url) missingStorage.push('SUPABASE_URL');
      if (!config.supabase.serviceRoleKey) missingStorage.push('SUPABASE_SERVICE_ROLE_KEY');

      if (missingStorage.length > 0) {
        console.warn(
          `[ConnectSphere Storage Warning] Supabase storage selected (STORAGE_PROVIDER=${config.storageProvider}) but missing credentials: ${missingStorage.join(', ')}. Falling back to local temporary storage.`
        );
      }
    } else {
      console.warn(
        '[ConnectSphere Storage Notice] Running in production with STORAGE_PROVIDER=local. Note that Render free tier filesystem is ephemeral; configure Supabase Storage for persistent file uploads.'
      );
    }
  }
}

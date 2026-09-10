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
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
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
  }
}

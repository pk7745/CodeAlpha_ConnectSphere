import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider, StorageFileResult } from './storageProvider';

export interface SupabaseStorageConfig {
  url: string;
  serviceRoleKey: string;
  bucket?: string;
  stagingDir?: string;
}

/**
 * SupabaseStorageProvider
 * 
 * Production-ready cloud object storage provider using Supabase Storage (Free Tier).
 * Provides 1GB persistent free storage for meeting documents (.pdf, .docx, .pptx,
 * .xlsx, .zip, .csv, and images up to 15MB) with zero billing required.
 * 
 * All Supabase operations run server-side using the service-role key.
 * Credentials are never exposed to the client or browser.
 */
export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;
  private stagingDir: string;

  constructor(cfg: SupabaseStorageConfig) {
    this.bucket = cfg.bucket || 'connectsphere-files';
    this.stagingDir = cfg.stagingDir || path.resolve(process.cwd(), 'uploads', 'staging');
    this.ensureStagingDir();

    // Server-side administrative Supabase client using the service role key
    this.client = createClient(cfg.url, cfg.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  private ensureStagingDir(): void {
    try {
      if (!fs.existsSync(this.stagingDir)) {
        fs.mkdirSync(this.stagingDir, { recursive: true });
      }
    } catch (err) {
      console.error('[SupabaseStorageProvider] Failed to create staging directory:', err);
    }
  }

  public getStorageDir(): string {
    this.ensureStagingDir();
    return this.stagingDir;
  }

  public async saveFile(file: Express.Multer.File): Promise<StorageFileResult> {
    const filename = path.basename(file.filename || file.path);
    const key = `uploads/${filename}`;

    try {
      const fileBuffer = await fs.promises.readFile(file.path);
      const { error } = await this.client.storage
        .from(this.bucket)
        .upload(key, fileBuffer, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Clean up local staging file immediately after successful upload
      await fs.promises.unlink(file.path).catch(() => {});

      return {
        filename,
        storagePath: filename,
        size: file.size,
      };
    } catch (err) {
      console.error('[SupabaseStorageProvider] Upload error:', err);
      await fs.promises.unlink(file.path).catch(() => {});
      throw err;
    }
  }

  /**
   * For cloud storage, files do not live on the local disk.
   * Always returns null so files are streamed via getFileStream.
   */
  public resolvePath(_storagePath: string): string | null {
    return null;
  }

  public async getFileStream(storagePath: string): Promise<Readable | null> {
    const key = `uploads/${path.basename(storagePath)}`;
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .download(key);

      if (error || !data) {
        return null;
      }

      // Convert Blob to NodeJS.Readable stream
      const arrayBuffer = await data.arrayBuffer();
      return Readable.from(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('[SupabaseStorageProvider] Download error:', err);
      return null;
    }
  }

  public async fileExists(storagePath: string): Promise<boolean> {
    const key = path.basename(storagePath);
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .list('uploads', {
          search: key,
        });

      if (error || !data) return false;
      return data.some((item) => item.name === key);
    } catch (err) {
      return false;
    }
  }

  public async deleteFile(storagePath: string): Promise<boolean> {
    const key = `uploads/${path.basename(storagePath)}`;
    try {
      const { error } = await this.client.storage
        .from(this.bucket)
        .remove([key]);

      return !error;
    } catch (err) {
      console.warn('[SupabaseStorageProvider] Delete error:', err);
      return false;
    }
  }
}

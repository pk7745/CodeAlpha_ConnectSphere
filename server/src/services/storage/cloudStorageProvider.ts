import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageProvider, StorageFileResult } from './storageProvider';

export interface CloudStorageConfig {
  endpoint?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  stagingDir?: string;
}

/**
 * CloudStorageProvider
 * 
 * Production-ready cloud object storage provider supporting S3-compatible services
 * such as Cloudflare R2, Supabase Storage, Backblaze B2, and AWS S3.
 * 
 * Cloudflare R2 / Supabase Storage provides a generous 100% free tier (e.g. 10 GB storage,
 * zero egress fees) and supports arbitrary meeting documents (.pdf, .docx, .pptx, .xlsx,
 * .zip, .csv, and images) up to 15MB without the limitations of image-only CDNs.
 */
export class CloudStorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private stagingDir: string;

  constructor(cfg: CloudStorageConfig) {
    this.bucket = cfg.bucket;
    this.stagingDir = cfg.stagingDir || path.resolve(process.cwd(), 'uploads', 'staging');
    this.ensureStagingDir();

    this.client = new S3Client({
      region: cfg.region || 'auto',
      endpoint: cfg.endpoint || undefined,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  private ensureStagingDir(): void {
    try {
      if (!fs.existsSync(this.stagingDir)) {
        fs.mkdirSync(this.stagingDir, { recursive: true });
      }
    } catch (err) {
      console.error('[CloudStorageProvider] Failed to create staging directory:', err);
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
      const fileStream = fs.createReadStream(file.path);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype || 'application/octet-stream',
      });

      await this.client.send(command);

      // Clean up the local staging file immediately after successful upload
      await fs.promises.unlink(file.path).catch(() => {});

      return {
        filename,
        storagePath: filename,
        size: file.size,
      };
    } catch (err) {
      console.error('[CloudStorageProvider] Failed to upload file to cloud storage:', err);
      // Attempt cleanup of temp file
      await fs.promises.unlink(file.path).catch(() => {});
      throw err;
    }
  }

  /**
   * For cloud storage, files do not live on the local disk.
   * Always returns null to ensure clients consume the stream or signed URL.
   */
  public resolvePath(_storagePath: string): string | null {
    return null;
  }

  public async getFileStream(storagePath: string): Promise<Readable | null> {
    const key = `uploads/${path.basename(storagePath)}`;
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      if (response.Body && typeof (response.Body as any).pipe === 'function') {
        return response.Body as Readable;
      }
      return null;
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error('[CloudStorageProvider] Error fetching file stream:', err);
      return null;
    }
  }

  public async fileExists(storagePath: string): Promise<boolean> {
    const key = `uploads/${path.basename(storagePath)}`;
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.error('[CloudStorageProvider] Error checking file existence:', err);
      return false;
    }
  }

  public async deleteFile(storagePath: string): Promise<boolean> {
    const key = `uploads/${path.basename(storagePath)}`;
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      console.warn('[CloudStorageProvider] Failed to delete cloud file:', err);
      return false;
    }
  }
}

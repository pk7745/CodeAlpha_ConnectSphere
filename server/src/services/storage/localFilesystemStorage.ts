import path from 'path';
import fs from 'fs';
import { StorageProvider, StorageFileResult } from './storageProvider';

export class LocalFilesystemStorage implements StorageProvider {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    // Configurable base directory; defaults to 'uploads' inside current working directory
    this.baseDir = customBaseDir || path.resolve(process.cwd(), 'uploads');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      console.error('[StorageProvider] Failed to create storage directory:', err);
    }
  }

  public getStorageDir(): string {
    this.ensureDirectoryExists();
    return this.baseDir;
  }

  public async saveFile(file: Express.Multer.File): Promise<StorageFileResult> {
    const filename = path.basename(file.filename || file.path);
    return {
      filename,
      storagePath: filename,
      size: file.size,
    };
  }

  public resolvePath(storagePath: string): string | null {
    if (!storagePath) return null;
    this.ensureDirectoryExists();

    // Prevent path traversal by isolating basename and validating relative path
    const safeFilename = path.basename(storagePath);
    const resolved = path.resolve(this.baseDir, safeFilename);
    const rel = path.relative(this.baseDir, resolved);

    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      return null;
    }

    if (!fs.existsSync(resolved)) {
      return null;
    }

    return resolved;
  }

  public async fileExists(storagePath: string): Promise<boolean> {
    const resolved = this.resolvePath(storagePath);
    return resolved !== null;
  }

  public async deleteFile(storagePath: string): Promise<boolean> {
    try {
      const resolved = this.resolvePath(storagePath);
      if (!resolved) return false;
      await fs.promises.unlink(resolved);
      return true;
    } catch (err) {
      console.warn('[StorageProvider] Failed to delete file:', err);
      return false;
    }
  }
}

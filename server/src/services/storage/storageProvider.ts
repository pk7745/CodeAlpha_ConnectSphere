import { Readable } from 'stream';

export interface StorageFileResult {
  filename: string;
  storagePath: string;
  size: number;
}

export interface StorageProvider {
  /**
   * Saves an uploaded file to storage.
   */
  saveFile(file: Express.Multer.File): Promise<StorageFileResult>;

  /**
   * Resolves the absolute path for an existing file if stored on disk,
   * protecting against path traversal. Returns null if not stored locally or invalid.
   */
  resolvePath(storagePath: string): string | null;

  /**
   * Deletes a file from storage.
   */
  deleteFile(storagePath: string): Promise<boolean>;

  /**
   * Verifies if a file exists.
   */
  fileExists(storagePath: string): Promise<boolean>;

  /**
   * Retrieves a readable stream for streaming the file to an HTTP response.
   */
  getFileStream(storagePath: string): Promise<Readable | null>;

  /**
   * Gets the active storage directory path.
   */
  getStorageDir(): string;
}


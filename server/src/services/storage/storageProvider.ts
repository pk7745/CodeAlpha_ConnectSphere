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
   * Resolves the absolute path for an existing file, protecting against path traversal.
   * Returns null if the file does not exist or is invalid.
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
   * Gets the active storage directory path.
   */
  getStorageDir(): string;
}

import { config } from '../../config';
import { LocalFilesystemStorage } from './localFilesystemStorage';
import { StorageProvider } from './storageProvider';

export * from './storageProvider';
export * from './localFilesystemStorage';

// Singleton instance configured with uploadDir from environment / config
export const storageProvider: StorageProvider = new LocalFilesystemStorage(config.uploadDir);

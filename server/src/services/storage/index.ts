import { config } from '../../config';
import { LocalFilesystemStorage } from './localFilesystemStorage';
import { CloudStorageProvider } from './cloudStorageProvider';
import { StorageProvider } from './storageProvider';

export * from './storageProvider';
export * from './localFilesystemStorage';
export * from './cloudStorageProvider';

function createStorageProvider(): StorageProvider {
  if (config.storageProvider === 'cloud' && config.s3.bucket && config.s3.accessKeyId && config.s3.secretAccessKey) {
    console.log('[StorageProvider] Initialized CloudStorageProvider (S3-compatible cloud object storage)');
    return new CloudStorageProvider({
      endpoint: config.s3.endpoint,
      bucket: config.s3.bucket,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      region: config.s3.region,
      stagingDir: config.uploadDir,
    });
  }

  // Default: Local filesystem storage for development
  return new LocalFilesystemStorage(config.uploadDir);
}

// Singleton storage provider instance
export const storageProvider: StorageProvider = createStorageProvider();

import { config } from '../../config';
import { LocalFilesystemStorage } from './localFilesystemStorage';
import { SupabaseStorageProvider } from './supabaseStorageProvider';
import { StorageProvider } from './storageProvider';

export * from './storageProvider';
export * from './localFilesystemStorage';
export * from './supabaseStorageProvider';

function createStorageProvider(): StorageProvider {
  const isSupabase =
    (config.storageProvider === 'supabase' || config.storageProvider === 'cloud') &&
    Boolean(config.supabase.url && config.supabase.serviceRoleKey);

  if (isSupabase) {
    console.log('[StorageProvider] Initialized SupabaseStorageProvider (Supabase Storage Free Tier)');
    return new SupabaseStorageProvider({
      url: config.supabase.url,
      serviceRoleKey: config.supabase.serviceRoleKey,
      bucket: config.supabase.bucket,
      stagingDir: config.uploadDir,
    });
  }

  // Default: Local filesystem storage for development
  return new LocalFilesystemStorage(config.uploadDir);
}

// Singleton storage provider instance
export const storageProvider: StorageProvider = createStorageProvider();

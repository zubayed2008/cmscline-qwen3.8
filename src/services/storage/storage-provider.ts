import { CloudinaryProvider } from './cloudinary-provider';

/**
 * Storage Provider Module
 *
 * This abstraction layer allows the CMS to use different storage services
 * (Cloudinary, AWS S3, local storage, etc.) by implementing the IStorageProvider interface.
 * To switch providers, update the STORAGE_PROVIDER environment variable
 * and create a new implementation of the interface.
 *
 * Types are imported from storage-types.ts to avoid circular dependencies.
 */

// Re-export all types for backward compatibility
export type {
  UploadResult,
  UploadOptions,
  DeleteResult,
  IStorageProvider,
  StorageProviderType,
} from './storage-types';

import type { IStorageProvider, StorageProviderType } from './storage-types';

/**
 * Get the configured storage provider instance
 * This factory function returns the appropriate provider based on environment configuration.
 */
export function getStorageProvider(): IStorageProvider {
  const providerType = (process.env.STORAGE_PROVIDER || 'cloudinary') as StorageProviderType;

  switch (providerType) {
    case 'cloudinary': {
      return new CloudinaryProvider();
    }
    case 'local': {
      // Future: Implement local storage provider
      throw new Error('Local storage provider not yet implemented');
    }
    case 's3': {
      // Future: Implement S3 storage provider
      throw new Error('S3 storage provider not yet implemented');
    }
    default:
      throw new Error(`Unknown storage provider: ${providerType}`);
  }
}
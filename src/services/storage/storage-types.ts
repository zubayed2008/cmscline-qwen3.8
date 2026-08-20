/**
 * Storage Provider Types
 *
 * Shared interfaces for storage provider implementations.
 * These types are separated to avoid circular dependencies.
 */

export interface UploadResult {
  /** The URL to access the uploaded file */
  url: string;
  /** The optimized URL (if the provider supports transformations) */
  optimizedUrl?: string;
  /** The public ID or path of the file in the storage system */
  publicId: string;
  /** The file size in bytes */
  size: number;
  /** The MIME type of the file */
  mimeType: string;
  /** Image dimensions (if applicable) */
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface UploadOptions {
  /** The folder/path within the storage system */
  folder?: string;
  /** Desired width for image optimization */
  width?: number;
  /** Desired height for image optimization */
  height?: number;
  /** Quality for image optimization (1-100) */
  quality?: number;
  /** Custom transformation parameters */
  transformations?: Record<string, string | number>;
}

export interface DeleteResult {
  success: boolean;
  message?: string;
}

/**
 * Storage Provider Interface
 * All storage implementations must implement this interface.
 */
export interface IStorageProvider {
  /**
   * Upload a file to the storage service
   * @param fileBuffer - The file content as a Buffer
   * @param filename - The original filename
   * @param mimeType - The MIME type of the file
   * @param options - Upload options (folder, transformations, etc.)
   * @returns Promise resolving to the upload result
   */
  upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult>;

  /**
   * Delete a file from the storage service
   * @param publicId - The public ID or path of the file to delete
   * @returns Promise resolving to the delete result
   */
  delete(publicId: string): Promise<DeleteResult>;

  /**
   * Get the URL for a file
   * @param publicId - The public ID or path of the file
   * @param options - Options for URL generation (transformations, etc.)
   * @returns The URL to access the file
   */
  getUrl(publicId: string, options?: UploadOptions): string;

  /**
   * Check if the storage provider is properly configured
   * @returns true if the provider is ready to use
   */
  isConfigured(): boolean;
}

/**
 * Storage provider type enum
 */
export type StorageProviderType = 'cloudinary' | 'local' | 's3';
import { v2 as cloudinary, UploadApiResponse, ConfigOptions } from 'cloudinary';
import type {
  IStorageProvider,
  UploadResult,
  UploadOptions,
  DeleteResult,
} from './storage-types';

/**
 * Cloudinary Storage Provider
 *
 * Implements the IStorageProvider interface using Cloudinary as the storage backend.
 * Cloudinary provides automatic image optimization, transformations, and CDN delivery.
 *
 * Required environment variables:
 * - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name
 * - CLOUDINARY_API_KEY: Your Cloudinary API key
 * - CLOUDINARY_API_SECRET: Your Cloudinary API secret
 *
 * Optional environment variables:
 * - IMAGE_OPTIMIZATION_QUALITY: Default quality for image optimization (1-100, default: 80)
 * - CLOUDINARY_FOLDER: Default folder for uploads (default: 'cms')
 */
export class CloudinaryProvider implements IStorageProvider {
  private isConfig: boolean;

  constructor() {
    this.isConfig = this.configureCloudinary();
  }

  /**
   * Configure Cloudinary with environment variables
   */
  private configureCloudinary(): boolean {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return false;
    }

    // Check for placeholder values
    if (
      cloudName === 'your-cloud-name' ||
      apiKey === 'your-api-key' ||
      apiSecret === 'your-api-secret'
    ) {
      return false;
    }

    const config: ConfigOptions = {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    };

    cloudinary.config(config);
    return true;
  }

  /**
   * Check if the storage provider is properly configured
   */
  isConfigured(): boolean {
    return this.isConfig;
  }

  /**
   * Get the default quality for image optimization from environment
   */
  private getDefaultQuality(): number {
    const quality = process.env.IMAGE_OPTIMIZATION_QUALITY;
    if (quality) {
      const parsed = parseInt(quality, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
        return parsed;
      }
    }
    return 80;
  }

  /**
   * Get the default folder for uploads from environment
   */
  private getDefaultFolder(): string {
    return process.env.CLOUDINARY_FOLDER || 'cms';
  }

  /**
   * Generate a unique filename with timestamp
   */
  private generateUniqueFilename(filename: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = filename.split('.').pop() || '';
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${baseName}_${timestamp}_${randomSuffix}.${extension}`;
  }

  /**
   * Upload a file to Cloudinary
   */
  async upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not properly configured. Check environment variables.');
    }

    const folder = options?.folder || this.getDefaultFolder();
    const quality = options?.quality || this.getDefaultQuality();
    const uniqueFilename = this.generateUniqueFilename(filename);

    // Convert buffer to base64 for Cloudinary upload
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // Build transformation options
    const transformation: Array<Record<string, string | number>> = [];

    // Add quality optimization
    transformation.push({ quality });

    // Add format optimization (auto-select best format)
    transformation.push({ fetch_format: 'auto' });

    // Add dimensions if specified
    if (options?.width) {
      transformation.push({ width: options.width });
    }
    if (options?.height) {
      transformation.push({ height: options.height });
    }

    // Add custom transformations
    if (options?.transformations) {
      transformation.push(options.transformations);
    }

    try {
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          dataUri,
          {
            folder,
            public_id: uniqueFilename.replace(/\.[^/.]+$/, ''),
            resource_type: 'image',
            transformation,
            // Enable responsive breakpoints for optimization
            responsive_breakpoints: {
              create_derived: true,
              bytes_step: 20000,
              min_width: 200,
              max_width: 1000,
            },
          },
          (error, response) => {
            if (error) {
              reject(error);
            } else {
              resolve(response as UploadApiResponse);
            }
          }
        );
      });

      // Generate optimized URL with transformations
      const optimizedUrl = cloudinary.url(result.public_id, {
        transformation,
        fetch_format: 'auto',
        quality,
      });

      return {
        url: result.secure_url,
        optimizedUrl,
        publicId: result.public_id,
        size: result.bytes,
        mimeType: result.format ? `image/${result.format}` : mimeType,
        dimensions: {
          width: result.width,
          height: result.height,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload to Cloudinary: ${errorMessage}`);
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async delete(publicId: string): Promise<DeleteResult> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not properly configured. Check environment variables.');
    }

    try {
      const result = await new Promise<{ result: string }>((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(response as { result: string });
          }
        });
      });

      return {
        success: result.result === 'ok',
        message: result.result === 'ok' ? 'File deleted successfully' : `Delete result: ${result.result}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to delete from Cloudinary: ${errorMessage}`,
      };
    }
  }

  /**
   * Get the URL for a file with optional transformations
   */
  getUrl(publicId: string, options?: UploadOptions): string {
    if (!this.isConfigured()) {
      return '';
    }

    const quality = options?.quality || this.getDefaultQuality();
    const transformation: Array<Record<string, string | number>> = [
      { quality },
      { fetch_format: 'auto' },
    ];

    if (options?.width) {
      transformation.push({ width: options.width });
    }
    if (options?.height) {
      transformation.push({ height: options.height });
    }

    return cloudinary.url(publicId, {
      transformation,
    });
  }
}
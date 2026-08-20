import dbConnect from '@/utils/db-connect';
import Media, { IMedia } from '@/models/media-model';
import { getStorageProvider, UploadOptions } from './storage/storage-provider';

export interface CreateMediaInput {
  filename: string;
  url: string;
  optimizedUrl?: string;
  mimeType: string;
  size: number;
  storageType?: 'url' | 'upload';
  publicId?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  altText?: string;
  caption?: string;
  isActive?: boolean;
}

export interface UpdateMediaInput {
  filename?: string;
  url?: string;
  optimizedUrl?: string;
  mimeType?: string;
  size?: number;
  storageType?: 'url' | 'upload';
  publicId?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  altText?: string;
  caption?: string;
  isActive?: boolean;
}

export interface UploadMediaInput {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  altText?: string;
  caption?: string;
  isActive?: boolean;
}

/**
 * Allowed file extensions for upload
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

/**
 * Allowed MIME types for upload
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Maximum file size in bytes (2MB)
 */
export const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Validate file extension
 */
export function isValidFileExtension(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

/**
 * Validate MIME type
 */
export function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * MediaService handles all business logic for Media entities.
 */
export const MediaService = {
  /**
   * Creates a new media record.
   */
  async createMedia(input: CreateMediaInput): Promise<IMedia> {
    await dbConnect();
    return Media.create(input);
  },

  /**
   * Updates a media record by ID.
   */
  async updateMedia(id: string, input: UpdateMediaInput): Promise<IMedia | null> {
    await dbConnect();
    return Media.findByIdAndUpdate(id, input, {
      new: true,
      runValidators: true,
    });
  },

  /**
   * Gets all media records (for admin).
   */
  async getAllMedia(): Promise<IMedia[]> {
    await dbConnect();
    return Media.find().sort({ createdAt: -1 });
  },

  /**
   * Gets only active media records (for public views).
   */
  async getActiveMedia(): Promise<IMedia[]> {
    await dbConnect();
    return Media.find({ isActive: true }).sort({ createdAt: -1 });
  },

  /**
   * Gets a media record by ID.
   */
  async getMediaById(id: string): Promise<IMedia | null> {
    await dbConnect();
    return Media.findById(id);
  },

  /**
   * Gets media records filtered by MIME type.
   */
  async getMediaByMimeType(mimeType: string): Promise<IMedia[]> {
    await dbConnect();
    return Media.find({ mimeType: { $regex: `^${mimeType}`, $options: 'i' }, isActive: true }).sort(
      { createdAt: -1 }
    );
  },

  /**
   * Toggles the isActive status of a media record.
   */
  async toggleActiveStatus(id: string): Promise<IMedia | null> {
    await dbConnect();
    const media = await Media.findById(id);
    if (!media) return null;

    media.isActive = !media.isActive;
    await media.save();
    return media;
  },

  /**
   * Deletes a media record by ID.
   * Also deletes the file from the storage provider if it was uploaded.
   */
  async deleteMedia(id: string): Promise<IMedia | null> {
    await dbConnect();
    const media = await Media.findById(id);
    if (!media) return null;

    // If the media was uploaded (not just a URL), delete from storage
    if (media.storageType === 'upload' && media.publicId) {
      try {
        const storageProvider = getStorageProvider();
        await storageProvider.delete(media.publicId);
      } catch (error) {
        // Log error but continue with database deletion
        console.error('Failed to delete file from storage:', error);
      }
    }

    return Media.findByIdAndDelete(id);
  },

  /**
   * Upload a file to the storage provider and create a media record.
   * This is the main method for handling file uploads.
   */
  async uploadMedia(input: UploadMediaInput): Promise<IMedia> {
    const { fileBuffer, filename, mimeType, altText, caption, isActive } = input;

    // Validate file
    if (!isValidFileExtension(filename)) {
      throw new Error(
        `Invalid file extension. Allowed extensions: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`
      );
    }

    if (!isValidMimeType(mimeType)) {
      throw new Error(
        `Invalid MIME type. Allowed types: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`
      );
    }

    if (!isValidFileSize(fileBuffer.length)) {
      throw new Error(
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Get storage provider and upload
    const storageProvider = getStorageProvider();

    if (!storageProvider.isConfigured()) {
      throw new Error('Storage provider is not configured. Please check environment variables.');
    }

    // Get optimization quality from environment
    const quality = process.env.IMAGE_OPTIMIZATION_QUALITY
      ? parseInt(process.env.IMAGE_OPTIMIZATION_QUALITY, 10)
      : undefined;

    const uploadOptions: UploadOptions = {
      folder: process.env.CLOUDINARY_FOLDER || 'cms',
      quality,
    };

    const uploadResult = await storageProvider.upload(
      fileBuffer,
      filename,
      mimeType,
      uploadOptions
    );

    // Create media record with upload result
    await dbConnect();
    return Media.create({
      filename,
      url: uploadResult.url,
      optimizedUrl: uploadResult.optimizedUrl || uploadResult.url,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      storageType: 'upload',
      publicId: uploadResult.publicId,
      dimensions: uploadResult.dimensions,
      altText,
      caption,
      isActive: isActive ?? true,
    });
  },
};

export default MediaService;
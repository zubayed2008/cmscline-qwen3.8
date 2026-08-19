import dbConnect from '@/utils/db-connect';
import Media, { IMedia } from '@/models/media-model';

export interface CreateMediaInput {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  isActive?: boolean;
}

export interface UpdateMediaInput {
  filename?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  isActive?: boolean;
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
   */
  async deleteMedia(id: string): Promise<IMedia | null> {
    await dbConnect();
    return Media.findByIdAndDelete(id);
  },
};

export default MediaService;
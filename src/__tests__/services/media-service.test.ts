import { MediaService } from '@/services/media-service';
import Media from '@/models/media-model';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the Media model
jest.mock('@/models/media-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMedia', () => {
    it('should create a media record with required fields', async () => {
      const mockMedia = {
        _id: 'media-id-1',
        filename: 'hero-image.jpg',
        url: '/uploads/hero-image.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        isActive: true,
      };

      (Media.create as jest.Mock).mockResolvedValue(mockMedia);

      const result = await MediaService.createMedia({
        filename: 'hero-image.jpg',
        url: '/uploads/hero-image.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
      });

      expect(Media.create).toHaveBeenCalledWith({
        filename: 'hero-image.jpg',
        url: '/uploads/hero-image.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
      });
      expect(result).toEqual(mockMedia);
    });

    it('should create a media record with isActive option', async () => {
      const mockMedia = {
        _id: 'media-id-2',
        filename: 'document.pdf',
        url: '/uploads/document.pdf',
        mimeType: 'application/pdf',
        size: 204800,
        isActive: false,
      };

      (Media.create as jest.Mock).mockResolvedValue(mockMedia);

      const result = await MediaService.createMedia({
        filename: 'document.pdf',
        url: '/uploads/document.pdf',
        mimeType: 'application/pdf',
        size: 204800,
        isActive: false,
      });

      expect(Media.create).toHaveBeenCalledWith({
        filename: 'document.pdf',
        url: '/uploads/document.pdf',
        mimeType: 'application/pdf',
        size: 204800,
        isActive: false,
      });
      expect(result.isActive).toBe(false);
    });
  });

  describe('updateMedia', () => {
    it('should update a media record by ID', async () => {
      const mockUpdatedMedia = {
        _id: 'media-id-1',
        filename: 'updated-image.jpg',
        url: '/uploads/updated-image.jpg',
        mimeType: 'image/jpeg',
        size: 102400,
        isActive: true,
      };

      (Media.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedMedia);

      const result = await MediaService.updateMedia('media-id-1', {
        filename: 'updated-image.jpg',
      });

      expect(Media.findByIdAndUpdate).toHaveBeenCalledWith(
        'media-id-1',
        { filename: 'updated-image.jpg' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedMedia);
    });

    it('should return null if media not found', async () => {
      (Media.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await MediaService.updateMedia('nonexistent', {
        filename: 'not-found.jpg',
      });

      expect(result).toBeNull();
    });
  });

  describe('getAllMedia', () => {
    it('should return all media sorted by createdAt descending', async () => {
      const mockMediaList = [
        { _id: '1', filename: 'image1.jpg' },
        { _id: '2', filename: 'image2.png' },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockMediaList);
      (Media.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await MediaService.getAllMedia();

      expect(Media.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockMediaList);
    });
  });

  describe('getActiveMedia', () => {
    it('should return only active media', async () => {
      const mockMediaList = [{ _id: '1', filename: 'active.jpg', isActive: true }];

      const mockSort = jest.fn().mockResolvedValue(mockMediaList);
      (Media.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await MediaService.getActiveMedia();

      expect(Media.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockMediaList);
    });
  });

  describe('getMediaById', () => {
    it('should return a media record by ID', async () => {
      const mockMedia = { _id: 'media-id-1', filename: 'test.jpg' };
      (Media.findById as jest.Mock).mockResolvedValue(mockMedia);

      const result = await MediaService.getMediaById('media-id-1');

      expect(Media.findById).toHaveBeenCalledWith('media-id-1');
      expect(result).toEqual(mockMedia);
    });

    it('should return null if media not found', async () => {
      (Media.findById as jest.Mock).mockResolvedValue(null);

      const result = await MediaService.getMediaById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getMediaByMimeType', () => {
    it('should return active media filtered by MIME type prefix', async () => {
      const mockMediaList = [
        { _id: '1', filename: 'image1.jpg', mimeType: 'image/jpeg', isActive: true },
        { _id: '2', filename: 'image2.png', mimeType: 'image/png', isActive: true },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockMediaList);
      (Media.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await MediaService.getMediaByMimeType('image');

      expect(Media.find).toHaveBeenCalledWith({
        mimeType: { $regex: '^image', $options: 'i' },
        isActive: true,
      });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockMediaList);
    });

    it('should return empty array when no media matches MIME type', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      (Media.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await MediaService.getMediaByMimeType('video');

      expect(result).toEqual([]);
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockMedia = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (Media.findById as jest.Mock).mockResolvedValue(mockMedia);

      const result = await MediaService.toggleActiveStatus('1');

      expect(mockMedia.isActive).toBe(false);
      expect(mockMedia.save).toHaveBeenCalled();
    });

    it('should toggle isActive from false to true', async () => {
      const mockMedia = {
        _id: '1',
        isActive: false,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
      };
      (Media.findById as jest.Mock).mockResolvedValue(mockMedia);

      const result = await MediaService.toggleActiveStatus('1');

      expect(mockMedia.isActive).toBe(true);
      expect(mockMedia.save).toHaveBeenCalled();
    });

    it('should return null if media not found', async () => {
      (Media.findById as jest.Mock).mockResolvedValue(null);

      const result = await MediaService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteMedia', () => {
    it('should delete a media record by ID', async () => {
      const mockMedia = { _id: '1', filename: 'deleted.jpg', storageType: 'url' };
      (Media.findById as jest.Mock).mockResolvedValue(mockMedia);
      (Media.findByIdAndDelete as jest.Mock).mockResolvedValue(mockMedia);

      const result = await MediaService.deleteMedia('1');

      expect(Media.findById).toHaveBeenCalledWith('1');
      expect(Media.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMedia);
    });

    it('should return null if media not found', async () => {
      (Media.findById as jest.Mock).mockResolvedValue(null);

      const result = await MediaService.deleteMedia('nonexistent');

      expect(result).toBeNull();
      expect(Media.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});

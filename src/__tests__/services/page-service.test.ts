import { PageService } from '@/services/page-service';
import Page from '@/models/page-model';
import dbConnect from '@/utils/db-connect';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the Page model
jest.mock('@/models/page-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn(),
  },
}));

describe('PageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPage', () => {
    it('should create a page with lowercase slug', async () => {
      const mockPage = {
        _id: 'page-id-1',
        title: 'Test Page',
        slug: 'test-page',
        content: 'Test content',
        isDefaultHomepage: false,
        isActive: true,
      };

      (Page.create as jest.Mock).mockResolvedValue(mockPage);

      const result = await PageService.createPage({
        title: 'Test Page',
        slug: 'TEST-PAGE',
        content: 'Test content',
      });

      expect(Page.create).toHaveBeenCalledWith({
        title: 'Test Page',
        slug: 'test-page',
        content: 'Test content',
      });
      expect(result.slug).toBe('test-page');
    });

    it('should unset other default homepages when creating a default homepage', async () => {
      const mockPage = {
        _id: 'page-id-2',
        title: 'New Default',
        slug: 'new-default',
        content: 'Content',
        isDefaultHomepage: true,
        isActive: true,
      };

      (Page.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      (Page.create as jest.Mock).mockResolvedValue(mockPage);

      await PageService.createPage({
        title: 'New Default',
        slug: 'new-default',
        content: 'Content',
        isDefaultHomepage: true,
      });

      // Verify that updateMany was called to unset other defaults
      expect(Page.updateMany).toHaveBeenCalledWith(
        { isDefaultHomepage: true },
        { isDefaultHomepage: false }
      );
    });

    it('should NOT call updateMany when isDefaultHomepage is false', async () => {
      const mockPage = {
        _id: 'page-id-3',
        title: 'Regular Page',
        slug: 'regular-page',
        content: 'Content',
        isDefaultHomepage: false,
        isActive: true,
      };

      (Page.create as jest.Mock).mockResolvedValue(mockPage);

      await PageService.createPage({
        title: 'Regular Page',
        slug: 'regular-page',
        content: 'Content',
        isDefaultHomepage: false,
      });

      expect(Page.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('updatePage', () => {
    it('should unset other default homepages when setting a page as default', async () => {
      const mockUpdatedPage = {
        _id: 'page-id-1',
        title: 'Updated Page',
        slug: 'updated-page',
        content: 'Updated content',
        isDefaultHomepage: true,
        isActive: true,
      };

      (Page.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (Page.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedPage);

      await PageService.updatePage('page-id-1', { isDefaultHomepage: true });

      // Verify that updateMany was called to unset other defaults (excluding current page)
      expect(Page.updateMany).toHaveBeenCalledWith(
        { _id: { $ne: 'page-id-1' }, isDefaultHomepage: true },
        { isDefaultHomepage: false }
      );
    });

    it('should NOT call updateMany when isDefaultHomepage is false', async () => {
      const mockUpdatedPage = {
        _id: 'page-id-1',
        title: 'Updated Page',
        slug: 'updated-page',
        content: 'Updated content',
        isDefaultHomepage: false,
        isActive: true,
      };

      (Page.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedPage);

      await PageService.updatePage('page-id-1', { isDefaultHomepage: false });

      expect(Page.updateMany).not.toHaveBeenCalled();
    });

    it('should lowercase slug when updating', async () => {
      const mockUpdatedPage = {
        _id: 'page-id-1',
        title: 'Updated Page',
        slug: 'new-slug',
        content: 'Content',
        isDefaultHomepage: false,
        isActive: true,
      };

      (Page.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedPage);

      await PageService.updatePage('page-id-1', { slug: 'NEW-SLUG' });

      expect(Page.findByIdAndUpdate).toHaveBeenCalledWith(
        'page-id-1',
        { slug: 'new-slug' },
        { new: true, runValidators: true }
      );
    });
  });

  describe('getAllPages', () => {
    it('should return all pages sorted by createdAt descending', async () => {
      const mockPages = [
        { _id: '1', title: 'Page 1' },
        { _id: '2', title: 'Page 2' },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockPages);
      (Page.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await PageService.getAllPages();

      expect(Page.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockPages);
    });
  });

  describe('getActivePages', () => {
    it('should return only active pages', async () => {
      const mockPages = [{ _id: '1', title: 'Active Page', isActive: true }];

      const mockSort = jest.fn().mockResolvedValue(mockPages);
      (Page.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await PageService.getActivePages();

      expect(Page.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockPages);
    });
  });

  describe('getPageBySlug', () => {
    it('should find page by lowercase slug', async () => {
      const mockPage = { _id: '1', slug: 'test-page' };
      (Page.findOne as jest.Mock).mockResolvedValue(mockPage);

      const result = await PageService.getPageBySlug('TEST-PAGE');

      expect(Page.findOne).toHaveBeenCalledWith({ slug: 'test-page' });
      expect(result).toEqual(mockPage);
    });
  });

  describe('getDefaultHomepage', () => {
    it('should return active default homepage', async () => {
      const mockPage = { _id: '1', isDefaultHomepage: true, isActive: true };
      (Page.findOne as jest.Mock).mockResolvedValue(mockPage);

      const result = await PageService.getDefaultHomepage();

      expect(Page.findOne).toHaveBeenCalledWith({ isDefaultHomepage: true, isActive: true });
      expect(result).toEqual(mockPage);
    });

    it('should return null if no active default homepage exists', async () => {
      (Page.findOne as jest.Mock).mockResolvedValue(null);

      const result = await PageService.getDefaultHomepage();

      expect(result).toBeNull();
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockPage = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (Page.findById as jest.Mock).mockResolvedValue(mockPage);

      const result = await PageService.toggleActiveStatus('1');

      expect(mockPage.isActive).toBe(false);
      expect(mockPage.save).toHaveBeenCalled();
    });

    it('should toggle isActive from false to true', async () => {
      const mockPage = {
        _id: '1',
        isActive: false,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
      };
      (Page.findById as jest.Mock).mockResolvedValue(mockPage);

      const result = await PageService.toggleActiveStatus('1');

      expect(mockPage.isActive).toBe(true);
      expect(mockPage.save).toHaveBeenCalled();
    });

    it('should return null if page not found', async () => {
      (Page.findById as jest.Mock).mockResolvedValue(null);

      const result = await PageService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deletePage', () => {
    it('should delete a page by ID', async () => {
      const mockPage = { _id: '1', title: 'Deleted Page' };
      (Page.findByIdAndDelete as jest.Mock).mockResolvedValue(mockPage);

      const result = await PageService.deletePage('1');

      expect(Page.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockPage);
    });
  });
});

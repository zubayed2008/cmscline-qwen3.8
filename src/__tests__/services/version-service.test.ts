import { VersionService } from '@/services/version-service';
import ContentVersion from '@/models/content-version-model';
import Page from '@/models/page-model';
import Blog from '@/models/blog-model';
import { getAuditContext } from '@/utils/audit-context';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the audit context (resolves changedBy automatically)
jest.mock('@/utils/audit-context', () => ({
  __esModule: true,
  getAuditContext: jest.fn(),
}));

// Mock the ContentVersion model
jest.mock('@/models/content-version-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

// Mock the Page and Blog models (used by restoreVersion)
jest.mock('@/models/page-model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/models/blog-model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

/**
 * Builds a chainable query mock: .sort() stays chainable, awaiting the chain
 * (directly or after .skip()/.populate()) resolves to `result`.
 */
function chainTo(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockResolvedValue(result),
    populate: jest.fn().mockResolvedValue(result),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };
}

/** Builds a chainable find mock: .sort() -> .populate() resolves to `result`. */
function findChainTo(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue(result),
  };
}

const mockVersionDoc = {
  _id: 'version-id-1',
  contentType: 'page',
  contentId: 'page-id-1',
  version: 2,
  title: 'Version Two Title',
  slug: 'version-two-title',
  content: '<p>Version two content</p>',
  changeSummary: 'Snapshot before update',
};

describe('VersionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuditContext as jest.Mock).mockReturnValue({
      userId: 'user-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });
  });

  describe('createVersion', () => {
    it('should create version 1 when no previous versions exist', async () => {
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo(null));
      (ContentVersion.create as jest.Mock).mockResolvedValue({
        ...mockVersionDoc,
        version: 1,
      });

      const result = await VersionService.createVersion({
        contentType: 'page',
        contentId: 'page-id-1',
        title: 'Test Page',
        slug: 'TEST-PAGE',
        content: '<p>Test</p>',
      });

      expect(ContentVersion.findOne).toHaveBeenCalledWith({
        contentType: 'page',
        contentId: 'page-id-1',
      });
      expect(ContentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'page',
          contentId: 'page-id-1',
          version: 1,
          slug: 'test-page',
          changedBy: 'user-1',
        })
      );
      expect(result.version).toBe(1);
    });

    it('should auto-increment the version number from the latest version', async () => {
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo({ version: 4 }));
      (ContentVersion.create as jest.Mock).mockResolvedValue({
        ...mockVersionDoc,
        version: 5,
      });

      const result = await VersionService.createVersion({
        contentType: 'blog',
        contentId: 'blog-id-1',
        title: 'Test Blog',
        slug: 'test-blog',
        content: '<p>Test</p>',
      });

      expect(ContentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'blog',
          version: 5,
        })
      );
      expect(result.version).toBe(5);
    });

    it('should throw when no user can be resolved', async () => {
      (getAuditContext as jest.Mock).mockReturnValue(undefined);

      await expect(
        VersionService.createVersion({
          contentType: 'page',
          contentId: 'page-id-1',
          title: 'Test Page',
          slug: 'test-page',
          content: '<p>Test</p>',
        })
      ).rejects.toThrow('changedBy is required');
    });
  });

  describe('getVersions', () => {
    it('should list versions sorted newest first with changedBy populated', async () => {
      const mockVersions = [mockVersionDoc];
      const chain = findChainTo(mockVersions);
      (ContentVersion.find as jest.Mock).mockReturnValue(chain);

      const result = await VersionService.getVersions('page', 'page-id-1');

      expect(ContentVersion.find).toHaveBeenCalledWith({
        contentType: 'page',
        contentId: 'page-id-1',
      });
      expect(chain.sort).toHaveBeenCalledWith({ version: -1 });
      expect(chain.populate).toHaveBeenCalledWith('changedBy', 'name email');
      expect(result).toEqual(mockVersions);
    });
  });

  describe('getLatestVersion', () => {
    it('should return the newest version', async () => {
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo(mockVersionDoc));

      const result = await VersionService.getLatestVersion('page', 'page-id-1');

      expect(ContentVersion.findOne).toHaveBeenCalledWith({
        contentType: 'page',
        contentId: 'page-id-1',
      });
      expect(result).toEqual(mockVersionDoc);
    });

    it('should return null when no versions exist', async () => {
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo(null));

      const result = await VersionService.getLatestVersion('page', 'page-id-1');

      expect(result).toBeNull();
    });
  });

  describe('getVersionById', () => {
    it('should return a populated version by ID', async () => {
      const chain = findChainTo(mockVersionDoc);
      (ContentVersion.findById as jest.Mock).mockReturnValue(chain);

      const result = await VersionService.getVersionById('version-id-1');

      expect(ContentVersion.findById).toHaveBeenCalledWith('version-id-1');
      expect(chain.populate).toHaveBeenCalledWith('changedBy', 'name email');
      expect(result).toEqual(mockVersionDoc);
    });

    it('should return null when version not found', async () => {
      (ContentVersion.findById as jest.Mock).mockReturnValue(chainTo(null));

      const result = await VersionService.getVersionById('missing');

      expect(result).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('should detect field-level differences between two versions', async () => {
      const versionA = { ...mockVersionDoc, title: 'Old Title' };
      const versionB = { ...mockVersionDoc, _id: 'version-id-2', title: 'New Title' };
      (ContentVersion.findById as jest.Mock)
        .mockReturnValueOnce(chainTo(versionA))
        .mockReturnValueOnce(chainTo(versionB));

      const result = await VersionService.compareVersions('version-id-1', 'version-id-2');

      expect(result.differences).toEqual([
        { field: 'title', oldValue: 'Old Title', newValue: 'New Title', changed: true },
        {
          field: 'slug',
          oldValue: mockVersionDoc.slug,
          newValue: versionB.slug,
          changed: false,
        },
        {
          field: 'content',
          oldValue: mockVersionDoc.content,
          newValue: versionB.content,
          changed: false,
        },
      ]);
    });

    it('should throw when a version is missing', async () => {
      (ContentVersion.findById as jest.Mock)
        .mockReturnValueOnce(chainTo(mockVersionDoc))
        .mockReturnValueOnce(chainTo(null));

      await expect(VersionService.compareVersions('a', 'b')).rejects.toThrow(
        'One or both versions not found'
      );
    });

    it('should throw when versions belong to different content items', async () => {
      (ContentVersion.findById as jest.Mock)
        .mockReturnValueOnce(chainTo(mockVersionDoc))
        .mockReturnValueOnce(chainTo({ ...mockVersionDoc, contentId: 'other-id' }));

      await expect(VersionService.compareVersions('a', 'b')).rejects.toThrow(
        'Cannot compare versions of different content items'
      );
    });
  });

  describe('restoreVersion (page)', () => {
    it('should snapshot the current state before restoring an older version', async () => {
      (ContentVersion.findById as jest.Mock).mockReturnValue(chainTo(mockVersionDoc));
      (Page.findById as jest.Mock).mockResolvedValue({
        _id: 'page-id-1',
        title: 'Current Title',
        slug: 'current-title',
        content: '<p>Current</p>',
      });
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo({ version: 3 }));
      (ContentVersion.create as jest.Mock).mockResolvedValue({ ...mockVersionDoc, version: 4 });
      const restoredPage = { _id: 'page-id-1', title: mockVersionDoc.title };
      (Page.findByIdAndUpdate as jest.Mock).mockResolvedValue(restoredPage);
      (ContentVersion.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockVersionDoc);

      const result = await VersionService.restoreVersion('version-id-1');

      // Current state captured first
      expect(ContentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'page',
          contentId: 'page-id-1',
          title: 'Current Title',
          slug: 'current-title',
          content: '<p>Current</p>',
          changeSummary: 'Auto-snapshot before restoring version 2',
        })
      );
      // Parent updated with the old version's fields
      expect(Page.findByIdAndUpdate).toHaveBeenCalledWith(
        'page-id-1',
        {
          title: mockVersionDoc.title,
          slug: mockVersionDoc.slug,
          content: mockVersionDoc.content,
        },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(restoredPage);
    });

    it('should return null when the version does not exist', async () => {
      (ContentVersion.findById as jest.Mock).mockReturnValue(chainTo(null));

      const result = await VersionService.restoreVersion('missing');

      expect(result).toBeNull();
    });

    it('should throw when the parent page no longer exists', async () => {
      (ContentVersion.findById as jest.Mock).mockReturnValue(chainTo(mockVersionDoc));
      (Page.findById as jest.Mock).mockResolvedValue(null);

      await expect(VersionService.restoreVersion('version-id-1')).rejects.toThrow(
        'The page for this version no longer exists'
      );
    });
  });

  describe('restoreVersion (blog)', () => {
    it('should snapshot the current state before restoring an older blog version', async () => {
      const blogVersion = { ...mockVersionDoc, contentType: 'blog', contentId: 'blog-id-1' };
      (ContentVersion.findById as jest.Mock).mockReturnValue(chainTo(blogVersion));
      (Blog.findById as jest.Mock).mockResolvedValue({
        _id: 'blog-id-1',
        title: 'Current Blog',
        slug: 'current-blog',
        content: '<p>Current</p>',
      });
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo({ version: 2 }));
      (ContentVersion.create as jest.Mock).mockResolvedValue({ ...blogVersion, version: 3 });
      const restoredBlog = { _id: 'blog-id-1', title: blogVersion.title };
      (Blog.findByIdAndUpdate as jest.Mock).mockResolvedValue(restoredBlog);
      (ContentVersion.findByIdAndUpdate as jest.Mock).mockResolvedValue(blogVersion);

      const result = await VersionService.restoreVersion('version-id-1');

      expect(Blog.findByIdAndUpdate).toHaveBeenCalledWith(
        'blog-id-1',
        {
          title: blogVersion.title,
          slug: blogVersion.slug,
          content: blogVersion.content,
        },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(restoredBlog);
    });
  });

  describe('deleteVersion', () => {
    it('should delete a version by ID', async () => {
      (ContentVersion.findByIdAndDelete as jest.Mock).mockResolvedValue(mockVersionDoc);

      const result = await VersionService.deleteVersion('version-id-1');

      expect(ContentVersion.findByIdAndDelete).toHaveBeenCalledWith('version-id-1');
      expect(result).toEqual(mockVersionDoc);
    });
  });

  describe('deleteVersionsForContent', () => {
    it('should delete all versions for a content item and return the count', async () => {
      (ContentVersion.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 });

      const result = await VersionService.deleteVersionsForContent('page', 'page-id-1');

      expect(ContentVersion.deleteMany).toHaveBeenCalledWith({
        contentType: 'page',
        contentId: 'page-id-1',
      });
      expect(result).toBe(5);
    });
  });

  describe('pruneVersions', () => {
    it('should return 0 when the content is within the retention limit', async () => {
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo(null));

      const result = await VersionService.pruneVersions('page', 'page-id-1', 50);

      expect(result).toBe(0);
      expect(ContentVersion.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete versions at or below the cutoff when over the limit', async () => {
      (ContentVersion.findOne as jest.Mock).mockReturnValue(chainTo({ version: 10 }));
      (ContentVersion.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 10 });

      const result = await VersionService.pruneVersions('page', 'page-id-1', 50);

      expect(ContentVersion.findOne).toHaveBeenCalledWith({
        contentType: 'page',
        contentId: 'page-id-1',
      });
      expect(ContentVersion.deleteMany).toHaveBeenCalledWith({
        contentType: 'page',
        contentId: 'page-id-1',
        version: { $lte: 10 },
      });
      expect(result).toBe(10);
    });
  });
});
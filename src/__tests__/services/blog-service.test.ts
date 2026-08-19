import { BlogService } from '@/services/blog-service';
import Blog from '@/models/blog-model';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the Blog model
jest.mock('@/models/blog-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

describe('BlogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBlog', () => {
    it('should create a blog with lowercase slug', async () => {
      const mockBlog = {
        _id: 'blog-id-1',
        title: 'Test Blog',
        slug: 'test-blog',
        content: 'Blog content',
        isActive: true,
      };

      (Blog.create as jest.Mock).mockResolvedValue(mockBlog);

      const result = await BlogService.createBlog({
        title: 'Test Blog',
        slug: 'TEST-BLOG',
        content: 'Blog content',
      });

      expect(Blog.create).toHaveBeenCalledWith({
        title: 'Test Blog',
        slug: 'test-blog',
        content: 'Blog content',
        isActive: true,
      });
      expect(result.slug).toBe('test-blog');
    });

    it('should create a blog with category and tags', async () => {
      // Use valid MongoDB ObjectId strings (24 character hex)
      const validCategoryId = '507f1f77bcf86cd799439011';
      const validTagId1 = '507f1f77bcf86cd799439012';
      const validTagId2 = '507f1f77bcf86cd799439013';

      const mockBlog = {
        _id: 'blog-id-2',
        title: 'Blog with Relations',
        slug: 'blog-with-relations',
        content: 'Content',
        category: validCategoryId,
        tags: [validTagId1, validTagId2],
        isActive: true,
      };

      (Blog.create as jest.Mock).mockResolvedValue(mockBlog);

      await BlogService.createBlog({
        title: 'Blog with Relations',
        slug: 'blog-with-relations',
        content: 'Content',
        category: validCategoryId,
        tags: [validTagId1, validTagId2],
      });

      expect(Blog.create).toHaveBeenCalled();
      const createCall = (Blog.create as jest.Mock).mock.calls[0][0];
      expect(createCall.title).toBe('Blog with Relations');
      expect(createCall.category).toBeDefined();
      expect(createCall.tags).toHaveLength(2);
    });
  });

  describe('updateBlog', () => {
    it('should update a blog by ID', async () => {
      const mockUpdatedBlog = {
        _id: 'blog-id-1',
        title: 'Updated Blog',
        slug: 'updated-blog',
        content: 'Updated content',
        isActive: true,
      };

      (Blog.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedBlog);

      const result = await BlogService.updateBlog('blog-id-1', { title: 'Updated Blog' });

      expect(Blog.findByIdAndUpdate).toHaveBeenCalledWith(
        'blog-id-1',
        { title: 'Updated Blog' },
        { new: true, runValidators: true }
      );
      expect(result?.title).toBe('Updated Blog');
    });

    it('should lowercase slug when updating', async () => {
      const mockUpdatedBlog = {
        _id: 'blog-id-1',
        title: 'Blog',
        slug: 'new-slug',
        content: 'Content',
        isActive: true,
      };

      (Blog.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedBlog);

      await BlogService.updateBlog('blog-id-1', { slug: 'NEW-SLUG' });

      expect(Blog.findByIdAndUpdate).toHaveBeenCalledWith(
        'blog-id-1',
        { slug: 'new-slug' },
        { new: true, runValidators: true }
      );
    });
  });

  describe('getAllBlogs', () => {
    it('should return all blogs with populated relations', async () => {
      const mockBlogs = [
        { _id: '1', title: 'Blog 1' },
        { _id: '2', title: 'Blog 2' },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockBlogs);
      const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (Blog.find as jest.Mock).mockReturnValue({ populate: mockPopulate1 });

      const result = await BlogService.getAllBlogs();

      expect(Blog.find).toHaveBeenCalledWith();
      expect(mockPopulate1).toHaveBeenCalledWith('category', 'name slug');
      expect(result).toEqual(mockBlogs);
    });
  });

  describe('getActiveBlogs', () => {
    it('should return only active blogs', async () => {
      const mockBlogs = [{ _id: '1', title: 'Active Blog', isActive: true }];

      const mockSort = jest.fn().mockResolvedValue(mockBlogs);
      const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (Blog.find as jest.Mock).mockReturnValue({ populate: mockPopulate1 });

      const result = await BlogService.getActiveBlogs();

      expect(Blog.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockBlogs);
    });
  });

  describe('getBlogBySlug', () => {
    it('should find blog by lowercase slug', async () => {
      const mockBlog = { _id: '1', slug: 'test-blog' };

      const mockPopulate3 = jest.fn().mockResolvedValue(mockBlog);
      const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      (Blog.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate1 });

      const result = await BlogService.getBlogBySlug('TEST-BLOG');

      expect(Blog.findOne).toHaveBeenCalledWith({ slug: 'test-blog' });
      expect(result).toEqual(mockBlog);
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockBlog = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (Blog.findById as jest.Mock).mockResolvedValue(mockBlog);

      await BlogService.toggleActiveStatus('1');

      expect(mockBlog.isActive).toBe(false);
      expect(mockBlog.save).toHaveBeenCalled();
    });

    it('should return null if blog not found', async () => {
      (Blog.findById as jest.Mock).mockResolvedValue(null);

      const result = await BlogService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteBlog', () => {
    it('should delete a blog by ID', async () => {
      const mockBlog = { _id: '1', title: 'Deleted Blog' };
      (Blog.findByIdAndDelete as jest.Mock).mockResolvedValue(mockBlog);

      const result = await BlogService.deleteBlog('1');

      expect(Blog.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockBlog);
    });
  });
});
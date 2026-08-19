import dbConnect from '@/utils/db-connect';
import Blog, { IBlog } from '@/models/blog-model';
import { Types } from 'mongoose';

export interface CreateBlogInput {
  title: string;
  slug: string;
  content: string;
  category?: string;
  tags?: string[];
  featuredImage?: string;
  isActive?: boolean;
}

export interface UpdateBlogInput {
  title?: string;
  slug?: string;
  content?: string;
  category?: string | null;
  tags?: string[];
  featuredImage?: string | null;
  isActive?: boolean;
}

/**
 * BlogService handles all business logic for Blog entities.
 * Manages relations to Category, Tag, and Media (featuredImage).
 */
export const BlogService = {
  /**
   * Creates a new blog post with optional category, tags, and featured image.
   */
  async createBlog(input: CreateBlogInput): Promise<IBlog> {
    await dbConnect();

    const blogData: Record<string, unknown> = {
      title: input.title,
      slug: input.slug.toLowerCase(),
      content: input.content,
      isActive: input.isActive ?? true,
    };

    if (input.category) {
      blogData.category = new Types.ObjectId(input.category);
    }
    if (input.tags && input.tags.length > 0) {
      blogData.tags = input.tags.map((tagId) => new Types.ObjectId(tagId));
    }
    if (input.featuredImage) {
      blogData.featuredImage = new Types.ObjectId(input.featuredImage);
    }

    const blog = await Blog.create(blogData);
    return blog;
  },

  /**
   * Updates a blog post by ID.
   */
  async updateBlog(id: string, input: UpdateBlogInput): Promise<IBlog | null> {
    await dbConnect();

    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.slug !== undefined) updateData.slug = input.slug.toLowerCase();
    if (input.content !== undefined) updateData.content = input.content;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    if (input.category !== undefined) {
      updateData.category = input.category ? new Types.ObjectId(input.category) : null;
    }
    if (input.tags !== undefined) {
      updateData.tags = input.tags.map((tagId) => new Types.ObjectId(tagId));
    }
    if (input.featuredImage !== undefined) {
      updateData.featuredImage = input.featuredImage
        ? new Types.ObjectId(input.featuredImage)
        : null;
    }

    const blog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return blog;
  },

  /**
   * Gets all blogs with populated relations (for admin).
   */
  async getAllBlogs(): Promise<IBlog[]> {
    await dbConnect();
    return Blog.find()
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .populate('featuredImage', 'url filename')
      .sort({ createdAt: -1 });
  },

  /**
   * Gets only active blogs with populated relations (for public views).
   */
  async getActiveBlogs(): Promise<IBlog[]> {
    await dbConnect();
    return Blog.find({ isActive: true })
      .populate('category', 'name slug isActive')
      .populate('tags', 'name slug isActive')
      .populate('featuredImage', 'url filename')
      .sort({ createdAt: -1 });
  },

  /**
   * Gets a blog by ID with populated relations.
   */
  async getBlogById(id: string): Promise<IBlog | null> {
    await dbConnect();
    return Blog.findById(id)
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .populate('featuredImage', 'url filename');
  },

  /**
   * Gets a blog by slug with populated relations.
   */
  async getBlogBySlug(slug: string): Promise<IBlog | null> {
    await dbConnect();
    return Blog.findOne({ slug: slug.toLowerCase() })
      .populate('category', 'name slug isActive')
      .populate('tags', 'name slug isActive')
      .populate('featuredImage', 'url filename');
  },

  /**
   * Gets active blogs filtered by category slug.
   */
  async getBlogsByCategory(categorySlug: string): Promise<IBlog[]> {
    await dbConnect();
    return Blog.find({ isActive: true })
      .populate({
        path: 'category',
        match: { slug: categorySlug.toLowerCase(), isActive: true },
        select: 'name slug',
      })
      .populate('tags', 'name slug')
      .populate('featuredImage', 'url filename')
      .sort({ createdAt: -1 });
  },

  /**
   * Gets active blogs filtered by tag slug.
   */
  async getBlogsByTag(tagSlug: string): Promise<IBlog[]> {
    await dbConnect();
    return Blog.find({ isActive: true })
      .populate('category', 'name slug')
      .populate({
        path: 'tags',
        match: { slug: tagSlug.toLowerCase(), isActive: true },
        select: 'name slug',
      })
      .populate('featuredImage', 'url filename')
      .sort({ createdAt: -1 });
  },

  /**
   * Toggles the isActive status of a blog.
   */
  async toggleActiveStatus(id: string): Promise<IBlog | null> {
    await dbConnect();
    const blog = await Blog.findById(id);
    if (!blog) return null;

    blog.isActive = !blog.isActive;
    await blog.save();
    return blog;
  },

  /**
   * Deletes a blog by ID.
   */
  async deleteBlog(id: string): Promise<IBlog | null> {
    await dbConnect();
    return Blog.findByIdAndDelete(id);
  },
};

export default BlogService;

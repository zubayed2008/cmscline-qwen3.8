import dbConnect from '@/utils/db-connect';
import Blog, { IBlog } from '@/models/blog-model';
import { Types } from 'mongoose';
import { VersionService } from '@/services/version-service';
import type { Locale } from '@/utils/locale-config';
import { resolveLocalized, toTranslationsRecord } from '@/utils/localized-content';

/**
 * Per-locale overrides stored in the `translations` map (Phase 15.5).
 * Keyed by locale code, e.g. { bn: { title: '...', content: '...' } }.
 */
export interface TranslationsInput {
  [locale: string]: { title?: string; content?: string };
}

export interface CreateBlogInput {
  title: string;
  slug: string;
  content: string;
  translations?: TranslationsInput;
  category?: string;
  tags?: string[];
  featuredImage?: string;
  isActive?: boolean;
}

export interface UpdateBlogInput {
  title?: string;
  slug?: string;
  content?: string;
  translations?: TranslationsInput;
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
      translations: input.translations ?? {},
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

    // Phase 11.1: create the initial version snapshot (best-effort)
    try {
      await VersionService.createVersion({
        contentType: 'blog',
        contentId: blog._id.toString(),
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        translations: toTranslationsRecord(blog.translations),
        changeSummary: 'Initial version',
      });
    } catch (error) {
      console.error('Failed to create initial blog version:', error);
    }

    return blog;
  },

  /**
   * Updates a blog post by ID.
   * Snapshots the previous state into version history when content changes (Phase 11.1).
   */
  async updateBlog(id: string, input: UpdateBlogInput): Promise<IBlog | null> {
    await dbConnect();

    // Phase 11.1: snapshot the previous state before content changes (best-effort)
    const currentBlog = await Blog.findById(id);
    const contentChanged =
      currentBlog &&
      ((input.title !== undefined && input.title !== currentBlog.title) ||
        (input.slug !== undefined && input.slug.toLowerCase() !== currentBlog.slug) ||
        (input.content !== undefined && input.content !== currentBlog.content));

    if (contentChanged && currentBlog) {
      try {
        await VersionService.createVersion({
          contentType: 'blog',
          contentId: id,
          title: currentBlog.title,
          slug: currentBlog.slug,
          content: currentBlog.content,
          translations: toTranslationsRecord(currentBlog.translations),
          changeSummary: 'Snapshot before update',
        });
      } catch (error) {
        console.error('Failed to snapshot blog before update:', error);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.slug !== undefined) updateData.slug = input.slug.toLowerCase();
    if (input.content !== undefined) updateData.content = input.content;
    // Phase 15.5: replace the whole translations map when provided
    // (translation-only changes intentionally do NOT trigger a version snapshot)
    if (input.translations !== undefined) updateData.translations = input.translations;
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
  async getActiveBlogs(locale?: Locale): Promise<IBlog[]> {
    await dbConnect();
    const blogs = await Blog.find({ isActive: true })
      .populate('category', 'name slug isActive')
      .populate('tags', 'name slug isActive')
      .populate('featuredImage', 'url filename')
      .sort({ createdAt: -1 });

    // Phase 15.5: localize title/content for public views (mutates in place)
    if (locale && locale !== 'en') {
      for (const blog of blogs) {
        Object.assign(blog, resolveLocalized(blog, locale));
      }
    }
    return blogs;
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
  async getBlogBySlug(slug: string, locale?: Locale): Promise<IBlog | null> {
    await dbConnect();
    const blog = await Blog.findOne({ slug: slug.toLowerCase() })
      .populate('category', 'name slug isActive')
      .populate('tags', 'name slug isActive')
      .populate('featuredImage', 'url filename');

    // Phase 15.5: localize title/content for public views
    if (blog && locale && locale !== 'en') {
      Object.assign(blog, resolveLocalized(blog, locale));
    }
    return blog;
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
   * Deletes a blog by ID. Also removes its version history (Phase 11.1).
   */
  async deleteBlog(id: string): Promise<IBlog | null> {
    await dbConnect();
    const blog = await Blog.findByIdAndDelete(id);

    // Phase 11.1: clean up version history for the deleted blog (best-effort)
    if (blog) {
      try {
        await VersionService.deleteVersionsForContent('blog', id);
      } catch (error) {
        console.error('Failed to delete versions for blog:', error);
      }
    }

    return blog;
  },
};

export default BlogService;

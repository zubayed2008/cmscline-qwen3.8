import dbConnect from '@/utils/db-connect';
import Page from '@/models/page-model';
import type { ContentTranslation } from '@/models/page-model';
import Blog from '@/models/blog-model';
import { generateExcerpt } from '@/utils/seo';
import type {
  ISearchProvider,
  SearchQuery,
  SearchResponse,
  SearchResult,
  SearchContentType,
} from './search-types';

/**
 * MongoDB Text Index Search Provider
 *
 * Implements the ISearchProvider interface using MongoDB's built-in
 * $text search with text indexes on the Page and Blog collections.
 *
 * This provider requires text indexes to be defined on the models:
 * - pageSchema.index({ title: 'text', content: 'text' })
 * - blogSchema.index({ title: 'text', content: 'text' })
 *
 * Note: MongoDB only allows ONE text index per collection.
 */
export class MongoDBSearchProvider implements ISearchProvider {
  /**
   * Check if the search provider is properly configured
   * MongoDB text search is always available when connected to MongoDB.
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Strip HTML tags from content for a clean excerpt
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Phase 15.5: pick the translated title/content for the requested locale,
   * falling back to the English base fields when no translation exists.
   */
  private localizedText(
    base: string,
    translations:
      | Map<string, ContentTranslation>
      | Record<string, ContentTranslation>
      | undefined,
    locale: string,
    field: 'title' | 'content'
  ): string {
    if (locale !== 'en' && translations) {
      const entry =
        translations instanceof Map ? translations.get(locale) : translations[locale];
      const value = entry?.[field];
      if (value) return value;
    }
    return base;
  }

  /**
   * Search for content matching the query using MongoDB $text search
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    await dbConnect();

    const searchQuery = query.query.trim();
    const type = query.type || 'all';
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    // Phase 15.5: results are localized (title/excerpt) for this locale
    const locale = query.locale || 'en';

    if (!searchQuery) {
      return { results: [], total: 0, query: searchQuery };
    }

    const results: SearchResult[] = [];

    // Search pages
    if (type === 'all' || type === 'page') {
      const pageResults = await this.searchPages(searchQuery, locale, limit, offset);
      results.push(...pageResults);
    }

    // Search blogs
    if (type === 'all' || type === 'blog') {
      const blogResults = await this.searchBlogs(searchQuery, locale, limit, offset);
      results.push(...blogResults);
    }

    // Sort combined results by score (descending)
    results.sort((a, b) => b.score - a.score);

    // Apply limit and offset to combined results
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total: results.length,
      query: searchQuery,
    };
  }

  /**
   * Search pages using MongoDB $text search
   */
  private async searchPages(
    searchQuery: string,
    locale: string,
    limit: number,
    offset: number
  ): Promise<SearchResult[]> {
    const pages = await Page.find(
      { $text: { $search: searchQuery }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(offset)
      .limit(limit)
      .lean();

    return pages.map((page) => ({
      id: page._id.toString(),
      type: 'page' as SearchContentType,
      title: this.localizedText(page.title, page.translations, locale, 'title'),
      slug: page.slug,
      excerpt: generateExcerpt(
        this.stripHtml(
          this.localizedText(page.content, page.translations, locale, 'content')
        ),
        200
      ),
      score: (page as unknown as { score: number }).score || 0,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }));
  }

  /**
   * Search blogs using MongoDB $text search
   */
  private async searchBlogs(
    searchQuery: string,
    locale: string,
    limit: number,
    offset: number
  ): Promise<SearchResult[]> {
    const blogs = await Blog.find(
      { $text: { $search: searchQuery }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .populate('category', 'name slug isActive')
      .populate('featuredImage', 'url filename')
      .sort({ score: { $meta: 'textScore' } })
      .skip(offset)
      .limit(limit)
      .lean();

    return blogs.map((blog) => {
      const category = blog.category as unknown as {
        _id: string;
        name: string;
        slug: string;
        isActive?: boolean;
      } | null;

      const featuredImage = blog.featuredImage as unknown as {
        _id: string;
        url: string;
        filename: string;
      } | null;

      return {
        id: blog._id.toString(),
        type: 'blog' as SearchContentType,
        title: this.localizedText(blog.title, blog.translations, locale, 'title'),
        slug: blog.slug,
        excerpt: generateExcerpt(
          this.stripHtml(
            this.localizedText(blog.content, blog.translations, locale, 'content')
          ),
          200
        ),
        score: (blog as unknown as { score: number }).score || 0,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
        featuredImageUrl: featuredImage?.url ?? null,
        categoryName: category && category.isActive !== false ? category.name : null,
      };
    });
  }
}
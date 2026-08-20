import { MetadataRoute } from 'next';
import { PageService } from '@/services/page-service';
import { BlogService } from '@/services/blog-service';

/**
 * Dynamic Sitemap Generation
 * Fetches active pages and blogs to generate a comprehensive sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Fetch active content in parallel
  const [pages, blogs] = await Promise.all([
    PageService.getActivePages(),
    BlogService.getActiveBlogs(),
  ]);

  // Generate page URLs
  const pageUrls: MetadataRoute.Sitemap = pages.map((page) => {
    const slug = page.slug === 'home' ? '' : page.slug;
    return {
      url: `${baseUrl}/${slug}`,
      lastModified: page.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: page.isDefaultHomepage ? 1 : 0.8,
    };
  });

  // Generate blog URLs
  const blogUrls: MetadataRoute.Sitemap = blogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.slug}`,
    lastModified: blog.updatedAt || new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Combine all URLs
  return [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Blog listing page
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Dynamic pages
    ...pageUrls,
    // Blog posts
    ...blogUrls,
  ];
}
import { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { BlogService } from '@/services/blog-service';
import ContentRenderer from '@/components/features/content/ContentRenderer';
import StructuredData from '@/components/features/seo/StructuredData';
import { generateExcerpt, generateCanonicalUrl, generateOgImageUrl, generateBlogStructuredData } from '@/utils/seo';
import { getLocale } from '@/utils/i18n';

export const dynamic = 'force-dynamic';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Enterprise CMS';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/** Phase 15.5: resolve the request locale from the NEXT_LOCALE cookie */
async function getRequestLocale() {
  const cookieStore = await cookies();
  return getLocale(cookieStore.get('NEXT_LOCALE')?.value);
}

// Interfaces for populated fields
interface PopulatedMedia {
  _id: string;
  url: string;
  filename: string;
}

interface PopulatedCategory {
  _id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

interface PopulatedTag {
  _id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

interface BlogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await BlogService.getBlogBySlug(slug, await getRequestLocale());

  if (!blog || !blog.isActive) {
    return { title: 'Post Not Found' };
  }

  const excerpt = generateExcerpt(blog.content || '', 160);
  const canonicalUrl = generateCanonicalUrl(siteUrl, `/blog/${slug}`);
  const featuredImage = blog.featuredImage as unknown as PopulatedMedia | null;
  const ogImage = generateOgImageUrl(featuredImage?.url, siteUrl);

  return {
    title: blog.title,
    description: excerpt,
    openGraph: {
      title: `${blog.title} | ${siteName}`,
      description: excerpt,
      url: canonicalUrl,
      siteName,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: blog.title }]
        : [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: blog.title }],
      type: 'article',
      publishedTime: blog.createdAt.toISOString(),
      modifiedTime: blog.updatedAt.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${blog.title} | ${siteName}`,
      description: excerpt,
      images: ogImage ? [ogImage] : [`${siteUrl}/og-image.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

/**
 * Blog Detail Page - Displays a single blog post by slug.
 * Shows featured image, title, content, category, tags, and publication date.
 */
export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const blog = await BlogService.getBlogBySlug(slug, await getRequestLocale());

  // Return 404 if blog not found or not active
  if (!blog || !blog.isActive) {
    notFound();
  }

  const featuredImage = blog.featuredImage as unknown as PopulatedMedia | null;
  const category = blog.category as unknown as PopulatedCategory | null;
  const tags = (blog.tags as unknown as PopulatedTag[]) || [];

  // Generate structured data for this blog post
  const canonicalUrl = generateCanonicalUrl(siteUrl, `/blog/${slug}`);
  const ogImage = generateOgImageUrl(featuredImage?.url, siteUrl);
  const structuredData = generateBlogStructuredData({
    title: blog.title,
    excerpt: generateExcerpt(blog.content || '', 160),
    publishedAt: blog.createdAt,
    updatedAt: blog.updatedAt,
    imageUrl: ogImage,
    url: canonicalUrl,
    siteName,
  });

  return (
    <article className="py-16 bg-white">
      {/* Structured Data for SEO */}
      <StructuredData data={structuredData} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          {/* Category Badge */}
          {category && category.isActive !== false && (
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-4">
              {category.name}
            </span>
          )}

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{blog.title}</h1>

          {/* Publication Date */}
          <time className="text-gray-500" dateTime={blog.createdAt.toISOString()}>
            Published on{' '}
            {blog.createdAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>

        {/* Featured Image */}
        {featuredImage?.url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={featuredImage.url}
              alt={featuredImage.filename || blog.title}
              className="w-full max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <ContentRenderer content={blog.content} />

        {/* Tags */}
        {tags.length > 0 && (
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags
                .filter((tag) => tag.isActive !== false)
                .map((tag) => (
                  <span
                    key={tag._id}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
            </div>
          </footer>
        )}
      </div>
    </article>
  );
}

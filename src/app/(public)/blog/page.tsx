import { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { BlogService } from '@/services/blog-service';
import { getLocale, formatDate } from '@/utils/i18n';

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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read our latest blog posts',
};

/**
 * Blog Listing Page - Displays all active blogs.
 * Shows featured image, title, excerpt, category, and tags.
 */
export default async function BlogPage() {
  // Phase 15.5: localize blog titles/content for the current locale
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get('NEXT_LOCALE')?.value);
  const blogs = await BlogService.getActiveBlogs(locale);

  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Blog</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Stay updated with our latest news, insights, and stories
          </p>
        </header>

        {/* Blog Grid */}
        {blogs.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h2>
            <p className="text-gray-600">Check back soon for new content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => {
              const featuredImage = blog.featuredImage as unknown as PopulatedMedia | null;
              const featuredImageUrl = featuredImage?.url ?? null;

              const category = blog.category as unknown as PopulatedCategory | null;

              // Create excerpt from content (strip HTML and limit length)
              const excerpt = blog.content
                .replace(/<[^>]*>/g, '')
                .substring(0, 150)
                .trim();

              return (
                <article
                  key={blog._id.toString()}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Featured Image */}
                  {featuredImageUrl ? (
                    <Link href={`/blog/${blog.slug}`}>
                      <img
                        src={featuredImageUrl}
                        alt={blog.title}
                        className="w-full h-48 object-cover"
                      />
                    </Link>
                  ) : (
                    <Link
                      href={`/blog/${blog.slug}`}
                      className="block w-full h-48 bg-gradient-to-r from-blue-500 to-blue-700"
                    />
                  )}

                  <div className="p-6">
                    {/* Category Badge */}
                    {category && category.isActive !== false && (
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-3">
                        {category.name}
                      </span>
                    )}

                    {/* Title */}
                    <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                      <Link
                        href={`/blog/${blog.slug}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {blog.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{excerpt}...</p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <time dateTime={blog.createdAt.toISOString()}>
                        {formatDate(
                          blog.createdAt,
                          { year: 'numeric', month: 'long', day: 'numeric' },
                          locale
                        )}
                      </time>
                      <Link
                        href={`/blog/${blog.slug}`}
                        className="text-blue-600 font-medium hover:text-blue-700"
                      >
                        Read More →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

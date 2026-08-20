import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageService } from '@/services/page-service';
import ContentRenderer from '@/components/features/content/ContentRenderer';
import StructuredData from '@/components/features/seo/StructuredData';
import { generateExcerpt, generateCanonicalUrl, generatePageStructuredData } from '@/utils/seo';

export const dynamic = 'force-dynamic';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Enterprise CMS';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface DynamicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await PageService.getPageBySlug(slug);

  if (!page || !page.isActive) {
    return { title: 'Page Not Found' };
  }

  const excerpt = generateExcerpt(page.content || '', 160);
  const canonicalUrl = generateCanonicalUrl(siteUrl, `/${slug}`);

  return {
    title: page.title,
    description: excerpt,
    openGraph: {
      title: `${page.title} | ${siteName}`,
      description: excerpt,
      url: canonicalUrl,
      siteName,
      images: [
        {
          url: `${siteUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | ${siteName}`,
      description: excerpt,
      images: [`${siteUrl}/og-image.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

/**
 * Dynamic Page Route - Resolves custom pages by slug.
 * Examples: /about-us, /privacy-policy, /terms-of-service
 * Only renders active pages; returns 404 for inactive or non-existent pages.
 */
export default async function DynamicPage({ params }: DynamicPageProps) {
  const { slug } = await params;
  const page = await PageService.getPageBySlug(slug);

  // Return 404 if page not found or not active
  if (!page || !page.isActive) {
    notFound();
  }

  // Generate structured data for this page
  const canonicalUrl = generateCanonicalUrl(siteUrl, `/${slug}`);
  const structuredData = generatePageStructuredData({
    title: page.title,
    description: generateExcerpt(page.content || '', 160),
    url: canonicalUrl,
    siteName,
  });

  return (
    <article className="py-16">
      {/* Structured Data for SEO */}
      <StructuredData data={structuredData} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{page.title}</h1>
        </header>

        {/* Page Content */}
        <ContentRenderer content={page.content} />
      </div>
    </article>
  );
}

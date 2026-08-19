import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageService } from '@/services/page-service';
import ContentRenderer from '@/components/features/content/ContentRenderer';

export const dynamic = 'force-dynamic';

interface DynamicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await PageService.getPageBySlug(slug);

  if (!page || !page.isActive) {
    return { title: 'Page Not Found' };
  }

  return {
    title: page.title,
    description: page.content?.substring(0, 160).replace(/<[^>]*>/g, '') || page.title,
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

  return (
    <article className="py-16">
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

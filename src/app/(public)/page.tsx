import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PageService } from '@/services/page-service';
import { CarouselService } from '@/services/carousel-service';
import { NavigationService } from '@/services/navigation-service';
import GenericCarousel from '@/components/ui/GenericCarousel';
import ServiceGrid from '@/components/ui/ServiceGrid';
import ContactSection from '@/components/features/ContactSection';
import MapLocation from '@/components/ui/MapLocation';
import ContentRenderer from '@/components/features/content/ContentRenderer';
import StructuredData from '@/components/features/seo/StructuredData';
import { generateExcerpt, generatePageStructuredData } from '@/utils/seo';
import { getLocale } from '@/utils/i18n';

export const dynamic = 'force-dynamic';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Enterprise CMS';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to our website - Building digital experiences with modern technology',
  openGraph: {
    title: `Home | ${siteName}`,
    description: 'Welcome to our website - Building digital experiences with modern technology',
    url: siteUrl,
    siteName,
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Home | ${siteName}`,
    description: 'Welcome to our website - Building digital experiences with modern technology',
    images: [`${siteUrl}/og-image.png`],
  },
  alternates: {
    canonical: siteUrl,
  },
};

/**
 * Homepage - Resolves to the Page where isDefaultHomepage: true.
 * Renders Hero Carousel, Client Carousel, Service Grid, Contact Section, and Map.
 */
export default async function HomePage() {
  // Phase 15.5: resolve the request locale from the NEXT_LOCALE cookie
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get('NEXT_LOCALE')?.value);

  // Fetch all data in parallel
  const [defaultPage, heroItems, clientItems, navMenu] = await Promise.all([
    PageService.getDefaultHomepage(locale),
    CarouselService.getActiveCarouselItemsByType('hero'),
    CarouselService.getActiveCarouselItemsByType('client'),
    NavigationService.getDefaultNavigationMenu(),
  ]);

  // Map carousel items to component data format
  const heroCarouselItems = heroItems.map((item) => ({
    id: item._id.toString(),
    title: item.title,
    imageOrIconUrl: item.imageOrIconUrl,
  }));

  const clientCarouselItems = clientItems.map((item) => ({
    id: item._id.toString(),
    title: item.title,
    imageOrIconUrl: item.imageOrIconUrl,
  }));

  // Extract only serializable properties from Mongoose documents to avoid
  // circular reference issues when passing from Server to Client Components
  const siteInfoProps = navMenu?.siteInfo
    ? {
        address: navMenu.siteInfo.address ?? undefined,
        phone: navMenu.siteInfo.phone ?? undefined,
        email: navMenu.siteInfo.email ?? undefined,
      }
    : undefined;

  // Generate structured data for homepage
  const structuredData = generatePageStructuredData({
    title: defaultPage?.title || siteName,
    description: generateExcerpt(defaultPage?.content || '', 160),
    url: siteUrl,
    siteName,
  });

  return (
    <div>
      {/* Structured Data for SEO */}
      <StructuredData data={structuredData} />

      {/* Hero Carousel */}
      {heroCarouselItems.length > 0 ? (
        <GenericCarousel type="hero" items={heroCarouselItems} />
      ) : (
        // Fallback hero section when no carousel items exist
        <section className="relative w-full h-[400px] md:h-[500px] bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {defaultPage?.title || 'Welcome to Our Website'}
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
              Building digital experiences with modern technology
            </p>
          </div>
        </section>
      )}

      {/* Page Content (if exists and has content beyond title) */}
      {defaultPage?.content && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <ContentRenderer content={defaultPage.content} />
          </div>
        </section>
      )}

      {/* Service Grid */}
      <ServiceGrid />

      {/* Client Carousel */}
      {clientCarouselItems.length > 0 && (
        <GenericCarousel type="client" title="Companies We Work With" items={clientCarouselItems} />
      )}

      {/* Contact Section */}
      <ContactSection siteInfo={siteInfoProps} />

      {/* Map Location */}
      {siteInfoProps?.address && <MapLocation address={siteInfoProps.address} />}
    </div>
  );
}

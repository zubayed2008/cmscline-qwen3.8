import { NavigationService } from '@/services/navigation-service';
import PublicHeader, { NavLink } from '@/components/features/public/PublicHeader';
import PublicFooter from '@/components/features/public/PublicFooter';

/**
 * Public layout - wraps all public-facing pages with header and footer.
 * Fetches the default navigation menu for header links and site info.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navMenu = await NavigationService.getDefaultNavigationMenu();

  // Map INavLink[] to NavLink[] ensuring required fields
  const links: NavLink[] = navMenu?.links?.map((link) => ({
    label: link.label || 'Link',
    url: link.url || '/',
  })) ?? [
    { label: 'Home', url: '/' },
    { label: 'Blog', url: '/blog' },
  ];

  const siteInfo = navMenu?.siteInfo;
  const siteTitle = navMenu?.title || 'Enterprise CMS';

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader links={links} siteTitle={siteTitle} />
      <main className="flex-1">{children}</main>
      <PublicFooter links={links} siteInfo={siteInfo} siteTitle={siteTitle} />
    </div>
  );
}
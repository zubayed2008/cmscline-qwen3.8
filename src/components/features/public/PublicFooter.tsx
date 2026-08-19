import Link from 'next/link';
import { NavLink } from './PublicHeader';

interface PublicFooterProps {
  links: NavLink[];
  siteInfo?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  siteTitle?: string;
}

/**
 * PublicFooter - Server component for the public site footer.
 * Displays navigation links, contact information, and copyright.
 */
export default function PublicFooter({
  links,
  siteInfo,
  siteTitle = 'CMS',
}: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Site Info */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">{siteTitle}</h3>
            <p className="text-sm text-gray-400">
              Building digital experiences with modern technology.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.url}>
                  <Link
                    href={link.url}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              {siteInfo?.address && (
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-gray-400">{siteInfo.address}</span>
                </li>
              )}
              {siteInfo?.phone && (
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-gray-400">{siteInfo.phone}</span>
                </li>
              )}
              {siteInfo?.email && (
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a
                    href={`mailto:${siteInfo.email}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {siteInfo.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} {siteTitle}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
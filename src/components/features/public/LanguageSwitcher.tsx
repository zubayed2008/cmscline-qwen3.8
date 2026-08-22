'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { getDefaultLocale, type Locale } from '@/utils/i18n';
import { LOCALE_NAMES, UI_ENABLED_LOCALES } from '@/utils/locale-config';

interface LanguageSwitcherProps {
  className?: string;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  currentLocale?: Locale;
}

export default function LanguageSwitcher({
  className = '',
  position = 'top-right',
  currentLocale,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const locales = UI_ENABLED_LOCALES;
  const activeLocale: Locale = currentLocale || getDefaultLocale();

  const switchLocale = (locale: Locale) => {
    setIsOpen(false);
    const redirect = pathname || '/';
    // Full browser navigation through the i18n API route: it sets the
    // NEXT_LOCALE cookie server-side, then redirects back so the whole
    // site reloads and re-renders in the newly selected language.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional full-page reload; client-side routing would serve stale localized content
    window.location.assign(`/api/i18n?locale=${locale}&redirect=${encodeURIComponent(redirect)}`);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="mr-1">🌐</span>
        {LOCALE_NAMES[activeLocale] || activeLocale.toUpperCase()}
        <svg
          className={`ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg focus:outline-none p-1 transition-opacity ${
              position === 'top-right'
                ? 'top-full mr-0'
                : position === 'top-left'
                ? 'top-full ml-0'
                : position === 'bottom-right'
                ? '-bottom-full mr-0'
                : '-bottom-full ml-0'
            }`}
          >
            <ul role="menu" className="py-1">
              {locales.map((locale) => (
                <li key={locale}>
                  <button
                    role="menuitem"
                    onClick={() => switchLocale(locale)}
                    className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                      activeLocale === locale
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{LOCALE_NAMES[locale] || locale.toUpperCase()}</span>
                    {activeLocale === locale && (
                      <svg
                        className="inline-block w-4 h-4 ml-2 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
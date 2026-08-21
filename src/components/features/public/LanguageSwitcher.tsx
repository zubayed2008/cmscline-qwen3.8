'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupportedLocales, getDefaultLocale, type Locale } from '@/utils/i18n';

interface LanguageSwitcherProps {
  className?: string;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  currentLocale?: Locale;
}

const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

export default function LanguageSwitcher({
  className = '',
  position = 'top-right',
  currentLocale,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const locales = getSupportedLocales();
  const activeLocale: Locale = currentLocale || getDefaultLocale();

  const switchLocale = (locale: Locale) => {
    setIsOpen(false);
    const redirect = pathname || '/';
    // The i18n API route sets the NEXT_LOCALE cookie server-side, then redirects back
    router.push(`/api/i18n?locale=${locale}&redirect=${encodeURIComponent(redirect)}`);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="mr-1">🌐</span>
        {localeNames[activeLocale] || activeLocale.toUpperCase()}
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
            className={`absolute z-50 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none p-1 transition-opacity ${
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      activeLocale === locale ? 'text-blue-600 font-medium' : ''
                    }`}
                  >
                    <span>{localeNames[locale] || locale.toUpperCase()}</span>
                    {activeLocale === locale && (
                      <svg
                        className="inline-block w-4 h-4 ml-2 text-blue-500"
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
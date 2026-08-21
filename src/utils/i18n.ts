/**
 * Internationalization (i18n) Utility
 * Handles locale detection, language switching, and localization management
 */

import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';
import frCommon from '@/locales/fr/common.json';

// Available locales defined in next.config.ts
export type Locale = 'en' | 'es' | 'fr';

// Default locale from environment or fallback to 'en'
const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en';

// Loaded translation dictionaries (statically imported, works client & server)
const translations: Record<Locale, Record<string, Record<string, string>>> = {
  en: enCommon,
  es: esCommon,
  fr: frCommon,
};

/**
 * Get the current locale - only use with cookies parameter on client-side
 * @param cookieValue - Optional cookie value
 * @returns Current locale string
 */
export function getLocale(cookieValue?: string): Locale {
  if (cookieValue) {
    const validLocales: Locale[] = ['en', 'es', 'fr'];
    return validLocales.find((l): l is Locale => l === cookieValue) || (defaultLocale as Locale);
  }
  return defaultLocale as Locale;
}

/**
 * Set the locale cookie for language switching
 * @param locale - The locale to set
 */
export function setLocale(locale: Locale): void {
  if (typeof document !== 'undefined') {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    document.cookie = `NEXT_LOCALE=${locale};expires=${expires.toUTCString()};path=/;SameSite=Lax`;

    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }
}

/**
 * Check if the current locale matches a given locale
 * @param locale - Locale to check against
 * @returns boolean indicating match
 */
export function isLocale(locale: Locale, cookieValue?: string): boolean {
  return getLocale(cookieValue) === locale;
}

/**
 * Get supported locales list
 * @returns Array of available locales
 */
export function getSupportedLocales(): Locale[] {
  return ['en', 'es', 'fr'] as const;
}

/**
 * Get default locale from environment
 * @returns Default locale string
 */
export function getDefaultLocale(): Locale {
  return defaultLocale as Locale;
}

/**
 * Format date with locale-specific formatting
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions, locale?: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(getLocale(locale), options).format(d);
}

/**
 * Format number with locale-specific formatting
 * @param number - Number to format
 * @returns Formatted number string
 */
export function formatNumber(number: number, locale?: Locale): string {
  return new Intl.NumberFormat(getLocale(locale)).format(number);
}

/**
 * Format currency with locale-specific formatting
 * @param amount - Amount to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale?: Locale): string {
  return new Intl.NumberFormat(getLocale(locale), {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Extract locale from a path (e.g., '/en/about-us' -> 'en')
 * @param pathname - Full pathname including locale prefix
 * @returns Locale string or null if no locale found
 */
export function extractLocaleFromPath(pathname: string): Locale | null {
  const match = pathname.match(/^\/([a-z]{2})/);
  if (!match) return null;
  const candidate = match[1] as Locale;
  return (['en', 'es', 'fr'] as const).includes(candidate) ? candidate : null;
}

/**
 * Check if a path has a locale prefix
 * @param pathname - Path to check
 * @returns boolean indicating presence of locale
 */
export function hasLocalePrefix(pathname: string): boolean {
  return /^\/([a-z]{2})/.test(pathname);
}

/**
 * Get the localized text for a given key from a translation file
 * @param namespace - Namespace for translations (e.g., 'common', 'navigation')
 * @param key - Translation key
 * @param locale - Optional locale override
 * @returns Localized string or key if not found
 */
export function t(namespace: string, key: string, locale?: Locale): string {
  const currentLocale = getLocale(locale);
  const dict = translations[currentLocale];
  const value = dict?.[namespace]?.[key];
  if (value !== undefined && value !== null) {
    return value;
  }
  // Fallback to default locale, then to the key itself
  const fallback = translations[defaultLocale as Locale]?.[namespace]?.[key];
  return fallback ?? key;
}

/**
 * Get all translations for the current (or given) locale
 * @param locale - Optional locale override
 * @returns Translation object with namespaces
 */
export function getTranslations(locale?: Locale): Record<string, Record<string, string>> {
  return translations[getLocale(locale)] || {};
}

// Exports
const i18n = {
  getLocale,
  setLocale,
  isLocale,
  getSupportedLocales,
  getDefaultLocale,
  formatDate,
  formatNumber,
  formatCurrency,
  extractLocaleFromPath,
  hasLocalePrefix,
  t,
  getTranslations,
};

export default i18n;
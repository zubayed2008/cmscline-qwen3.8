/**
 * Locale Configuration - Single Source of Truth
 *
 * Every supported locale, its display name, and its browser-language mappings
 * are defined HERE. Adding a new language means:
 *   1. Add the code to LOCALES below.
 *   2. Create `src/locales/<code>/common.json`.
 *   3. Register the dictionary import in `src/utils/i18n.ts`.
 * No other file needs to change.
 */

export const LOCALES = ['en', 'es', 'fr', 'bn'] as const;

export type Locale = (typeof LOCALES)[number];

export const SUPPORTED_LOCALES: readonly string[] = LOCALES;

/** Default locale from environment or fallback to 'en' */
export const DEFAULT_LOCALE: string = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en';

/** Human-readable (endonym) names shown in the language switcher */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  bn: 'বাংলা',
};

/**
 * Maps browser Accept-Language codes to supported locales.
 * Used by src/proxy.ts for locale negotiation.
 */
export const LOCALE_MAP: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  es: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  'es-ar': 'es',
  fr: 'fr',
  'fr-fr': 'fr',
  'fr-ca': 'fr',
  bn: 'bn',
  'bn-bd': 'bn',
  'bn-in': 'bn',
};

/** Type guard: is an arbitrary string one of our supported locales? */
export function isSupportedLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

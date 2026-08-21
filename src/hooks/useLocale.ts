'use client';

/**
 * useLocale Hooks
 * Re-exports locale hooks from the LocaleProvider module to keep a single source of truth.
 */
export {
  useLocale,
  useLocaleText,
  LocaleProvider,
  LocaleProvider as default,
  type LocalizationContextType,
  type LocaleProviderProps,
} from '@/components/providers/LocaleProvider';
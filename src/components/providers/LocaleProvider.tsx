'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface LocalizationContextType {
  locale: string;
  changeLanguage: (locale: string) => void;
}

export interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: string;
}

const LocalizationContext = createContext<LocalizationContextType | null>(null);

/**
 * UseLocale Hook
 * Provides access to current locale and language switching function
 */
export function useLocale(): LocalizationContextType {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
}

/**
 * UseLocaleText Hook
 * Provides access to current locale only (convenience hook)
 */
export function useLocaleText(): string {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error('useLocaleText must be used within a LocaleProvider');
  }

  return context.locale;
}

/**
 * Locale Provider Component
 * Manages locale state in client components and keeps the NEXT_LOCALE cookie in sync.
 */
export function LocaleProvider({ children, initialLocale = 'en' }: LocaleProviderProps) {
  const [currentLocale, setCurrentLocale] = useState<string>(initialLocale);

  const changeLanguage = (locale: string) => {
    try {
      setCurrentLocale(locale);

      // Set cookie for server-side consistency
      if (typeof document !== 'undefined') {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);

        document.cookie = `NEXT_LOCALE=${locale};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
        document.documentElement.lang = locale;
      }

      // Dispatch custom event for other components to listen
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('localeChange', {
            detail: { newLocale: locale },
          })
        );
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <LocalizationContext.Provider value={{ locale: currentLocale, changeLanguage }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export default LocaleProvider;

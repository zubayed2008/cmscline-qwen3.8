/**
 * Localized Content Resolution (Phase 15.5)
 *
 * Single shared fallback rule for ALL localized content:
 *   requested locale translation -> original base fields
 *
 * Works on Mongoose documents (Map fields), lean() objects, and
 * serialized JSON — see toPlainTranslations().
 */

import type { Locale } from '@/utils/locale-config';

export interface LocalizedFields {
  title: string;
  content: string;
}

export interface LocalizableDocument extends LocalizedFields {
  translations?: Map<string, Partial<LocalizedFields>> | Record<string, Partial<LocalizedFields>> | null;
}

/** Extract a plain object from a Mongoose Map or a plain record. */
export function toPlainTranslations(
  translations: LocalizableDocument['translations']
): Record<string, Partial<LocalizedFields>> {
  if (!translations) return {};
  if (translations instanceof Map) {
    return Object.fromEntries(translations);
  }
  return translations;
}

/**
 * Resolve the display title/content for a document in the requested locale.
 * Falls back to the original (English) fields when no translation exists,
 * and tolerates partial translations field-by-field.
 */
export function resolveLocalized<T extends LocalizableDocument>(
  doc: T,
  locale?: Locale
): LocalizedFields {
  if (!locale || locale === 'en') {
    return { title: doc.title, content: doc.content };
  }

  const translations = toPlainTranslations(doc.translations);
  const override = translations[locale];

  return {
    title: override?.title?.trim() ? override.title : doc.title,
    content: override?.content?.trim() ? override.content : doc.content,
  };
}

/**
 * True when the document has a non-empty translation for the given locale.
 * Useful for "translated" badges in admin listings.
 */
export function hasTranslation(doc: LocalizableDocument, locale: Locale): boolean {
  const override = toPlainTranslations(doc.translations)[locale];
  return !!(override?.title?.trim() || override?.content?.trim());
}

/**
 * Converts a document's translations into a plain record (for snapshots,
 * serialization to client components, etc.). Returns undefined when there
 * are no translations so callers can omit the field entirely.
 */
export function toTranslationsRecord(
  translations: LocalizableDocument['translations']
): Record<string, Partial<LocalizedFields>> | undefined {
  const plain = toPlainTranslations(translations);
  return Object.keys(plain).length > 0 ? plain : undefined;
}

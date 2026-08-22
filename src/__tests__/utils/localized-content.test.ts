/**
 * Unit tests for the Phase 15.5 localization helpers.
 * Pure functions — no database mocks required.
 */
import {
  resolveLocalized,
  hasTranslation,
  toTranslationsRecord,
  LocalizableDocument,
} from '@/utils/localized-content';

function makeDoc(overrides: Partial<LocalizableDocument> = {}): LocalizableDocument {
  return {
    title: 'English Title',
    content: '<p>English content</p>',
    ...overrides,
  };
}

describe('localized-content', () => {
  describe('resolveLocalized', () => {
    it('returns base fields when locale is en', () => {
      const doc = makeDoc({
        translations: new Map([['bn', { title: 'বাংলা শিরোনাম', content: 'বাংলা কনটেন্ট' }]]),
      });

      expect(resolveLocalized(doc, 'en')).toEqual({
        title: 'English Title',
        content: '<p>English content</p>',
      });
    });

    it('returns base fields when no locale is given', () => {
      const doc = makeDoc();
      expect(resolveLocalized(doc)).toEqual({
        title: 'English Title',
        content: '<p>English content</p>',
      });
    });

    it('returns the Bangla translation when present', () => {
      const doc = makeDoc({
        translations: new Map([['bn', { title: 'বাংলা শিরোনাম', content: '<p>বাংলা কনটেন্ট</p>' }]]),
      });

      expect(resolveLocalized(doc, 'bn')).toEqual({
        title: 'বাংলা শিরোনাম',
        content: '<p>বাংলা কনটেন্ট</p>',
      });
    });

    it('falls back per-field when the translation is partial (title only)', () => {
      const doc = makeDoc({
        translations: new Map([['bn', { title: 'বাংলা শিরোনাম' }]]),
      });

      const result = resolveLocalized(doc, 'bn');
      expect(result.title).toBe('বাংলা শিরোনাম');
      expect(result.content).toBe('<p>English content</p>');
    });

    it('falls back per-field when the translation is partial (content only)', () => {
      const doc = makeDoc({
        translations: new Map([['bn', { content: '<p>বাংলা কনটেন্ট</p>' }]]),
      });

      const result = resolveLocalized(doc, 'bn');
      expect(result.title).toBe('English Title');
      expect(result.content).toBe('<p>বাংলা কনটেন্ট</p>');
    });

    it('falls back to base fields when the requested locale has no entry', () => {
      const doc = makeDoc({
        translations: new Map([['bn', { title: 'বাংলা শিরোনাম' }]]),
      });

      expect(resolveLocalized(doc, 'fr').title).toBe('English Title');
    });

    it('treats whitespace-only translations as missing', () => {
      const doc = makeDoc({
        translations: new Map([['bn', { title: '   ', content: '' }]]),
      });

      const result = resolveLocalized(doc, 'bn');
      expect(result.title).toBe('English Title');
      expect(result.content).toBe('<p>English content</p>');
    });

    it('works with plain-object translations (lean/serialized docs)', () => {
      const doc = makeDoc({
        translations: { bn: { title: 'বাংলা শিরোনাম' } },
      });

      expect(resolveLocalized(doc, 'bn').title).toBe('বাংলা শিরোনাম');
    });

    it('tolerates null/undefined translations maps', () => {
      expect(resolveLocalized(makeDoc({ translations: null }), 'bn').title).toBe('English Title');
      expect(resolveLocalized(makeDoc({ translations: undefined }), 'bn').title).toBe(
        'English Title'
      );
    });
  });

  describe('hasTranslation', () => {
    it('is true when a non-empty translation exists', () => {
      const doc = makeDoc({ translations: new Map([['bn', { title: 'বাংলা' }]]) });
      expect(hasTranslation(doc, 'bn')).toBe(true);
    });

    it('is false when the translation is empty or absent', () => {
      expect(hasTranslation(makeDoc(), 'bn')).toBe(false);
      expect(hasTranslation(makeDoc({ translations: new Map([['bn', {}]]) }), 'bn')).toBe(false);
    });
  });

  describe('toTranslationsRecord', () => {
    it('converts a Mongoose Map into a plain record', () => {
      const doc = makeDoc({
        translations: new Map([['bn', { title: 'বাংলা', content: 'কনটেন্ট' }]]),
      });

      expect(toTranslationsRecord(doc.translations)).toEqual({
        bn: { title: 'বাংলা', content: 'কনটেন্ট' },
      });
    });

    it('returns undefined when there are no translations (field can be omitted)', () => {
      expect(toTranslationsRecord(undefined)).toBeUndefined();
      expect(toTranslationsRecord(new Map())).toBeUndefined();
    });
  });
});

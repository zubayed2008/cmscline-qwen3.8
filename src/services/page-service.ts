import dbConnect from '@/utils/db-connect';
import Page, { IPage } from '@/models/page-model';
import { VersionService } from '@/services/version-service';
import { resolveLocalized, toTranslationsRecord } from '@/utils/localized-content';
import type { Locale } from '@/utils/locale-config';

/**
 * Per-locale overrides stored in the `translations` map (Phase 15.5).
 * Keyed by locale code, e.g. { bn: { title: '...', content: '...' } }.
 */
export interface TranslationsInput {
  [locale: string]: { title?: string; content?: string };
}

export interface CreatePageInput {
  title: string;
  slug: string;
  content: string;
  translations?: TranslationsInput;
  isDefaultHomepage?: boolean;
  isActive?: boolean;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  content?: string;
  translations?: TranslationsInput;
  isDefaultHomepage?: boolean;
  isActive?: boolean;
}

/**
 * PageService handles all business logic for Page entities.
 * Enforces the "Single Default" rule: only one page can be the default homepage.
 */
export const PageService = {
  /**
   * Creates a new page. If isDefaultHomepage is true, unsets all other pages' default flag.
   */
  async createPage(input: CreatePageInput): Promise<IPage> {
    await dbConnect();

    if (input.isDefaultHomepage) {
      await Page.updateMany({ isDefaultHomepage: true }, { isDefaultHomepage: false });
    }

    const page = await Page.create({
      ...input,
      slug: input.slug.toLowerCase(),
    });

    // Phase 11.1: create the initial version snapshot (best-effort)
    try {
      await VersionService.createVersion({
        contentType: 'page',
        contentId: page._id.toString(),
        title: page.title,
        slug: page.slug,
        content: page.content,
        translations: toTranslationsRecord(page.translations),
        changeSummary: 'Initial version',
      });
    } catch (error) {
      console.error('Failed to create initial page version:', error);
    }

    return page;
  },

  /**
   * Updates a page by ID. If isDefaultHomepage is set to true, unsets all other pages.
   * Snapshots the previous state into version history when content changes (Phase 11.1).
   */
  async updatePage(id: string, input: UpdatePageInput): Promise<IPage | null> {
    await dbConnect();

    // Phase 11.1: snapshot the previous state before content changes (best-effort)
    const currentPage = await Page.findById(id);
    const contentChanged =
      currentPage &&
      ((input.title !== undefined && input.title !== currentPage.title) ||
        (input.slug !== undefined && input.slug.toLowerCase() !== currentPage.slug) ||
        (input.content !== undefined && input.content !== currentPage.content));

    if (contentChanged && currentPage) {
      try {
        await VersionService.createVersion({
          contentType: 'page',
          contentId: id,
          title: currentPage.title,
          slug: currentPage.slug,
          content: currentPage.content,
          translations: toTranslationsRecord(currentPage.translations),
          changeSummary: 'Snapshot before update',
        });
      } catch (error) {
        console.error('Failed to snapshot page before update:', error);
      }
    }

    if (input.isDefaultHomepage === true) {
      await Page.updateMany(
        { _id: { $ne: id }, isDefaultHomepage: true },
        { isDefaultHomepage: false }
      );
    }

    const updateData: UpdatePageInput = { ...input };
    // Phase 15.5: replace the whole translations map when provided
    // (translation-only changes intentionally do NOT trigger a version snapshot)
    if (input.translations !== undefined) updateData.translations = input.translations;
    if (input.slug) {
      updateData.slug = input.slug.toLowerCase();
    }

    const page = await Page.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return page;
  },

  /**
   * Gets all pages (for admin).
   */
  async getAllPages(): Promise<IPage[]> {
    await dbConnect();
    return Page.find().sort({ createdAt: -1 });
  },

  /**
   * Gets only active pages (for public views).
   */
  async getActivePages(): Promise<IPage[]> {
    await dbConnect();
    return Page.find({ isActive: true }).sort({ createdAt: -1 });
  },

  /**
   * Gets a page by ID.
   */
  async getPageById(id: string): Promise<IPage | null> {
    await dbConnect();
    return Page.findById(id);
  },

  /**
   * Gets a page by slug.
   * Phase 15.5: pass `locale` to resolve translated title/content (falls back
   * to the original fields when no translation exists).
   */
  async getPageBySlug(slug: string, locale?: Locale): Promise<IPage | null> {
    await dbConnect();
    const page = await Page.findOne({ slug: slug.toLowerCase() });

    if (page && locale && locale !== 'en') {
      Object.assign(page, resolveLocalized(page, locale));
    }
    return page;
  },

  /**
   * Gets the default homepage (active only, for public views).
   * Phase 15.5: pass `locale` to resolve translated title/content.
   */
  async getDefaultHomepage(locale?: Locale): Promise<IPage | null> {
    await dbConnect();
    const page = await Page.findOne({ isDefaultHomepage: true, isActive: true });

    if (page && locale && locale !== 'en') {
      Object.assign(page, resolveLocalized(page, locale));
    }
    return page;
  },

  /**
   * Gets the default homepage regardless of active status (for admin).
   */
  async getDefaultHomepageAdmin(): Promise<IPage | null> {
    await dbConnect();
    return Page.findOne({ isDefaultHomepage: true });
  },

  /**
   * Toggles the isActive status of a page.
   */
  async toggleActiveStatus(id: string): Promise<IPage | null> {
    await dbConnect();
    const page = await Page.findById(id);
    if (!page) return null;

    page.isActive = !page.isActive;
    await page.save();
    return page;
  },

  /**
   * Deletes a page by ID. Also removes its version history (Phase 11.1).
   */
  async deletePage(id: string): Promise<IPage | null> {
    await dbConnect();
    const page = await Page.findByIdAndDelete(id);

    // Phase 11.1: clean up version history for the deleted page (best-effort)
    if (page) {
      try {
        await VersionService.deleteVersionsForContent('page', id);
      } catch (error) {
        console.error('Failed to delete versions for page:', error);
      }
    }

    return page;
  },
};

export default PageService;

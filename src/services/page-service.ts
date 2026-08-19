import dbConnect from '@/utils/db-connect';
import Page, { IPage } from '@/models/page-model';

export interface CreatePageInput {
  title: string;
  slug: string;
  content: string;
  isDefaultHomepage?: boolean;
  isActive?: boolean;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  content?: string;
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

    return page;
  },

  /**
   * Updates a page by ID. If isDefaultHomepage is set to true, unsets all other pages.
   */
  async updatePage(id: string, input: UpdatePageInput): Promise<IPage | null> {
    await dbConnect();

    if (input.isDefaultHomepage === true) {
      await Page.updateMany(
        { _id: { $ne: id }, isDefaultHomepage: true },
        { isDefaultHomepage: false }
      );
    }

    const updateData: UpdatePageInput = { ...input };
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
   */
  async getPageBySlug(slug: string): Promise<IPage | null> {
    await dbConnect();
    return Page.findOne({ slug: slug.toLowerCase() });
  },

  /**
   * Gets the default homepage (active only, for public views).
   */
  async getDefaultHomepage(): Promise<IPage | null> {
    await dbConnect();
    return Page.findOne({ isDefaultHomepage: true, isActive: true });
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
   * Deletes a page by ID.
   */
  async deletePage(id: string): Promise<IPage | null> {
    await dbConnect();
    return Page.findByIdAndDelete(id);
  },
};

export default PageService;

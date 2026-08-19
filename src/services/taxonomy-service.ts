import dbConnect from '@/utils/db-connect';
import Category, { ICategory } from '@/models/category-model';
import Tag, { ITag } from '@/models/tag-model';

export interface CreateTaxonomyInput {
  name: string;
  slug: string;
  isActive?: boolean;
}

export interface UpdateTaxonomyInput {
  name?: string;
  slug?: string;
  isActive?: boolean;
}

/**
 * CategoryService handles all business logic for Category entities.
 */
export const CategoryService = {
  async createCategory(input: CreateTaxonomyInput): Promise<ICategory> {
    await dbConnect();
    return Category.create({
      ...input,
      slug: input.slug.toLowerCase(),
    });
  },

  async updateCategory(id: string, input: UpdateTaxonomyInput): Promise<ICategory | null> {
    await dbConnect();

    const updateData: UpdateTaxonomyInput = { ...input };
    if (input.slug) {
      updateData.slug = input.slug.toLowerCase();
    }

    return Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  },

  async getAllCategories(): Promise<ICategory[]> {
    await dbConnect();
    return Category.find().sort({ createdAt: -1 });
  },

  async getActiveCategories(): Promise<ICategory[]> {
    await dbConnect();
    return Category.find({ isActive: true }).sort({ createdAt: -1 });
  },

  async getCategoryById(id: string): Promise<ICategory | null> {
    await dbConnect();
    return Category.findById(id);
  },

  async getCategoryBySlug(slug: string): Promise<ICategory | null> {
    await dbConnect();
    return Category.findOne({ slug: slug.toLowerCase() });
  },

  async toggleActiveStatus(id: string): Promise<ICategory | null> {
    await dbConnect();
    const category = await Category.findById(id);
    if (!category) return null;

    category.isActive = !category.isActive;
    await category.save();
    return category;
  },

  async deleteCategory(id: string): Promise<ICategory | null> {
    await dbConnect();
    return Category.findByIdAndDelete(id);
  },
};

/**
 * TagService handles all business logic for Tag entities.
 */
export const TagService = {
  async createTag(input: CreateTaxonomyInput): Promise<ITag> {
    await dbConnect();
    return Tag.create({
      ...input,
      slug: input.slug.toLowerCase(),
    });
  },

  async updateTag(id: string, input: UpdateTaxonomyInput): Promise<ITag | null> {
    await dbConnect();

    const updateData: UpdateTaxonomyInput = { ...input };
    if (input.slug) {
      updateData.slug = input.slug.toLowerCase();
    }

    return Tag.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  },

  async getAllTags(): Promise<ITag[]> {
    await dbConnect();
    return Tag.find().sort({ createdAt: -1 });
  },

  async getActiveTags(): Promise<ITag[]> {
    await dbConnect();
    return Tag.find({ isActive: true }).sort({ createdAt: -1 });
  },

  async getTagById(id: string): Promise<ITag | null> {
    await dbConnect();
    return Tag.findById(id);
  },

  async getTagBySlug(slug: string): Promise<ITag | null> {
    await dbConnect();
    return Tag.findOne({ slug: slug.toLowerCase() });
  },

  async toggleActiveStatus(id: string): Promise<ITag | null> {
    await dbConnect();
    const tag = await Tag.findById(id);
    if (!tag) return null;

    tag.isActive = !tag.isActive;
    await tag.save();
    return tag;
  },

  async deleteTag(id: string): Promise<ITag | null> {
    await dbConnect();
    return Tag.findByIdAndDelete(id);
  },
};
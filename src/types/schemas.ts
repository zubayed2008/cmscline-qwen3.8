import { z } from 'zod';
import { LOCALES } from '@/utils/locale-config';

// ============================================================================
// Shared: Per-locale content translations (Phase 15.5 i18n)
// ============================================================================

const translationEntrySchema = z
  .object({
    title: z.string().max(200, 'Translated title must be 200 characters or less').optional(),
    content: z.string().optional(),
  })
  .refine((entry) => entry.title !== undefined || entry.content !== undefined, {
    message: 'Translation must include a title or content',
  });

/** Keys are locale codes from LOCALES (currently only 'bn' is translatable) */
export const contentTranslationsSchema = z
  .record(
    z.string().refine(
      (key) => (LOCALES as readonly string[]).includes(key),
      'Unsupported locale for translations'
    ),
    translationEntrySchema
  )
  .optional();

// ============================================================================
// Page Schemas
// ============================================================================

export const createPageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content: z.string().min(1, 'Content is required'),
  translations: contentTranslationsSchema,
  isDefaultHomepage: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updatePageSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  content: z.string().min(1, 'Content is required').optional(),
  translations: contentTranslationsSchema,
  isDefaultHomepage: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePageSchema = z.infer<typeof createPageSchema>;
export type UpdatePageSchema = z.infer<typeof updatePageSchema>;

// ============================================================================
// Blog Schemas
// ============================================================================

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content: z.string().min(1, 'Content is required'),
  translations: contentTranslationsSchema,
  category: z.string().regex(objectIdRegex, 'Invalid category ID').optional(),
  tags: z.array(z.string().regex(objectIdRegex, 'Invalid tag ID')).optional(),
  featuredImage: z.string().regex(objectIdRegex, 'Invalid featured image ID').optional(),
  isActive: z.boolean().optional(),
});

export const updateBlogSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  content: z.string().min(1, 'Content is required').optional(),
  translations: contentTranslationsSchema,
  category: z.string().regex(objectIdRegex, 'Invalid category ID').nullable().optional(),
  tags: z.array(z.string().regex(objectIdRegex, 'Invalid tag ID')).optional(),
  featuredImage: z.string().regex(objectIdRegex, 'Invalid featured image ID').nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBlogSchema = z.infer<typeof createBlogSchema>;
export type UpdateBlogSchema = z.infer<typeof updateBlogSchema>;

// ============================================================================
// Taxonomy (Category/Tag) Schemas
// ============================================================================

export const createTaxonomySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  isActive: z.boolean().optional(),
});

export const updateTaxonomySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateTaxonomySchema = z.infer<typeof createTaxonomySchema>;
export type UpdateTaxonomySchema = z.infer<typeof updateTaxonomySchema>;

// ============================================================================
// User Schemas
// ============================================================================

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Admin', 'Editor']).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['Admin', 'Editor']).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;

// ============================================================================
// Auth Schemas (Phase 14: User Management)
// ============================================================================

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  profileImage: z.string().max(1000, 'Profile image URL must be 1000 characters or less').optional(),
});

export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;

// ============================================================================
// Navigation Menu Schemas
// ============================================================================

const navLinkSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label must be 100 characters or less'),
  url: z.string().min(1, 'URL is required').max(500, 'URL must be 500 characters or less'),
});

const siteInfoSchema = z.object({
  address: z.string().max(500, 'Address must be 500 characters or less').optional(),
  phone: z.string().max(50, 'Phone must be 50 characters or less').optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const createNavigationMenuSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  isDefault: z.boolean().optional(),
  links: z.array(navLinkSchema).optional(),
  siteInfo: siteInfoSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateNavigationMenuSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  isDefault: z.boolean().optional(),
  links: z.array(navLinkSchema).optional(),
  siteInfo: siteInfoSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreateNavigationMenuSchema = z.infer<typeof createNavigationMenuSchema>;
export type UpdateNavigationMenuSchema = z.infer<typeof updateNavigationMenuSchema>;

// ============================================================================
// Media Schemas
// ============================================================================

const dimensionsSchema = z.object({
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
});

export const createMediaSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be 255 characters or less'),
  url: z.string().min(1, 'URL is required').max(1000, 'URL must be 1000 characters or less'),
  optimizedUrl: z.string().max(1000, 'URL must be 1000 characters or less').optional(),
  mimeType: z
    .string()
    .min(1, 'MIME type is required')
    .max(100, 'MIME type must be 100 characters or less'),
  size: z.number().positive('Size must be positive'),
  storageType: z.enum(['url', 'upload']).optional(),
  publicId: z.string().max(500, 'Public ID must be 500 characters or less').optional(),
  dimensions: dimensionsSchema.optional(),
  altText: z.string().max(500, 'Alt text must be 500 characters or less').optional(),
  caption: z.string().max(1000, 'Caption must be 1000 characters or less').optional(),
  isActive: z.boolean().optional(),
});

export const updateMediaSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be 255 characters or less')
    .optional(),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(1000, 'URL must be 1000 characters or less')
    .optional(),
  optimizedUrl: z.string().max(1000, 'URL must be 1000 characters or less').optional(),
  mimeType: z
    .string()
    .min(1, 'MIME type is required')
    .max(100, 'MIME type must be 100 characters or less')
    .optional(),
  size: z.number().positive('Size must be positive').optional(),
  storageType: z.enum(['url', 'upload']).optional(),
  publicId: z.string().max(500, 'Public ID must be 500 characters or less').optional(),
  dimensions: dimensionsSchema.optional(),
  altText: z.string().max(500, 'Alt text must be 500 characters or less').optional(),
  caption: z.string().max(1000, 'Caption must be 1000 characters or less').optional(),
  isActive: z.boolean().optional(),
});

export type CreateMediaSchema = z.infer<typeof createMediaSchema>;
export type UpdateMediaSchema = z.infer<typeof updateMediaSchema>;

// ============================================================================
// Carousel Item Schemas
// ============================================================================

const carouselTypeEnum = z.enum(['hero', 'client', 'employee', 'recommendation']);

export const createCarouselItemSchema = z.object({
  title: z.string().max(200, 'Title must be 200 characters or less').optional(),
  imageOrIconUrl: z
    .string()
    .min(1, 'Image or icon URL is required')
    .max(1000, 'URL must be 1000 characters or less'),
  type: carouselTypeEnum,
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateCarouselItemSchema = z.object({
  title: z.string().max(200, 'Title must be 200 characters or less').optional(),
  imageOrIconUrl: z
    .string()
    .min(1, 'Image or icon URL is required')
    .max(1000, 'URL must be 1000 characters or less')
    .optional(),
  type: carouselTypeEnum.optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const reorderCarouselItemsSchema = z.object({
  type: carouselTypeEnum,
  items: z.array(
    z.object({
      id: z.string().regex(objectIdRegex, 'Invalid item ID'),
      order: z.number().int().min(0),
    })
  ),
});

export type CreateCarouselItemSchema = z.infer<typeof createCarouselItemSchema>;
export type UpdateCarouselItemSchema = z.infer<typeof updateCarouselItemSchema>;
export type ReorderCarouselItemsSchema = z.infer<typeof reorderCarouselItemsSchema>;

// ============================================================================
// Service Item Schemas
// ============================================================================

export const createServiceItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or less'),
  icon: z.string().max(1000, 'Icon must be 1000 characters or less').optional(),
  isActive: z.boolean().optional(),
});

export const updateServiceItemSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  icon: z.string().max(1000, 'Icon must be 1000 characters or less').optional(),
  isActive: z.boolean().optional(),
});

export type CreateServiceItemSchema = z.infer<typeof createServiceItemSchema>;
export type UpdateServiceItemSchema = z.infer<typeof updateServiceItemSchema>;

// ============================================================================
// Contact Submission Schemas
// ============================================================================

export const createContactSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  email: z.string().email('Invalid email address'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be 5000 characters or less'),
  captchaToken: z.string().min(1, 'CAPTCHA token is required'),
});

export type CreateContactSubmissionSchema = z.infer<typeof createContactSubmissionSchema>;

// ============================================================================
// Search Schemas (Phase 12: Search & Discovery)
// ============================================================================

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Search query must be 200 characters or less'),
  type: z.enum(['page', 'blog', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type SearchQuerySchema = z.infer<typeof searchQuerySchema>;

// ============================================================================
// Content Version Schemas (Phase 11.1: Content Versioning)
// ============================================================================

const versionContentTypeEnum = z.enum(['page', 'blog']);

export const createContentVersionSchema = z.object({
  contentType: versionContentTypeEnum,
  contentId: z.string().regex(objectIdRegex, 'Invalid content ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200, 'Slug must be 200 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content: z.string().min(1, 'Content is required'),
  // Phase 15.5: manual snapshots may capture per-locale translations
  translations: contentTranslationsSchema,
  changeSummary: z.string().max(500, 'Change summary must be 500 characters or less').optional(),
});

export const listVersionsQuerySchema = z.object({
  contentType: versionContentTypeEnum,
  contentId: z.string().regex(objectIdRegex, 'Invalid content ID'),
});

export const restoreVersionSchema = z.object({
  changeSummary: z.string().max(500, 'Change summary must be 500 characters or less').optional(),
});

export type CreateContentVersionSchema = z.infer<typeof createContentVersionSchema>;
export type ListVersionsQuerySchema = z.infer<typeof listVersionsQuerySchema>;
export type RestoreVersionSchema = z.infer<typeof restoreVersionSchema>;

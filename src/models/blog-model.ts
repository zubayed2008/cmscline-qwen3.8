import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { ContentTranslation } from '@/models/page-model';

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  translations?: Map<string, ContentTranslation>;
  category?: Types.ObjectId;
  tags: Types.ObjectId[];
  featuredImage?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Embedded per-locale translations (Map => adding locales needs no migration)
const translationSubschema = new Schema<ContentTranslation>(
  {
    title: { type: String },
    content: { type: String },
  },
  { _id: false }
);

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true },
    translations: {
      type: Map,
      of: translationSubschema,
      default: {},
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    featuredImage: { type: Schema.Types.ObjectId, ref: 'Media' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text index for full-text search (Phase 12 + Phase 15.5 i18n)
// MongoDB only allows ONE text index per collection.
// NOTE: if an older { title, content } text index exists in your database,
// run `npm run migrate:i18n-indexes` once so it can be replaced.
blogSchema.index({
  title: 'text',
  content: 'text',
  'translations.bn.title': 'text',
  'translations.bn.content': 'text',
});

const Blog: Model<IBlog> = mongoose.models.Blog || mongoose.model<IBlog>('Blog', blogSchema);

/** Exported for scripts/migrate-i18n-indexes.ts */
export const BlogSchema = blogSchema;

export default Blog;

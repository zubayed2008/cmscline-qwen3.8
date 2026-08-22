import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A per-locale translation of user-facing fields.
 * Phase 15.5: keyed by locale code (e.g. 'bn') on the parent Map field.
 */
export interface ContentTranslation {
  title?: string;
  content?: string;
}

export interface IPage extends Document {
  title: string;
  slug: string;
  content: string;
  translations?: Map<string, ContentTranslation>;
  isDefaultHomepage: boolean;
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

const pageSchema = new Schema<IPage>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true }, // Markdown or HTML
    translations: {
      type: Map,
      of: translationSubschema,
      default: {},
    },
    isDefaultHomepage: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text index for full-text search (Phase 12 + Phase 15.5 i18n)
// MongoDB only allows ONE text index per collection.
// NOTE: if an older { title, content } text index exists in your database,
// run `npm run migrate:i18n-indexes` once so it can be replaced.
pageSchema.index({
  title: 'text',
  content: 'text',
  'translations.bn.title': 'text',
  'translations.bn.content': 'text',
});

const Page: Model<IPage> = mongoose.models.Page || mongoose.model<IPage>('Page', pageSchema);

/** Exported for scripts/migrate-i18n-indexes.ts */
export const PageSchema = pageSchema;

export default Page;

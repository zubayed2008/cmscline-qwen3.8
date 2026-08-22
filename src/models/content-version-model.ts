import mongoose, { Schema, Document, Model } from 'mongoose';

export type VersionContentType = 'page' | 'blog';

export interface IContentVersion extends Document {
  contentType: VersionContentType;
  contentId: mongoose.Types.ObjectId;
  version: number;
  title: string;
  slug: string;
  content: string;
  /** Phase 15.5: per-locale translations captured at snapshot time */
  translations?: Map<string, { title?: string; content?: string }>;
  changedBy: mongoose.Types.ObjectId;
  changeSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contentVersionSchema = new Schema<IContentVersion>(
  {
    contentType: {
      type: String,
      enum: ['page', 'blog'],
      required: true,
    },
    // Dynamic reference resolved via refPath (points to Page or Blog collection)
    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'contentType',
    },
    version: { type: Number, required: true, min: 1 },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    content: { type: String, required: true },
    translations: {
      type: Map,
      of: new Schema({ title: { type: String }, content: { type: String } }, { _id: false }),
      default: {},
    },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changeSummary: { type: String },
  },
  { timestamps: true }
);

// Index for efficient queries (spec: Phase 11.1)
contentVersionSchema.index({ contentType: 1, contentId: 1, version: -1 });

const ContentVersion: Model<IContentVersion> =
  mongoose.models.ContentVersion ||
  mongoose.model<IContentVersion>('ContentVersion', contentVersionSchema);

export default ContentVersion;
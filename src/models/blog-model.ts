import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  category?: Types.ObjectId;
  tags: Types.ObjectId[];
  featuredImage?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    featuredImage: { type: Schema.Types.ObjectId, ref: 'Media' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text index for full-text search (Phase 12: Search & Discovery)
// MongoDB only allows ONE text index per collection
blogSchema.index({ title: 'text', content: 'text' });

const Blog: Model<IBlog> = mongoose.models.Blog || mongoose.model<IBlog>('Blog', blogSchema);

export default Blog;

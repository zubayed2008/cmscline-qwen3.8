import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITag extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Tag: Model<ITag> = mongoose.models.Tag || mongoose.model<ITag>('Tag', tagSchema);

export default Tag;

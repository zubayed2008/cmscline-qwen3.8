import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', categorySchema);

export default Category;

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPage extends Document {
  title: string;
  slug: string;
  content: string;
  isDefaultHomepage: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true }, // Markdown or HTML
    isDefaultHomepage: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Page: Model<IPage> = mongoose.models.Page || mongoose.model<IPage>('Page', pageSchema);

export default Page;
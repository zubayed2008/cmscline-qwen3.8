import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IServiceItem extends Document {
  title: string;
  description: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceItemSchema = new Schema<IServiceItem>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String }, // URL or icon class
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ServiceItem: Model<IServiceItem> =
  mongoose.models.ServiceItem || mongoose.model<IServiceItem>('ServiceItem', serviceItemSchema);

export default ServiceItem;
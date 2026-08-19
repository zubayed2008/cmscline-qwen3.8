import mongoose, { Schema, Document, Model } from 'mongoose';

export type CarouselType = 'hero' | 'client' | 'employee' | 'recommendation';

export interface ICarouselItem extends Document {
  title?: string;
  imageOrIconUrl: string;
  type: CarouselType;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const carouselItemSchema = new Schema<ICarouselItem>(
  {
    title: { type: String },
    imageOrIconUrl: { type: String, required: true },
    type: {
      type: String,
      enum: ['hero', 'client', 'employee', 'recommendation'],
      required: true,
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CarouselItem: Model<ICarouselItem> =
  mongoose.models.CarouselItem || mongoose.model<ICarouselItem>('CarouselItem', carouselItemSchema);

export default CarouselItem;

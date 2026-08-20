import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedia extends Document {
  filename: string;
  url: string;
  optimizedUrl?: string;
  mimeType: string;
  size: number;
  storageType: 'url' | 'upload';
  publicId?: string;
  filePath?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  altText?: string;
  caption?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    optimizedUrl: { type: String },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageType: {
      type: String,
      enum: ['url', 'upload'],
      default: 'url',
    },
    publicId: { type: String },
    filePath: { type: String },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
    },
    altText: { type: String },
    caption: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for efficient queries
mediaSchema.index({ storageType: 1 });
mediaSchema.index({ isActive: 1 });

const Media: Model<IMedia> = mongoose.models.Media || mongoose.model<IMedia>('Media', mediaSchema);

export default Media;
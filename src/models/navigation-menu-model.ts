import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INavLink {
  label?: string;
  url?: string;
}

export interface ISiteInfo {
  address?: string;
  phone?: string;
  email?: string;
}

export interface INavigationMenu extends Document {
  title: string;
  isDefault: boolean;
  links: INavLink[];
  siteInfo: ISiteInfo;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const navLinkSchema = new Schema<INavLink>(
  {
    label: { type: String },
    url: { type: String },
  },
  { _id: false }
);

const siteInfoSchema = new Schema<ISiteInfo>(
  {
    address: { type: String },
    phone: { type: String },
    email: { type: String },
  },
  { _id: false }
);

const navigationMenuSchema = new Schema<INavigationMenu>(
  {
    title: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    links: [navLinkSchema],
    siteInfo: siteInfoSchema,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const NavigationMenu: Model<INavigationMenu> =
  mongoose.models.NavigationMenu ||
  mongoose.model<INavigationMenu>('NavigationMenu', navigationMenuSchema);

export default NavigationMenu;

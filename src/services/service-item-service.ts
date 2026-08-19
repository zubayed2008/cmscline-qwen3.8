import dbConnect from '@/utils/db-connect';
import ServiceItem, { IServiceItem } from '@/models/service-item-model';

export interface CreateServiceItemInput {
  title: string;
  description: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateServiceItemInput {
  title?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

/**
 * ServiceItemService handles all business logic for ServiceItem entities.
 */
export const ServiceItemService = {
  /**
   * Creates a new service item.
   */
  async createServiceItem(input: CreateServiceItemInput): Promise<IServiceItem> {
    await dbConnect();
    return ServiceItem.create(input);
  },

  /**
   * Updates a service item by ID.
   */
  async updateServiceItem(id: string, input: UpdateServiceItemInput): Promise<IServiceItem | null> {
    await dbConnect();
    return ServiceItem.findByIdAndUpdate(id, input, {
      new: true,
      runValidators: true,
    });
  },

  /**
   * Gets all service items (for admin).
   */
  async getAllServiceItems(): Promise<IServiceItem[]> {
    await dbConnect();
    return ServiceItem.find().sort({ createdAt: -1 });
  },

  /**
   * Gets only active service items (for public views).
   */
  async getActiveServiceItems(): Promise<IServiceItem[]> {
    await dbConnect();
    return ServiceItem.find({ isActive: true }).sort({ createdAt: -1 });
  },

  /**
   * Gets a service item by ID.
   */
  async getServiceItemById(id: string): Promise<IServiceItem | null> {
    await dbConnect();
    return ServiceItem.findById(id);
  },

  /**
   * Toggles the isActive status of a service item.
   */
  async toggleActiveStatus(id: string): Promise<IServiceItem | null> {
    await dbConnect();
    const item = await ServiceItem.findById(id);
    if (!item) return null;

    item.isActive = !item.isActive;
    await item.save();
    return item;
  },

  /**
   * Deletes a service item by ID.
   */
  async deleteServiceItem(id: string): Promise<IServiceItem | null> {
    await dbConnect();
    return ServiceItem.findByIdAndDelete(id);
  },
};

export default ServiceItemService;
import dbConnect from '@/utils/db-connect';
import CarouselItem, { ICarouselItem, CarouselType } from '@/models/carousel-item-model';

export interface CreateCarouselItemInput {
  title?: string;
  imageOrIconUrl: string;
  type: CarouselType;
  order?: number;
  isActive?: boolean;
}

export interface UpdateCarouselItemInput {
  title?: string;
  imageOrIconUrl?: string;
  type?: CarouselType;
  order?: number;
  isActive?: boolean;
}

/**
 * CarouselService handles all business logic for CarouselItem entities.
 * Supports types: hero, client, employee, recommendation.
 */
export const CarouselService = {
  /**
   * Creates a new carousel item.
   */
  async createCarouselItem(input: CreateCarouselItemInput): Promise<ICarouselItem> {
    await dbConnect();
    return CarouselItem.create(input);
  },

  /**
   * Updates a carousel item by ID.
   */
  async updateCarouselItem(
    id: string,
    input: UpdateCarouselItemInput
  ): Promise<ICarouselItem | null> {
    await dbConnect();
    return CarouselItem.findByIdAndUpdate(id, input, {
      new: true,
      runValidators: true,
    });
  },

  /**
   * Gets all carousel items (for admin).
   */
  async getAllCarouselItems(): Promise<ICarouselItem[]> {
    await dbConnect();
    return CarouselItem.find().sort({ type: 1, order: 1, createdAt: -1 });
  },

  /**
   * Gets only active carousel items (for public views).
   */
  async getActiveCarouselItems(): Promise<ICarouselItem[]> {
    await dbConnect();
    return CarouselItem.find({ isActive: true }).sort({ type: 1, order: 1, createdAt: -1 });
  },

  /**
   * Gets carousel items by type (for admin).
   */
  async getCarouselItemsByType(type: CarouselType): Promise<ICarouselItem[]> {
    await dbConnect();
    return CarouselItem.find({ type }).sort({ order: 1, createdAt: -1 });
  },

  /**
   * Gets active carousel items by type (for public views).
   */
  async getActiveCarouselItemsByType(type: CarouselType): Promise<ICarouselItem[]> {
    await dbConnect();
    return CarouselItem.find({ type, isActive: true }).sort({ order: 1, createdAt: -1 });
  },

  /**
   * Gets a carousel item by ID.
   */
  async getCarouselItemById(id: string): Promise<ICarouselItem | null> {
    await dbConnect();
    return CarouselItem.findById(id);
  },

  /**
   * Toggles the isActive status of a carousel item.
   */
  async toggleActiveStatus(id: string): Promise<ICarouselItem | null> {
    await dbConnect();
    const item = await CarouselItem.findById(id);
    if (!item) return null;

    item.isActive = !item.isActive;
    await item.save();
    return item;
  },

  /**
   * Deletes a carousel item by ID.
   */
  async deleteCarouselItem(id: string): Promise<ICarouselItem | null> {
    await dbConnect();
    return CarouselItem.findByIdAndDelete(id);
  },

  /**
   * Reorders carousel items of a specific type.
   * Accepts an array of { id, order } objects.
   */
  async reorderCarouselItems(
    type: CarouselType,
    orderList: Array<{ id: string; order: number }>
  ): Promise<void> {
    await dbConnect();

    const bulkOps = orderList.map((item) => ({
      updateOne: {
        filter: { _id: item.id, type },
        update: { order: item.order },
      },
    }));

    if (bulkOps.length > 0) {
      await CarouselItem.bulkWrite(bulkOps);
    }
  },
};

export default CarouselService;

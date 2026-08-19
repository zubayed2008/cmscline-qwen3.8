import dbConnect from '@/utils/db-connect';
import NavigationMenu, {
  INavigationMenu,
  INavLink,
  ISiteInfo,
} from '@/models/navigation-menu-model';

export interface CreateNavigationMenuInput {
  title: string;
  isDefault?: boolean;
  links?: INavLink[];
  siteInfo?: ISiteInfo;
  isActive?: boolean;
}

export interface UpdateNavigationMenuInput {
  title?: string;
  isDefault?: boolean;
  links?: INavLink[];
  siteInfo?: ISiteInfo;
  isActive?: boolean;
}

/**
 * NavigationService handles all business logic for NavigationMenu entities.
 * Enforces the "Single Default" rule: only one navigation menu can be the default.
 */
export const NavigationService = {
  /**
   * Creates a new navigation menu. If isDefault is true, unsets all other menus' default flag.
   */
  async createNavigationMenu(input: CreateNavigationMenuInput): Promise<INavigationMenu> {
    await dbConnect();

    if (input.isDefault) {
      await NavigationMenu.updateMany({ isDefault: true }, { isDefault: false });
    }

    const menu = await NavigationMenu.create(input);
    return menu;
  },

  /**
   * Updates a navigation menu by ID. If isDefault is set to true, unsets all other menus.
   */
  async updateNavigationMenu(
    id: string,
    input: UpdateNavigationMenuInput
  ): Promise<INavigationMenu | null> {
    await dbConnect();

    if (input.isDefault === true) {
      await NavigationMenu.updateMany({ _id: { $ne: id }, isDefault: true }, { isDefault: false });
    }

    const menu = await NavigationMenu.findByIdAndUpdate(id, input, {
      new: true,
      runValidators: true,
    });

    return menu;
  },

  /**
   * Gets all navigation menus (for admin).
   */
  async getAllNavigationMenus(): Promise<INavigationMenu[]> {
    await dbConnect();
    return NavigationMenu.find().sort({ createdAt: -1 });
  },

  /**
   * Gets only active navigation menus (for public views).
   */
  async getActiveNavigationMenus(): Promise<INavigationMenu[]> {
    await dbConnect();
    return NavigationMenu.find({ isActive: true }).sort({ createdAt: -1 });
  },

  /**
   * Gets a navigation menu by ID.
   */
  async getNavigationMenuById(id: string): Promise<INavigationMenu | null> {
    await dbConnect();
    return NavigationMenu.findById(id);
  },

  /**
   * Gets the default navigation menu (active only, for public views).
   */
  async getDefaultNavigationMenu(): Promise<INavigationMenu | null> {
    await dbConnect();
    return NavigationMenu.findOne({ isDefault: true, isActive: true });
  },

  /**
   * Gets the default navigation menu regardless of active status (for admin).
   */
  async getDefaultNavigationMenuAdmin(): Promise<INavigationMenu | null> {
    await dbConnect();
    return NavigationMenu.findOne({ isDefault: true });
  },

  /**
   * Toggles the isActive status of a navigation menu.
   */
  async toggleActiveStatus(id: string): Promise<INavigationMenu | null> {
    await dbConnect();
    const menu = await NavigationMenu.findById(id);
    if (!menu) return null;

    menu.isActive = !menu.isActive;
    await menu.save();
    return menu;
  },

  /**
   * Deletes a navigation menu by ID.
   */
  async deleteNavigationMenu(id: string): Promise<INavigationMenu | null> {
    await dbConnect();
    return NavigationMenu.findByIdAndDelete(id);
  },
};

export default NavigationService;

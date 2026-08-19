import dbConnect from '@/utils/db-connect';
import User, { IUser, UserRole } from '@/models/user-model';
import bcrypt from 'bcryptjs';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Sanitizes a user document by removing sensitive fields.
 */
function sanitizeUser(user: IUser) {
  const userObj = user.toObject();
  delete userObj.passwordHash;
  return userObj;
}

/**
 * UserService handles all business logic for User entities.
 * Includes password hashing and authentication verification.
 */
export const UserService = {
  /**
   * Creates a new user with hashed password.
   */
  async createUser(input: CreateUserInput): Promise<IUser> {
    await dbConnect();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role || 'Editor',
      isActive: input.isActive ?? true,
    });

    return user;
  },

  /**
   * Updates a user by ID. If password is provided, it will be re-hashed.
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<IUser | null> {
    await dbConnect();

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email.toLowerCase();
    if (input.role !== undefined) updateData.role = input.role;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    if (input.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(input.password, salt);
    }

    return User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  },

  /**
   * Gets all users (for admin).
   */
  async getAllUsers(): Promise<IUser[]> {
    await dbConnect();
    return User.find().sort({ createdAt: -1 });
  },

  /**
   * Gets only active users.
   */
  async getActiveUsers(): Promise<IUser[]> {
    await dbConnect();
    return User.find({ isActive: true }).sort({ createdAt: -1 });
  },

  /**
   * Gets a user by ID.
   */
  async getUserById(id: string): Promise<IUser | null> {
    await dbConnect();
    return User.findById(id);
  },

  /**
   * Gets a user by email (for authentication).
   */
  async getUserByEmail(email: string): Promise<IUser | null> {
    await dbConnect();
    return User.findOne({ email: email.toLowerCase() });
  },

  /**
   * Verifies user credentials. Returns the user if valid, null otherwise.
   */
  async verifyCredentials(email: string, password: string): Promise<IUser | null> {
    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  },

  /**
   * Toggles the isActive status of a user.
   */
  async toggleActiveStatus(id: string): Promise<IUser | null> {
    await dbConnect();
    const user = await User.findById(id);
    if (!user) return null;

    user.isActive = !user.isActive;
    await user.save();
    return user;
  },

  /**
   * Deletes a user by ID.
   */
  async deleteUser(id: string): Promise<IUser | null> {
    await dbConnect();
    return User.findByIdAndDelete(id);
  },

  sanitizeUser,
};

export default UserService;

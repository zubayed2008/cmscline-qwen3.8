import dbConnect from '@/utils/db-connect';
import User, { IUser, UserRole } from '@/models/user-model';
import bcrypt from 'bcryptjs';
import { generateTokenWithExpiry, hashToken, isTokenExpired } from '@/utils/tokens';

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
  profileImage?: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  profileImage?: string;
}

/**
 * Sanitizes a user document by removing sensitive fields.
 */
function sanitizeUser(user: IUser) {
  const userObj = user.toObject();
  delete userObj.passwordHash;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpiry;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpiry;
  return userObj;
}

/**
 * UserService handles all business logic for User entities.
 * Includes password hashing, authentication verification,
 * email verification, and password reset.
 */
export const UserService = {
  /**
   * Creates a new user with hashed password.
   * Generates an email verification token.
   */
  async createUser(input: CreateUserInput): Promise<IUser> {
    await dbConnect();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const { token, expiresAt } = generateTokenWithExpiry(24);

    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role || 'Editor',
      isActive: input.isActive ?? true,
      emailVerified: false,
      emailVerificationToken: hashToken(token),
      emailVerificationExpiry: expiresAt,
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
    if (input.profileImage !== undefined) updateData.profileImage = input.profileImage;

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
   * Updates the current user's profile.
   * Validates current password if changing password or email.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<IUser | null> {
    await dbConnect();

    const user = await User.findById(userId);
    if (!user) return null;

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;

    // If changing email, verify current password
    if (input.email !== undefined && input.email.toLowerCase() !== user.email) {
      if (!input.currentPassword) {
        throw new Error('Current password is required to change email');
      }
      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
      updateData.email = input.email.toLowerCase();
      // Reset email verification when email changes
      updateData.emailVerified = false;
      const { token, expiresAt } = generateTokenWithExpiry(24);
      updateData.emailVerificationToken = hashToken(token);
      updateData.emailVerificationExpiry = expiresAt;
    }

    if (input.profileImage !== undefined) updateData.profileImage = input.profileImage;

    // If changing password, verify current password
    if (input.newPassword) {
      if (!input.currentPassword) {
        throw new Error('Current password is required to change password');
      }
      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(input.newPassword, salt);
    }

    return User.findByIdAndUpdate(userId, updateData, {
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
   * Tracks the last login time for a user.
   */
  async trackLogin(userId: string): Promise<void> {
    await dbConnect();
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  },

  /**
   * Generates an email verification token for a user.
   * Returns the plaintext token (to be sent via email).
   */
  async generateEmailVerificationToken(email: string): Promise<string | null> {
    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return null;

    const { token, expiresAt } = generateTokenWithExpiry(24);

    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken: hashToken(token),
      emailVerificationExpiry: expiresAt,
    });

    return token;
  },

  /**
   * Verifies a user's email using the token.
   */
  async verifyEmail(token: string): Promise<boolean> {
    await dbConnect();

    const hashedToken = hashToken(token);
    const user = await User.findOne({ emailVerificationToken: hashedToken });

    if (!user) return false;
    if (isTokenExpired(user.emailVerificationExpiry)) return false;

    await User.findByIdAndUpdate(user._id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpiry: undefined,
    });

    return true;
  },

  /**
   * Generates a password reset token for a user.
   * Returns the plaintext token (to be sent via email).
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return null;

    const { token, expiresAt } = generateTokenWithExpiry(1); // 1 hour expiry

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashToken(token),
      passwordResetExpiry: expiresAt,
    });

    return token;
  },

  /**
   * Resets a user's password using the token.
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    await dbConnect();

    const hashedToken = hashToken(token);
    const user = await User.findOne({ passwordResetToken: hashedToken });

    if (!user) return false;
    if (isTokenExpired(user.passwordResetExpiry)) return false;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(user._id, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpiry: undefined,
    });

    return true;
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
import { UserService } from '@/services/user-service';
import User from '@/models/user-model';
import bcrypt from 'bcryptjs';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the User model
jest.mock('@/models/user-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

// Mock tokens utility
jest.mock('@/utils/tokens', () => ({
  generateTokenWithExpiry: jest.fn().mockReturnValue({
    token: 'plain-token',
    expiresAt: new Date('2026-08-21T00:00:00Z'),
  }),
  hashToken: jest.fn().mockReturnValue('hashed-token'),
  isTokenExpired: jest.fn().mockReturnValue(false),
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with hashed password and email verification token', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'Editor',
        isActive: true,
        emailVerified: false,
        emailVerificationToken: 'hashed-token',
        emailVerificationExpiry: new Date('2026-08-21T00:00:00Z'),
      };

      (User.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'plain-password',
      });

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 'salt');
      expect(User.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'Editor',
        isActive: true,
        emailVerified: false,
        emailVerificationToken: 'hashed-token',
        emailVerificationExpiry: new Date('2026-08-21T00:00:00Z'),
      });
      expect(result.email).toBe('test@example.com');
    });

    it('should lowercase email when creating user', async () => {
      const mockUser = {
        _id: 'user-id-2',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'Admin',
        isActive: true,
        emailVerified: false,
        emailVerificationToken: 'hashed-token',
        emailVerificationExpiry: new Date('2026-08-21T00:00:00Z'),
      };

      (User.create as jest.Mock).mockResolvedValue(mockUser);

      await UserService.createUser({
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        password: 'password',
        role: 'Admin',
      });

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });
  });

  describe('updateUser', () => {
    it('should update user without changing password if not provided', async () => {
      const mockUpdatedUser = {
        _id: 'user-id-1',
        name: 'Updated Name',
        email: 'test@example.com',
        role: 'Editor',
        isActive: true,
      };

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await UserService.updateUser('user-id-1', { name: 'Updated Name' });

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        { name: 'Updated Name' },
        { new: true, runValidators: true }
      );
    });

    it('should hash new password when provided', async () => {
      const mockUpdatedUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'Editor',
        isActive: true,
      };

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await UserService.updateUser('user-id-1', { password: 'new-password' });

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 'salt');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        { passwordHash: 'hashed-password' },
        { new: true, runValidators: true }
      );
    });
  });

  describe('updateProfile', () => {
    it('should update name and profile image', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Old Name',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      const mockUpdatedUser = {
        ...mockUser,
        name: 'New Name',
        profileImage: 'https://example.com/avatar.jpg',
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await UserService.updateProfile('user-id-1', {
        name: 'New Name',
        profileImage: 'https://example.com/avatar.jpg',
      });

      expect(User.findById).toHaveBeenCalledWith('user-id-1');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        {
          name: 'New Name',
          profileImage: 'https://example.com/avatar.jpg',
        },
        { new: true, runValidators: true }
      );
      expect(result?.name).toBe('New Name');
    });

    it('should require current password when changing email', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'old@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        UserService.updateProfile('user-id-1', {
          email: 'new@example.com',
        })
      ).rejects.toThrow('Current password is required to change email');
    });

    it('should verify current password when changing email', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'old@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        UserService.updateProfile('user-id-1', {
          email: 'new@example.com',
          currentPassword: 'wrong-password',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should update email and reset verification when current password is valid', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'old@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      const mockUpdatedUser = {
        ...mockUser,
        email: 'new@example.com',
        emailVerified: false,
        emailVerificationToken: 'hashed-token',
        emailVerificationExpiry: new Date('2026-08-21T00:00:00Z'),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await UserService.updateProfile('user-id-1', {
        email: 'new@example.com',
        currentPassword: 'correct-password',
      });

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        {
          email: 'new@example.com',
          emailVerified: false,
          emailVerificationToken: 'hashed-token',
          emailVerificationExpiry: new Date('2026-08-21T00:00:00Z'),
        },
        { new: true, runValidators: true }
      );
      expect(result?.email).toBe('new@example.com');
    });

    it('should require current password when changing password', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        UserService.updateProfile('user-id-1', {
          newPassword: 'new-password',
        })
      ).rejects.toThrow('Current password is required to change password');
    });

    it('should update password when current password is valid', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      const mockUpdatedUser = {
        ...mockUser,
        passwordHash: 'new-hashed-password',
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await UserService.updateProfile('user-id-1', {
        newPassword: 'new-password',
        currentPassword: 'correct-password',
      });

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 'salt');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-1',
        { passwordHash: 'hashed-password' },
        { new: true, runValidators: true }
      );
      expect(result?.passwordHash).toBe('new-hashed-password');
    });
  });

  describe('trackLogin', () => {
    it('should update lastLoginAt', async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      await UserService.trackLogin('user-id-1');

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        lastLoginAt: expect.any(Date),
      });
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate and store a hashed verification token', async () => {
      const mockUser = { _id: 'user-id-1', email: 'test@example.com' };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      const token = await UserService.generateEmailVerificationToken('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        emailVerificationToken: 'hashed-token',
        emailVerificationExpiry: new Date('2026-08-21T00:00:00Z'),
      });
      expect(token).toBe('plain-token');
    });

    it('should return null if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const token = await UserService.generateEmailVerificationToken('unknown@example.com');

      expect(token).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and clear token', async () => {
      const mockUser = {
        _id: 'user-id-1',
        emailVerificationToken: 'hashed-token',
        emailVerificationExpiry: new Date('2026-08-21T00:00:00Z'),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.verifyEmail('plain-token');

      expect(User.findOne).toHaveBeenCalledWith({ emailVerificationToken: 'hashed-token' });
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        emailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpiry: undefined,
      });
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await UserService.verifyEmail('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate and store a hashed reset token', async () => {
      const mockUser = { _id: 'user-id-1', email: 'test@example.com' };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      const token = await UserService.generatePasswordResetToken('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        passwordResetToken: 'hashed-token',
        passwordResetExpiry: new Date('2026-08-21T00:00:00Z'),
      });
      expect(token).toBe('plain-token');
    });

    it('should return null if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const token = await UserService.generatePasswordResetToken('unknown@example.com');

      expect(token).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should reset password and clear token', async () => {
      const mockUser = {
        _id: 'user-id-1',
        passwordResetToken: 'hashed-token',
        passwordResetExpiry: new Date('2026-08-21T00:00:00Z'),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.resetPassword('plain-token', 'new-password');

      expect(User.findOne).toHaveBeenCalledWith({ passwordResetToken: 'hashed-token' });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 'salt');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-id-1', {
        passwordHash: 'hashed-password',
        passwordResetToken: undefined,
        passwordResetExpiry: undefined,
      });
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await UserService.resetPassword('invalid-token', 'new-password');

      expect(result).toBe(false);
    });
  });

  describe('verifyCredentials', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = {
        _id: 'user-id-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await UserService.verifyCredentials('test@example.com', 'correct-password');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com', isActive: true });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await UserService.verifyCredentials('unknown@example.com', 'password');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      const mockUser = {
        _id: 'user-id-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await UserService.verifyCredentials('test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should find user by lowercase email', async () => {
      const mockUser = { _id: '1', email: 'test@example.com' };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.getUserByEmail('TEST@EXAMPLE.COM');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockUser = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await UserService.toggleActiveStatus('1');

      expect(mockUser.isActive).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should return null if user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      const result = await UserService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user by ID', async () => {
      const mockUser = { _id: '1', name: 'Deleted User' };
      (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.deleteUser('1');

      expect(User.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });
  });
});
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

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const mockUser = {
        _id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'Editor',
        isActive: true,
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
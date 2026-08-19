import { ContactService } from '@/services/contact-service';
import ContactSubmission from '@/models/contact-submission-model';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the ContactSubmission model
jest.mock('@/models/contact-submission-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

describe('ContactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubmission', () => {
    it('should create a contact submission with required fields', async () => {
      const mockSubmission = {
        _id: 'contact-id-1',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I have a question.',
        isRead: false,
        captchaScore: 0.9,
      };

      (ContactSubmission.create as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await ContactService.createSubmission({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I have a question.',
        captchaScore: 0.9,
      });

      expect(ContactSubmission.create).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, I have a question.',
        captchaScore: 0.9,
      });
      expect(result).toEqual(mockSubmission);
      expect(result.isRead).toBe(false);
    });

    it('should create a contact submission without captchaScore', async () => {
      const mockSubmission = {
        _id: 'contact-id-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        message: 'Test message',
        isRead: false,
      };

      (ContactSubmission.create as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await ContactService.createSubmission({
        name: 'Jane Smith',
        email: 'jane@example.com',
        message: 'Test message',
      });

      expect(ContactSubmission.create).toHaveBeenCalledWith({
        name: 'Jane Smith',
        email: 'jane@example.com',
        message: 'Test message',
      });
      expect(result).toEqual(mockSubmission);
    });
  });

  describe('getAllSubmissions', () => {
    it('should return all submissions sorted by createdAt descending', async () => {
      const mockSubmissions = [
        { _id: '1', name: 'User 1', isRead: false },
        { _id: '2', name: 'User 2', isRead: true },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockSubmissions);
      (ContactSubmission.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await ContactService.getAllSubmissions();

      expect(ContactSubmission.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe('getUnreadSubmissions', () => {
    it('should return only unread submissions', async () => {
      const mockSubmissions = [
        { _id: '1', name: 'User 1', isRead: false },
        { _id: '2', name: 'User 2', isRead: false },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockSubmissions);
      (ContactSubmission.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await ContactService.getUnreadSubmissions();

      expect(ContactSubmission.find).toHaveBeenCalledWith({ isRead: false });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockSubmissions);
    });

    it('should return empty array when no unread submissions', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      (ContactSubmission.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await ContactService.getUnreadSubmissions();

      expect(result).toEqual([]);
    });
  });

  describe('getSubmissionById', () => {
    it('should return a submission by ID', async () => {
      const mockSubmission = { _id: 'contact-id-1', name: 'John Doe' };
      (ContactSubmission.findById as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await ContactService.getSubmissionById('contact-id-1');

      expect(ContactSubmission.findById).toHaveBeenCalledWith('contact-id-1');
      expect(result).toEqual(mockSubmission);
    });

    it('should return null if submission not found', async () => {
      (ContactSubmission.findById as jest.Mock).mockResolvedValue(null);

      const result = await ContactService.getSubmissionById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark a submission as read', async () => {
      const mockUpdatedSubmission = {
        _id: 'contact-id-1',
        name: 'John Doe',
        isRead: true,
      };

      (ContactSubmission.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedSubmission);

      const result = await ContactService.markAsRead('contact-id-1');

      expect(ContactSubmission.findByIdAndUpdate).toHaveBeenCalledWith(
        'contact-id-1',
        { isRead: true },
        { new: true, runValidators: true }
      );
      expect(result!.isRead).toBe(true);
    });

    it('should return null if submission not found', async () => {
      (ContactSubmission.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await ContactService.markAsRead('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('markAsUnread', () => {
    it('should mark a submission as unread', async () => {
      const mockUpdatedSubmission = {
        _id: 'contact-id-1',
        name: 'John Doe',
        isRead: false,
      };

      (ContactSubmission.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedSubmission);

      const result = await ContactService.markAsUnread('contact-id-1');

      expect(ContactSubmission.findByIdAndUpdate).toHaveBeenCalledWith(
        'contact-id-1',
        { isRead: false },
        { new: true, runValidators: true }
      );
      expect(result!.isRead).toBe(false);
    });
  });

  describe('toggleReadStatus', () => {
    it('should toggle isRead from false to true', async () => {
      const mockSubmission = {
        _id: '1',
        isRead: false,
        save: jest.fn().mockResolvedValue({ _id: '1', isRead: true }),
      };
      (ContactSubmission.findById as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await ContactService.toggleReadStatus('1');

      expect(mockSubmission.isRead).toBe(true);
      expect(mockSubmission.save).toHaveBeenCalled();
    });

    it('should toggle isRead from true to false', async () => {
      const mockSubmission = {
        _id: '1',
        isRead: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isRead: false }),
      };
      (ContactSubmission.findById as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await ContactService.toggleReadStatus('1');

      expect(mockSubmission.isRead).toBe(false);
      expect(mockSubmission.save).toHaveBeenCalled();
    });

    it('should return null if submission not found', async () => {
      (ContactSubmission.findById as jest.Mock).mockResolvedValue(null);

      const result = await ContactService.toggleReadStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteSubmission', () => {
    it('should delete a submission by ID', async () => {
      const mockSubmission = { _id: '1', name: 'Deleted Submission' };
      (ContactSubmission.findByIdAndDelete as jest.Mock).mockResolvedValue(mockSubmission);

      const result = await ContactService.deleteSubmission('1');

      expect(ContactSubmission.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockSubmission);
    });

    it('should return null if submission not found', async () => {
      (ContactSubmission.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await ContactService.deleteSubmission('nonexistent');

      expect(result).toBeNull();
    });
  });
});
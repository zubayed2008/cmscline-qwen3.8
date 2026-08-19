import dbConnect from '@/utils/db-connect';
import ContactSubmission, { IContactSubmission } from '@/models/contact-submission-model';

export interface CreateContactSubmissionInput {
  name: string;
  email: string;
  message: string;
  captchaScore?: number;
}

export interface UpdateContactSubmissionInput {
  isRead?: boolean;
}

/**
 * ContactService handles all business logic for ContactSubmission entities.
 * CAPTCHA verification should be done at the API/controller layer before calling this service.
 */
export const ContactService = {
  /**
   * Creates a new contact submission.
   */
  async createSubmission(input: CreateContactSubmissionInput): Promise<IContactSubmission> {
    await dbConnect();
    return ContactSubmission.create(input);
  },

  /**
   * Gets all contact submissions (for admin).
   */
  async getAllSubmissions(): Promise<IContactSubmission[]> {
    await dbConnect();
    return ContactSubmission.find().sort({ createdAt: -1 });
  },

  /**
   * Gets unread contact submissions (for admin).
   */
  async getUnreadSubmissions(): Promise<IContactSubmission[]> {
    await dbConnect();
    return ContactSubmission.find({ isRead: false }).sort({ createdAt: -1 });
  },

  /**
   * Gets a contact submission by ID.
   */
  async getSubmissionById(id: string): Promise<IContactSubmission | null> {
    await dbConnect();
    return ContactSubmission.findById(id);
  },

  /**
   * Marks a contact submission as read.
   */
  async markAsRead(id: string): Promise<IContactSubmission | null> {
    await dbConnect();
    return ContactSubmission.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true, runValidators: true }
    );
  },

  /**
   * Marks a contact submission as unread.
   */
  async markAsUnread(id: string): Promise<IContactSubmission | null> {
    await dbConnect();
    return ContactSubmission.findByIdAndUpdate(
      id,
      { isRead: false },
      { new: true, runValidators: true }
    );
  },

  /**
   * Toggles the read status of a contact submission.
   */
  async toggleReadStatus(id: string): Promise<IContactSubmission | null> {
    await dbConnect();
    const submission = await ContactSubmission.findById(id);
    if (!submission) return null;

    submission.isRead = !submission.isRead;
    await submission.save();
    return submission;
  },

  /**
   * Deletes a contact submission by ID.
   */
  async deleteSubmission(id: string): Promise<IContactSubmission | null> {
    await dbConnect();
    return ContactSubmission.findByIdAndDelete(id);
  },
};

export default ContactService;

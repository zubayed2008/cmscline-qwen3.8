import ContactService from '@/services/contact-service';
import { requireAdmin } from '@/utils/auth';
import ContactSubmissionsTable from './_components/ContactSubmissionsTable';

export const dynamic = 'force-dynamic';

export default async function AdminContactSubmissionsPage() {
  await requireAdmin();
  const submissions = await ContactService.getAllSubmissions();

  // Convert MongoDB documents to plain objects for client component
  const serializedSubmissions = submissions.map((submission) => ({
    _id: submission._id.toString(),
    name: submission.name,
    email: submission.email,
    message: submission.message,
    isRead: submission.isRead,
    captchaScore: submission.captchaScore ?? null,
    createdAt: submission.createdAt?.toISOString() ?? '',
    updatedAt: submission.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
      </div>
      <ContactSubmissionsTable initialSubmissions={serializedSubmissions} />
    </div>
  );
}

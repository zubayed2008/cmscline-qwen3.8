import Link from 'next/link';
import { notFound } from 'next/navigation';
import ContactService from '@/services/contact-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

interface ContactSubmissionDetailProps {
  params: Promise<{ id: string }>;
}

export default async function ContactSubmissionDetailPage({
  params,
}: ContactSubmissionDetailProps) {
  await requireAdmin();
  const { id } = await params;
  const submission = await ContactService.getSubmissionById(id);

  if (!submission) {
    notFound();
  }

  // Mark as read when viewing
  if (!submission.isRead) {
    await ContactService.markAsRead(id);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Message Details</h1>
        <Link href="/admin/contact-submissions">
          <Button variant="secondary">Back to Inbox</Button>
        </Link>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{submission.name}</h2>
              <p className="text-sm text-gray-500">{submission.email}</p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                submission.isRead
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {submission.isRead ? 'Read' : 'Unread'}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Message</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{submission.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Received</h3>
                <p className="text-sm text-gray-900">
                  {new Date(submission.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">CAPTCHA Score</h3>
                <p className="text-sm text-gray-900">
                  {submission.captchaScore !== undefined && submission.captchaScore !== null
                    ? submission.captchaScore
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <a
                href={`mailto:${submission.email}?subject=Re: Your message`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reply via Email
              </a>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
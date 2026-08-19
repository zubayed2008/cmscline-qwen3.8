import { notFound } from 'next/navigation';
import MediaService from '@/services/media-service';
import { requireAdmin } from '@/utils/auth';
import MediaForm from '../../_components/MediaForm';

export const dynamic = 'force-dynamic';

interface EditMediaProps {
  params: Promise<{ id: string }>;
}

export default async function EditMediaPage({ params }: EditMediaProps) {
  await requireAdmin();
  const { id } = await params;
  const media = await MediaService.getMediaById(id);

  if (!media) {
    notFound();
  }

  const serializedMedia = {
    _id: media._id.toString(),
    filename: media.filename,
    url: media.url,
    mimeType: media.mimeType,
    size: media.size,
    isActive: media.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Media</h1>
      <MediaForm initialData={serializedMedia} />
    </div>
  );
}

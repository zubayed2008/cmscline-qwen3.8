import Link from 'next/link';
import MediaService from '@/services/media-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import MediaTable from './_components/MediaTable';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  await requireAdmin();
  const media = await MediaService.getAllMedia();

  // Convert MongoDB documents to plain objects for client component
  const serializedMedia = media.map((item) => ({
    _id: item._id.toString(),
    filename: item.filename,
    url: item.url,
    mimeType: item.mimeType,
    size: item.size,
    isActive: item.isActive,
    createdAt: item.createdAt?.toISOString() ?? '',
    updatedAt: item.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
        <Link href="/admin/media/new">
          <Button>Add Media</Button>
        </Link>
      </div>
      <MediaTable initialMedia={serializedMedia} />
    </div>
  );
}

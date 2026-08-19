import Link from 'next/link';
import CarouselService from '@/services/carousel-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import CarouselsTable from './_components/CarouselsTable';

export const dynamic = 'force-dynamic';

export default async function AdminCarouselsPage() {
  await requireAdmin();
  const carouselItems = await CarouselService.getAllCarouselItems();

  // Convert MongoDB documents to plain objects for client component
  const serializedCarousels = carouselItems.map((item) => ({
    _id: item._id.toString(),
    title: item.title ?? '',
    imageOrIconUrl: item.imageOrIconUrl,
    type: item.type,
    order: item.order,
    isActive: item.isActive,
    createdAt: item.createdAt?.toISOString() ?? '',
    updatedAt: item.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carousels</h1>
        <Link href="/admin/carousels/new">
          <Button>Create Carousel Item</Button>
        </Link>
      </div>
      <CarouselsTable initialCarousels={serializedCarousels} />
    </div>
  );
}
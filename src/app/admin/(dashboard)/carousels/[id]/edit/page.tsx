import { notFound } from 'next/navigation';
import CarouselService from '@/services/carousel-service';
import { requireAdmin } from '@/utils/auth';
import CarouselForm from '../../_components/CarouselForm';

export const dynamic = 'force-dynamic';

interface EditCarouselProps {
  params: Promise<{ id: string }>;
}

export default async function EditCarouselPage({ params }: EditCarouselProps) {
  await requireAdmin();
  const { id } = await params;
  const carouselItem = await CarouselService.getCarouselItemById(id);

  if (!carouselItem) {
    notFound();
  }

  const serializedCarousel = {
    _id: carouselItem._id.toString(),
    title: carouselItem.title ?? '',
    imageOrIconUrl: carouselItem.imageOrIconUrl,
    type: carouselItem.type,
    order: carouselItem.order,
    isActive: carouselItem.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Carousel Item</h1>
      <CarouselForm initialData={serializedCarousel} />
    </div>
  );
}
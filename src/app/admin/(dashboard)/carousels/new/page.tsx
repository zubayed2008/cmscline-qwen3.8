import { requireAdmin } from '@/utils/auth';
import CarouselForm from '../_components/CarouselForm';

export const metadata = {
  title: 'Create Carousel Item - Admin',
};

export default async function NewCarouselPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Carousel Item</h1>
      <CarouselForm />
    </div>
  );
}
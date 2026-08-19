import { notFound } from 'next/navigation';
import ServiceItemService from '@/services/service-item-service';
import { requireAdmin } from '@/utils/auth';
import ServiceItemForm from '../../_components/ServiceItemForm';

export const dynamic = 'force-dynamic';

interface EditServiceItemProps {
  params: Promise<{ id: string }>;
}

export default async function EditServiceItemPage({ params }: EditServiceItemProps) {
  await requireAdmin();
  const { id } = await params;
  const serviceItem = await ServiceItemService.getServiceItemById(id);

  if (!serviceItem) {
    notFound();
  }

  const serializedServiceItem = {
    _id: serviceItem._id.toString(),
    title: serviceItem.title,
    description: serviceItem.description,
    icon: serviceItem.icon ?? '',
    isActive: serviceItem.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Service Item</h1>
      <ServiceItemForm initialData={serializedServiceItem} />
    </div>
  );
}

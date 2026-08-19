import Link from 'next/link';
import ServiceItemService from '@/services/service-item-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import ServiceItemsTable from './_components/ServiceItemsTable';

export const dynamic = 'force-dynamic';

export default async function AdminServiceItemsPage() {
  await requireAdmin();
  const serviceItems = await ServiceItemService.getAllServiceItems();

  // Convert MongoDB documents to plain objects for client component
  const serializedServiceItems = serviceItems.map((item) => ({
    _id: item._id.toString(),
    title: item.title,
    description: item.description,
    icon: item.icon ?? '',
    isActive: item.isActive,
    createdAt: item.createdAt?.toISOString() ?? '',
    updatedAt: item.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Service Items</h1>
        <Link href="/admin/service-items/new">
          <Button>Create Service Item</Button>
        </Link>
      </div>
      <ServiceItemsTable initialServiceItems={serializedServiceItems} />
    </div>
  );
}

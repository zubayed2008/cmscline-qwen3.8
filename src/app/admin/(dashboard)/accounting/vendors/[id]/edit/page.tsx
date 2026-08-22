import { requireAdmin } from '@/utils/auth';
import { VendorService } from '@/services/accounting/vendor-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import VendorForm from '../../_components/VendorForm';
import { fetchAccounting } from '../../../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

interface EditVendorProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorPage({ params }: EditVendorProps) {
  await requireAdmin();
  const { id } = await params;
  const result = await fetchAccounting(() => VendorService.getById(id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Vendor</h1>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <VendorForm
          initialData={{
            id: result.data.id,
            code: result.data.code,
            name: result.data.name,
            email: result.data.email,
            phone: result.data.phone,
            address: result.data.address,
            taxId: result.data.taxId,
            status: result.data.status,
          }}
        />
      )}
    </div>
  );
}

import { requireAdmin } from '@/utils/auth';
import { CustomerService } from '@/services/accounting/customer-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import CustomerForm from '../../_components/CustomerForm';
import { fetchAccounting } from '../../../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

interface EditCustomerProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: EditCustomerProps) {
  await requireAdmin();
  const { id } = await params;
  const result = await fetchAccounting(() => CustomerService.getById(id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Customer</h1>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <CustomerForm
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

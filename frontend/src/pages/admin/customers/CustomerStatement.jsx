import { useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import { getCustomerStatement } from '../../../api/customers';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import ErrorState from '../../../components/common/ErrorState';
import { PageSkeleton } from '../../../components/common/Skeleton';
import StatementTable from '../../../components/bills/StatementTable';

/** Admin: one customer's account statement (bills, late fees and payments with a running balance). */
export default function CustomerStatement() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(() => getCustomerStatement(id), [id]);

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        back={`/admin/customers/${id}`}
        title={`Statement · ${data.customer.full_name}`}
        subtitle={`${data.customer.customer_number} · every bill, late fee and payment in date order`}
        actions={
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <StatementTable statement={data} billLink={(billId) => `/admin/bills/${billId}`} />
    </div>
  );
}

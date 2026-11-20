import useFetch from '../../hooks/useFetch';
import { getMyStatement } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import ErrorState from '../../components/common/ErrorState';
import { PageSkeleton } from '../../components/common/Skeleton';
import StatementTable from '../../components/bills/StatementTable';

/** Customer: my account statement (all my bills, late fees and payments with a running balance). */
export default function MyStatement() {
  const { data, loading, error, reload } = useFetch(() => getMyStatement(), []);

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        back="/my/bills"
        title="My account statement"
        subtitle="Every bill, late fee and payment in date order, like a bank statement."
        actions={
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <StatementTable statement={data} billLink={(billId) => `/my/bills/${billId}`} />
    </div>
  );
}

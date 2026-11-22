import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getMyBill } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import ErrorState from '../../components/common/ErrorState';
import { PageSkeleton } from '../../components/common/Skeleton';
import BillInvoice from '../../components/bills/BillInvoice';

export default function MyBillDetails() {
  const { id } = useParams();
  const { data: bill, loading, error, reload } = useFetch(() => getMyBill(id), [id]);

  if (loading && !bill) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back="/my/bills"
        title={`Bill ${bill.bill_number}`}
        subtitle={
          bill.status === 'Paid'
            ? 'This bill is fully paid. Thank you!'
            : bill.late_fee > bill.waived
              ? 'A late fee was added because the due date has passed. Please pay as soon as you can.'
              : 'Please pay at the utility office or by mobile banking before the due date.'
        }
        actions={
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        }
      />
      <BillInvoice bill={bill} />
    </div>
  );
}

import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useToast from '../../../hooks/useToast';
import { getBill, markBillUnpaid } from '../../../api/bills';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import ErrorState from '../../../components/common/ErrorState';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { PageSkeleton } from '../../../components/common/Skeleton';
import BillInvoice from '../../../components/bills/BillInvoice';
import MarkPaidModal from '../../../components/bills/MarkPaidModal';
import WaiveLateFeeModal from '../../../components/bills/WaiveLateFeeModal';
import PaidCelebration from '../../../components/bills/PaidCelebration';

export default function BillDetails() {
  const { id } = useParams();
  const toast = useToast();
  const { data: bill, loading, error, reload, setData } = useFetch(() => getBill(id), [id]);
  const [paying, setPaying] = useState(false);
  const [waiving, setWaiving] = useState(false);
  const [confirmUnpaid, setConfirmUnpaid] = useState(false);
  const [working, setWorking] = useState(false);
  const [celebrate, setCelebrate] = useState(false); // green tick + confetti after "Mark paid"
  const closeCelebration = useCallback(() => setCelebrate(false), []);

  if (loading && !bill) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const handleUnpaid = async () => {
    setWorking(true);
    try {
      const updated = await markBillUnpaid(bill.id);
      setData(updated);
      toast.success(`${updated.bill_number} is now ${updated.status}`);
      setConfirmUnpaid(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back="/admin/bills"
        title={`Bill ${bill.bill_number}`}
        subtitle={
          <span>
            For{' '}
            <Link to={`/admin/customers/${bill.customer_id}`} className="font-semibold text-sky-600 hover:underline">
              {bill.customer_name}
            </Link>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Print
            </Button>
            {/* A late fee can be waived once, while the bill is still open */}
            {bill.late_fee > 0 && bill.waived === 0 && bill.status !== 'Paid' && (
              <Button variant="secondary" onClick={() => setWaiving(true)}>
                Waive late fee
              </Button>
            )}
            {bill.status === 'Paid' ? (
              <Button variant="secondary" onClick={() => setConfirmUnpaid(true)}>
                Mark unpaid
              </Button>
            ) : (
              <Button variant="success" icon="check" onClick={() => setPaying(true)}>
                Mark paid
              </Button>
            )}
          </>
        }
      />

      <BillInvoice bill={bill} />

      {paying && (
        <MarkPaidModal
          bill={bill}
          onClose={() => setPaying(false)}
          onPaid={(updated) => {
            setData(updated);
            setPaying(false);
            setCelebrate(true);
            toast.success(`${updated.bill_number} marked as Paid`);
          }}
        />
      )}
      {waiving && (
        <WaiveLateFeeModal
          bill={bill}
          onClose={() => setWaiving(false)}
          onWaived={(updated) => {
            setData(updated);
            setWaiving(false);
            toast.success(`Late fee of ${updated.bill_number} waived`);
          }}
        />
      )}
      {celebrate && <PaidCelebration billNumber={bill.bill_number} onDone={closeCelebration} />}
      <ConfirmDialog
        open={confirmUnpaid}
        title="Mark as unpaid?"
        message="This removes the recorded payment(s). The bill goes back to Unpaid (or Overdue if the due date has passed)."
        confirmLabel="Mark unpaid"
        loading={working}
        onConfirm={handleUnpaid}
        onCancel={() => setConfirmUnpaid(false)}
      />
    </div>
  );
}

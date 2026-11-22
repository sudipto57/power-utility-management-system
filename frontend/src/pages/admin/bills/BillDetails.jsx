import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useToast from '../../../hooks/useToast';
import { confirmPayment, getBill, markBillUnpaid, rejectPayment } from '../../../api/bills';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import ErrorState from '../../../components/common/ErrorState';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import NoteDialog from '../../../components/common/NoteDialog';
import Icon from '../../../components/common/Icon';
import { PageSkeleton } from '../../../components/common/Skeleton';
import BillInvoice from '../../../components/bills/BillInvoice';
import MarkPaidModal from '../../../components/bills/MarkPaidModal';
import WaiveLateFeeModal from '../../../components/bills/WaiveLateFeeModal';
import PaidCelebration from '../../../components/bills/PaidCelebration';
import { formatDate, formatMoney } from '../../../utils/format';

export default function BillDetails() {
  const { id } = useParams();
  const toast = useToast();
  const { data: bill, loading, error, reload, setData } = useFetch(() => getBill(id), [id]);
  const [paying, setPaying] = useState(false);
  const [waiving, setWaiving] = useState(false);
  const [confirmUnpaid, setConfirmUnpaid] = useState(false);
  const [working, setWorking] = useState(false);
  const [celebrate, setCelebrate] = useState(false); // green tick + confetti after "Mark paid"
  const [rejecting, setRejecting] = useState(false); // "payment not received" pop-up
  const closeCelebration = useCallback(() => setCelebrate(false), []);

  if (loading && !bill) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  // A customer paid online ("Pay now"): staff check the money arrived, then confirm or reject it
  const waiting = bill.payments.find((p) => p.status === 'Pending');

  const handleConfirm = async () => {
    setWorking(true);
    try {
      const updated = await confirmPayment(bill.id, waiting.id);
      setData(updated);
      setCelebrate(true);
      toast.success(`${waiting.payment_number} confirmed. ${updated.bill_number} is now ${updated.status}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async (note) => {
    setWorking(true);
    try {
      const updated = await rejectPayment(bill.id, waiting.id, note);
      setData(updated);
      setRejecting(false);
      toast.success(`${waiting.payment_number} rejected. The customer was told`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

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
            {waiting ? null : bill.status === 'Paid' ? (
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

      {waiting && (
        <div className="mb-6 flex animate-fade-up flex-wrap items-center gap-4 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200 print:hidden">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Icon name="wallet" className="h-5 w-5" />
          </span>
          <div className="min-w-56 flex-1">
            <p className="font-extrabold text-slate-900">The customer paid {formatMoney(waiting.amount)} online</p>
            <p className="text-sm text-slate-600">
              {waiting.method} · reference <b className="font-mono">{waiting.reference}</b> · {formatDate(waiting.payment_date)}.
              Check that the money arrived, then confirm it.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon="x" disabled={working} onClick={() => setRejecting(true)}>
              Not received
            </Button>
            <Button variant="success" icon="check" loading={working && !rejecting} onClick={handleConfirm}>
              Confirm payment
            </Button>
          </div>
        </div>
      )}

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
      <NoteDialog
        key={waiting?.id}
        open={rejecting}
        title="Payment not received?"
        message={
          waiting &&
          `${waiting.payment_number} will be marked Failed and the bill stays unpaid. The customer gets a message to pay again.`
        }
        label="Note for the customer (optional)"
        confirmLabel="Reject payment"
        loading={working}
        onConfirm={handleReject}
        onCancel={() => setRejecting(false)}
      />
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

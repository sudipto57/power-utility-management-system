import { useState } from 'react';
import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import useToast from '../../hooks/useToast';
import { getMyBill } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import ErrorState from '../../components/common/ErrorState';
import { PageSkeleton } from '../../components/common/Skeleton';
import BillInvoice from '../../components/bills/BillInvoice';
import PayNowModal from '../../components/bills/PayNowModal';
import { formatMoney } from '../../utils/format';

export default function MyBillDetails() {
  const { id } = useParams();
  const toast = useToast();
  const { data: bill, loading, error, reload, setData } = useFetch(() => getMyBill(id), [id]);
  const [paying, setPaying] = useState(false);

  if (loading && !bill) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const waiting = bill.payments.find((p) => p.status === 'Pending'); // paid online, the office has not confirmed yet
  const canPay = bill.balance > 0 && !waiting;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back="/my/bills"
        title={`Bill ${bill.bill_number}`}
        subtitle={
          bill.status === 'Paid'
            ? 'This bill is fully paid. Thank you.'
            : bill.late_fee > bill.waived
              ? 'A late fee was added because the due date has passed. Please pay as soon as you can (Pay now).'
              : 'Pay online with Pay now, or at the utility office before the due date.'
        }
        actions={
          <>
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
            {canPay && (
              <Button variant="accent" icon="wallet" onClick={() => setPaying(true)}>
                Pay now
              </Button>
            )}
          </>
        }
      />

      {waiting && (
        <div className="mb-6 flex animate-fade-up items-start gap-4 rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-200 print:hidden">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Icon name="clock" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-extrabold text-sand-900">Your payment of {formatMoney(waiting.amount)} is being checked</p>
            <p className="text-sm text-sand-600">
              {waiting.method} · reference <b className="font-mono">{waiting.reference}</b>. The office confirms it soon, then
              this bill shows as Paid and your receipt is ready.
            </p>
          </div>
        </div>
      )}

      <BillInvoice bill={bill} />

      {paying && (
        <PayNowModal
          key={bill.id}
          bill={bill}
          onClose={() => setPaying(false)}
          onPaid={(updated) => {
            setData(updated);
            setPaying(false);
            toast.success('Payment sent. The office will confirm it soon');
          }}
        />
      )}
    </div>
  );
}

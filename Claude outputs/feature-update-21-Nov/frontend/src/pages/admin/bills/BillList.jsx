import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import useToast from '../../../hooks/useToast';
import { getBills, markBillUnpaid, sendDueReminders } from '../../../api/bills';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import MarkPaidModal from '../../../components/bills/MarkPaidModal';
import PaidCelebration from '../../../components/bills/PaidCelebration';
import { BILL_STATUSES } from '../../../utils/options';
import { formatDate, formatMoney, formatNumber } from '../../../utils/format';

// "Paid online" = a customer used Pay now and staff still have to confirm it
const WAITING = 'waiting';

export default function BillList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const debouncedSearch = useDebounce(search);
  const [celebrate, setCelebrate] = useState(null); // bill number to celebrate after "Mark paid"
  const closeCelebration = useCallback(() => setCelebrate(null), []);
  const { data, loading, error, reload } = useFetch(
    () => getBills({ search: debouncedSearch, ...(status === WAITING ? { waiting: 'yes' } : { status }) }),
    [debouncedSearch, status]
  );

  const [payBill, setPayBill] = useState(null);
  const [unpayBill, setUnpayBill] = useState(null);
  const [working, setWorking] = useState(false);
  const [reminding, setReminding] = useState(false);

  // Inbox message (and email) for every bill that is overdue or due in the next 3 days
  const remind = async () => {
    setReminding(true);
    try {
      const result = await sendDueReminders();
      toast.success(
        result.reminded === 0
          ? 'Everyone was already reminded in the last 3 days'
          : `Reminded ${formatNumber(result.reminded)} bill(s), ${formatNumber(result.emailed)} by email`
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReminding(false);
    }
  };

  const confirmUnpaid = async () => {
    setWorking(true);
    try {
      const updated = await markBillUnpaid(unpayBill.id);
      toast.success(`${updated.bill_number} is now ${updated.status}`);
      setUnpayBill(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  // Totals of what is on screen
  const totals = (data || []).reduce((acc, b) => ({ billed: acc.billed + b.total_amount, balance: acc.balance + b.balance }), {
    billed: 0,
    balance: 0,
  });

  const columns = [
    {
      key: 'bill_number',
      header: 'Bill',
      render: (b) => <span className="font-mono font-bold text-slate-900">{b.bill_number}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (b) => (
        <div>
          <p className="font-semibold text-slate-800">{b.customer_name}</p>
          <p className="text-xs text-slate-500">{b.meter_number}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (b) => `${formatDate(b.billing_period_start)} - ${formatDate(b.billing_period_end)}`,
    },
    {
      key: 'consumption',
      header: 'Units',
      className: 'text-right',
      render: (b) => (b.consumption !== null ? `${formatNumber(b.consumption)} kWh` : '-'),
    },
    {
      key: 'total_amount',
      header: 'Amount',
      className: 'text-right',
      render: (b) => <span className="font-semibold text-slate-900">{formatMoney(b.total_amount)}</span>,
    },
    {
      key: 'due_date',
      header: 'Due',
      render: (b) => (
        <span className={b.status === 'Overdue' ? 'font-semibold text-rose-600' : ''}>{formatDate(b.due_date)}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'actions',
      header: 'Payment',
      className: 'text-right',
      render: (b) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {b.waiting_payments > 0 ? (
            <Button size="sm" variant="secondary" icon="wallet" to={`/admin/bills/${b.id}`}>
              Check
            </Button>
          ) : b.status === 'Paid' ? (
            <Button size="sm" variant="ghost" onClick={() => setUnpayBill(b)}>
              Mark unpaid
            </Button>
          ) : (
            <Button size="sm" variant="success" icon="check" onClick={() => setPayBill(b)}>
              Mark paid
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bills & payments"
        subtitle="All bills with amount, due date and payment status."
        actions={
          <>
            <Button variant="secondary" icon="bell" loading={reminding} onClick={remind}>
              Send due reminders
            </Button>
            <Button variant="accent" icon="plus" to="/admin/bills/generate">
              Generate bill
            </Button>
          </>
        }
      />

      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search bill number, customer or meter..."
            className="min-w-60 flex-1"
          />
          <div className="flex flex-wrap gap-1.5">
            {['', ...BILL_STATUSES].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  status === s ? 'bg-slate-900 text-white shadow dark:bg-orange-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStatus(WAITING)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                status === WAITING ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Paid online
            </button>
          </div>
        </div>
        {data && data.length > 0 && (
          <div className="flex flex-wrap gap-6 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-600">
            <span>
              <b className="text-slate-900">{data.length}</b> bills
            </span>
            <span>
              Billed: <b className="text-slate-900">{formatMoney(totals.billed)}</b>
            </span>
            <span>
              Still to collect: <b className="text-rose-600">{formatMoney(totals.balance)}</b>
            </span>
          </div>
        )}
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            loading={loading}
            onRowClick={(b) => navigate(`/admin/bills/${b.id}`)}
            emptyIcon="receipt"
            emptyTitle="No bills found"
          />
        )}
      </Card>

      {payBill && (
        <MarkPaidModal
          key={payBill.id}
          bill={payBill}
          onClose={() => setPayBill(null)}
          onPaid={(updated) => {
            toast.success(`${updated.bill_number} marked as Paid`);
            setPayBill(null);
            setCelebrate(updated.bill_number);
            reload();
          }}
        />
      )}
      {celebrate && <PaidCelebration billNumber={celebrate} onDone={closeCelebration} />}
      <ConfirmDialog
        open={Boolean(unpayBill)}
        title="Mark as unpaid?"
        message={
          unpayBill &&
          `This removes the payment(s) recorded for ${unpayBill.bill_number}. The bill goes back to Unpaid (or Overdue if the due date has passed).`
        }
        confirmLabel="Mark unpaid"
        loading={working}
        onConfirm={confirmUnpaid}
        onCancel={() => setUnpayBill(null)}
      />
    </div>
  );
}

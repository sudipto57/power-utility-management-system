// Payment history: every payment for the customer's bills, with a printable receipt for each confirmed one.
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getMyPayments } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import { PageSkeleton } from '../../components/common/Skeleton';
import { formatDate, formatMoney } from '../../utils/format';

export default function MyPayments() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(getMyPayments);

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const completed = data.filter((p) => p.status === 'Completed');
  const totalPaid = completed.reduce((sum, p) => sum + p.amount, 0);
  const waiting = data.filter((p) => p.status === 'Pending').length;

  const columns = [
    {
      key: 'payment_number',
      header: 'Payment',
      render: (p) => <span className="font-mono font-bold text-sand-900">{p.payment_number}</span>,
    },
    { key: 'payment_date', header: 'Date', render: (p) => formatDate(p.payment_date) },
    {
      key: 'bill_number',
      header: 'Bill',
      render: (p) => (
        <div>
          <p className="font-semibold text-sand-800">{p.bill_number}</p>
          <p className="text-xs text-sand-500">Meter {p.meter_number}</p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => (
        <div>
          <p>{p.method}</p>
          {p.reference && <p className="font-mono text-xs text-sand-500">{p.reference}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      render: (p) => (
        <span className={`font-bold ${p.status === 'Failed' ? 'text-sand-500 line-through' : 'text-sand-900'}`}>
          {formatMoney(p.amount)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (p) =>
        p.status === 'Completed' ? (
          <Button size="sm" variant="secondary" icon="printer" to={`/my/payments/${p.id}`}>
            Receipt
          </Button>
        ) : (
          <span className="text-xs text-sand-500">{p.status === 'Pending' ? 'After the office confirms' : '-'}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        back="/my/bills"
        title="Payment history"
        subtitle="Every payment for your bills. Print a receipt for any confirmed payment."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total paid"
          value={totalPaid}
          format="money"
          icon="wallet"
          tone="emerald"
          hint={`${completed.length} payment(s)`}
        />
        <StatCard
          label="Being checked"
          value={waiting}
          icon="clock"
          tone="sky"
          hint={waiting ? 'The office confirms them soon' : 'Nothing waiting'}
          delay={70}
        />
        <StatCard
          label="Last payment"
          value={completed[0] ? completed[0].amount : 0}
          format="money"
          icon="receipt"
          tone="amber"
          hint={completed[0] ? formatDate(completed[0].payment_date) : 'No payments yet'}
          delay={140}
        />
      </div>

      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <DataTable
          columns={columns}
          rows={data}
          onRowClick={(p) => navigate(p.status === 'Completed' ? `/my/payments/${p.id}` : `/my/bills/${p.bill_id}`)}
          emptyIcon="wallet"
          emptyTitle="No payments yet"
          emptyText="When you pay a bill, it shows here with a receipt."
        />
      </Card>
    </div>
  );
}

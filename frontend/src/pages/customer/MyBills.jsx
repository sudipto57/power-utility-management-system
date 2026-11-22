import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getMyBills } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import { BILL_STATUSES } from '../../utils/options';
import { formatDate, formatMoney, formatNumber } from '../../utils/format';

export default function MyBills() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch(() => getMyBills({ status }), [status]);

  const columns = [
    {
      key: 'bill_number',
      header: 'Bill',
      render: (b) => <span className="font-mono font-bold text-slate-900">{b.bill_number}</span>,
    },
    { key: 'meter_number', header: 'Meter' },
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
      header: 'Due date',
      render: (b) => (
        <span className={b.status === 'Overdue' ? 'font-semibold text-rose-600' : ''}>{formatDate(b.due_date)}</span>
      ),
    },
    { key: 'status', header: 'Payment status', render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="My bills"
        subtitle="All your electricity bills and whether they are paid."
        actions={
          <Button variant="secondary" icon="wallet" to="/my/statement">
            View statement
          </Button>
        }
      />
      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-4">
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
        </div>
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            loading={loading}
            onRowClick={(b) => navigate(`/my/bills/${b.id}`)}
            emptyIcon="receipt"
            emptyTitle="No bills here"
            emptyText="Bills appear after your meter is read."
          />
        )}
      </Card>
    </div>
  );
}

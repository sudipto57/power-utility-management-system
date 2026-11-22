import { Link } from 'react-router-dom';
import Card from '../common/Card';
import DataTable from '../common/DataTable';
import StatCard from '../common/StatCard';
import { formatDate, formatMoney } from '../../utils/format';

// Colour of each kind of line: charges in rose, money paid or taken off in green
const TYPE_STYLES = {
  Bill: 'bg-slate-100 text-slate-700',
  'Late fee': 'bg-rose-50 text-rose-700',
  Payment: 'bg-emerald-50 text-emerald-700',
  Waiver: 'bg-emerald-50 text-emerald-700',
};

/**
 * Account statement: every bill, late fee and payment in date order with the running balance.
 * The running balance is worked out by the database (view customer_statement, a window function).
 * billLink(billId) -> where a bill number links to (admin and customer pages differ).
 */
export default function StatementTable({ statement, billLink }) {
  const columns = [
    { key: 'entry_date', header: 'Date', render: (l) => formatDate(l.entry_date) },
    {
      key: 'entry_type',
      header: 'Type',
      render: (l) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TYPE_STYLES[l.entry_type] || TYPE_STYLES.Bill}`}>
          {l.entry_type}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (l) => (
        <Link to={billLink(l.bill_id)} className="font-bold text-sky-600 hover:underline">
          {l.reference}
        </Link>
      ),
    },
    {
      key: 'description',
      header: 'Details',
      // long details wrap onto a second line, so the Balance column always fits
      render: (l) => <span className="block min-w-48 max-w-xs whitespace-normal text-slate-600">{l.description}</span>,
    },
    {
      key: 'debit',
      header: 'Charge',
      className: 'text-right',
      render: (l) => (l.debit > 0 ? <span className="text-rose-600">{formatMoney(l.debit)}</span> : '-'),
    },
    {
      key: 'credit',
      header: 'Paid / off',
      className: 'text-right',
      render: (l) => (l.credit > 0 ? <span className="text-emerald-600">{formatMoney(l.credit)}</span> : '-'),
    },
    {
      key: 'balance',
      header: 'Balance',
      className: 'text-right',
      render: (l) => <span className="font-extrabold text-slate-900">{formatMoney(l.balance)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total charged" value={statement.total_charged} format="money" icon="receipt" tone="amber" />
        <StatCard label="Total paid" value={statement.total_paid} format="money" icon="wallet" tone="emerald" delay={60} />
        <StatCard
          label="Balance now"
          value={statement.balance}
          format="money"
          icon="alert"
          tone={statement.balance > 0 ? 'rose' : 'emerald'}
          hint={statement.balance > 0 ? 'Still to pay' : 'Nothing to pay'}
          delay={120}
        />
      </div>
      <Card
        title="Statement"
        subtitle="Oldest first. The balance is what was owed after each line."
        bodyClassName="p-0"
        className="animate-fade-up"
        style={{ animationDelay: '160ms' }}
      >
        <DataTable
          columns={columns}
          rows={statement.lines}
          emptyIcon="receipt"
          emptyTitle="No bills yet"
          emptyText="Bills and payments will show here."
        />
      </Card>
    </div>
  );
}

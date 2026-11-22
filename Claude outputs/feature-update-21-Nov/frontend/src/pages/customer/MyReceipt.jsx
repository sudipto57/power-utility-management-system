// Printable receipt for one confirmed payment (opened from Payment history or the inbox).
import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getMyPayment } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Logo from '../../components/common/Logo';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import { PageSkeleton } from '../../components/common/Skeleton';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';

export default function MyReceipt() {
  const { id } = useParams();
  const { data: p, loading, error, reload } = useFetch(() => getMyPayment(id), [id]);

  if (loading && !p) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const confirmed = p.status === 'Completed';
  const rows = [
    ['Bill', p.bill_number],
    ['Meter', p.meter_number],
    ['Billing period', `${formatDate(p.billing_period_start)} – ${formatDate(p.billing_period_end)}`],
    ['Paid by', p.method],
    ['Reference', p.reference || '-'],
    ['Payment date', formatDate(p.payment_date)],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back="/my/payments"
        title={`Receipt ${p.payment_number}`}
        subtitle={confirmed ? 'Keep this as proof of payment.' : 'A receipt is ready after the office confirms the payment.'}
        actions={
          confirmed && (
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
          )
        }
      />

      <article className="print-area relative animate-fade-up overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
        <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-sky-500" />
        {/* Big "PAID" stamp */}
        {confirmed && (
          <span className="pointer-events-none absolute right-14 top-48 hidden rotate-12 rounded-xl border-4 border-emerald-500/70 px-4 py-1 font-display text-3xl font-extrabold tracking-widest text-emerald-600/80 sm:block">
            PAID
          </span>
        )}
        <div className="p-6 sm:p-10">
          <header className="flex flex-wrap items-start justify-between gap-6">
            <Logo />
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Payment receipt</p>
              <p className="mt-1 font-mono text-xl font-extrabold text-slate-900">{p.payment_number}</p>
              <div className="mt-2 flex justify-end">
                <StatusBadge status={p.status} />
              </div>
            </div>
          </header>

          <div className="mt-8 rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Received from</p>
            <p className="mt-2 font-bold text-slate-900">{p.customer_name}</p>
            <p className="text-sm text-slate-600">{p.customer_number}</p>
            <p className="mt-1 text-sm text-slate-600">{p.customer_address}</p>
          </div>

          <dl className="mt-6 divide-y divide-slate-100 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-emerald-50 px-5 py-4 ring-1 ring-emerald-100">
            <span className="font-bold text-emerald-800">Amount received</span>
            <span className="font-display text-3xl font-extrabold text-emerald-700">{formatMoney(p.amount)}</span>
          </div>

          <p className="mt-10 border-t border-dashed border-slate-200 pt-4 text-center text-xs text-slate-400">
            Confirmed {formatDateTime(p.updated_at)} · Thank you for using Power Utility Management System
          </p>
        </div>
      </article>
    </div>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import { getMyDashboard } from '../../api/my';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { PageSkeleton } from '../../components/common/Skeleton';
import BarChart from '../../components/charts/BarChart';
import { CHART_COLORS } from '../../components/charts/colors';
import { formatDate, formatMoney, formatNumber } from '../../utils/format';

export default function MyDashboard() {
  const { user } = useAuth();
  const { data: d, loading, error, reload } = useFetch(getMyDashboard);

  const usage = useMemo(() => {
    if (!d) return null;
    return {
      labels: d.usage.map((u) => u.month),
      series: [{ label: 'kWh used', data: d.usage.map((u) => u.units), color: CHART_COLORS.amber }],
    };
  }, [d]);

  if (loading && !d) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const bill = d.latest_bill;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative animate-fade-up overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-lg">
        <div className="absolute -right-10 -top-16 h-64 w-64 animate-glow rounded-full bg-amber-500/25 blur-3xl" />
        <svg className="absolute bottom-0 right-0 h-28 w-2/3 opacity-40" viewBox="0 0 400 100" fill="none" aria-hidden="true">
          <path
            d="M0 70 C 60 40, 110 95, 170 60 S 290 20, 400 50"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="7 12"
            className="animate-flow"
          />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400">Welcome back,</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{user?.full_name}</h1>
            <p className="mt-2 text-sm text-slate-400">Here is your electricity account at a glance.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="accent" icon="complaint" to="/my/requests/new">
              Report a problem
            </Button>
            <Button variant="secondary" icon="receipt" to="/my/bills">
              My bills
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Amount due"
          value={d.outstanding_amount}
          format="money"
          icon="wallet"
          tone={d.outstanding_amount > 0 ? 'rose' : 'emerald'}
          hint={`${formatNumber(d.unpaid_bills)} unpaid bill(s)`}
        />
        <StatCard
          label="Overdue bills"
          value={d.overdue_bills}
          icon="alert"
          tone="amber"
          hint={d.overdue_bills > 0 ? 'Please pay as soon as possible' : 'Nothing overdue'}
          delay={70}
        />
        <StatCard
          label="Open requests"
          value={d.open_requests}
          icon="complaint"
          tone="sky"
          hint={`${formatNumber(d.total_requests)} in total`}
          delay={140}
        />
        <StatCard
          label="Active services"
          value={d.connections_active}
          icon="plug"
          tone="violet"
          hint={`${formatNumber(d.connections_total)} connection(s)`}
          delay={210}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          title="Electricity used"
          subtitle="kWh per month, all your meters"
          className="animate-fade-up lg:col-span-3"
          style={{ animationDelay: '150ms' }}
        >
          {usage.labels.length ? (
            <BarChart labels={usage.labels} series={usage.series} height={260} />
          ) : (
            <EmptyState icon="activity" title="No readings yet" />
          )}
        </Card>

        <Card title="Latest bill" className="animate-fade-up lg:col-span-2" style={{ animationDelay: '220ms' }}>
          {!bill ? (
            <EmptyState icon="receipt" title="No bills yet" />
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-slate-500">{bill.bill_number}</span>
                <StatusBadge status={bill.status} />
              </div>
              <p className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">{formatMoney(bill.total_amount)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatNumber(bill.consumption)} kWh · {formatDate(bill.billing_period_start)} –{' '}
                {formatDate(bill.billing_period_end)}
              </p>
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                <Icon name="calendar" className="h-5 w-5 text-amber-500" />
                <div className="text-sm">
                  <p className="text-slate-500">Due date</p>
                  <p className={`font-bold ${bill.status === 'Overdue' ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatDate(bill.due_date)}
                  </p>
                </div>
                {bill.balance > 0 && (
                  <div className="ml-auto text-right text-sm">
                    <p className="text-slate-500">Balance</p>
                    <p className="font-bold text-rose-600">{formatMoney(bill.balance)}</p>
                  </div>
                )}
              </div>
              <Link
                to={`/my/bills/${bill.id}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-sky-600 hover:underline"
              >
                View full bill <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

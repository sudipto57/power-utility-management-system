import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getDashboardStats, getRecentActivity } from '../../api/dashboard';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { PageSkeleton } from '../../components/common/Skeleton';
import BarChart from '../../components/charts/BarChart';
import DoughnutChart from '../../components/charts/DoughnutChart';
import { CHART_COLORS } from '../../components/charts/colors';
import { formatMoney, formatNumber, timeAgo } from '../../utils/format';

const STATUS_COLORS = {
  Paid: CHART_COLORS.emerald,
  Unpaid: CHART_COLORS.amber,
  'Partially Paid': CHART_COLORS.sky,
  Overdue: CHART_COLORS.rose,
};

// Icon, colour and link for each kind of activity
const ACTIVITY = {
  bill: { icon: 'receipt', tone: 'bg-amber-100 text-amber-600', verb: 'Bill created', link: (id) => `/admin/bills/${id}` },
  payment: {
    icon: 'wallet',
    tone: 'bg-emerald-100 text-emerald-600',
    verb: 'Payment received',
    link: (id) => `/admin/bills/${id}`,
  },
  request: {
    icon: 'complaint',
    tone: 'bg-rose-100 text-rose-600',
    verb: 'Service request',
    link: (id) => `/admin/requests/${id}`,
  },
  reading: { icon: 'gauge', tone: 'bg-sky-100 text-sky-600', verb: 'Meter reading', link: (id) => `/admin/connections/${id}` },
  customer: {
    icon: 'user',
    tone: 'bg-violet-100 text-violet-600',
    verb: 'Customer added',
    link: (id) => `/admin/customers/${id}`,
  },
};

const QUICK_ACTIONS = [
  { to: '/admin/customers/new', label: 'Add customer', icon: 'users' },
  { to: '/admin/readings/new', label: 'Enter reading', icon: 'gauge' },
  { to: '/admin/bills/generate', label: 'Generate bill', icon: 'receipt' },
  { to: '/admin/requests?status=Pending', label: 'Pending complaints', icon: 'complaint' },
];

export default function Dashboard() {
  const stats = useFetch(getDashboardStats);
  const activity = useFetch(getRecentActivity);
  const s = stats.data;

  const monthly = useMemo(() => {
    if (!s) return null;
    return {
      labels: s.monthly.map((m) => m.month),
      series: [
        { label: 'Billed', data: s.monthly.map((m) => m.billed), color: CHART_COLORS.amber },
        { label: 'Collected', data: s.monthly.map((m) => m.collected), color: CHART_COLORS.emerald },
      ],
    };
  }, [s]);

  const statusChart = useMemo(() => {
    if (!s) return null;
    return {
      labels: s.bill_status.map((b) => b.status),
      values: s.bill_status.map((b) => b.count),
      colors: s.bill_status.map((b) => STATUS_COLORS[b.status] || CHART_COLORS.slate),
    };
  }, [s]);

  if (stats.loading && !s) return <PageSkeleton />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="A live overview of customers, services, bills and complaints."
        actions={
          <Button
            variant="secondary"
            icon="refresh"
            onClick={() => {
              stats.reload();
              activity.reload();
            }}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total customers"
          value={s.total_customers}
          icon="users"
          tone="violet"
          hint={`${formatNumber(s.active_customers)} active`}
          delay={0}
        />
        <StatCard
          label="Active services"
          value={s.active_connections}
          icon="plug"
          tone="sky"
          hint={`${formatNumber(s.total_connections)} connections in total`}
          delay={70}
        />
        <StatCard
          label="Unpaid bills"
          value={s.unpaid_bills}
          icon="receipt"
          tone="amber"
          hint={`${formatMoney(s.outstanding_amount)} outstanding`}
          delay={140}
        />
        <StatCard
          label="Open complaints"
          value={s.open_requests}
          icon="complaint"
          tone="rose"
          hint={`${formatNumber(s.pending_requests)} waiting to start`}
          delay={210}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="animate-fade-up xl:col-span-2"
          style={{ animationDelay: '150ms' }}
          title="Billed vs collected"
          subtitle="Last 6 months · billed by billing period, collected by payment date"
          actions={
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {formatMoney(s.collected_this_month)} this month
            </span>
          }
        >
          <BarChart labels={monthly.labels} series={monthly.series} height={290} />
        </Card>

        <Card
          className="animate-fade-up"
          style={{ animationDelay: '220ms' }}
          title="Bills by status"
          subtitle={`${formatNumber(s.overdue_bills)} overdue`}
        >
          {statusChart.values.length ? (
            <DoughnutChart labels={statusChart.labels} values={statusChart.values} colors={statusChart.colors} height={290} />
          ) : (
            <EmptyState icon="receipt" title="No bills yet" />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="animate-fade-up xl:col-span-2"
          style={{ animationDelay: '260ms' }}
          title="Recent activity"
          subtitle="The latest 10 things that happened"
          bodyClassName="p-2"
        >
          {activity.error && <p className="p-4 text-sm text-rose-600">{activity.error}</p>}
          {activity.data && activity.data.length === 0 && <EmptyState icon="activity" title="No activity yet" />}
          <ul className="divide-y divide-slate-100">
            {(activity.data || []).map((item, index) => {
              const kind = ACTIVITY[item.type] || ACTIVITY.bill;
              return (
                <li
                  key={`${item.type}-${item.title}-${index}`}
                  className="animate-fade-up"
                  style={{ animationDelay: `${300 + index * 40}ms` }}
                >
                  <Link
                    to={kind.link(item.link_id)}
                    className="flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-slate-50"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kind.tone}`}>
                      <Icon name={kind.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {kind.verb}: <span className="font-bold">{item.title}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.subtitle}
                        {item.amount !== null && item.type === 'reading' && ` · ${formatNumber(item.amount)} kWh`}
                        {item.amount !== null && item.type !== 'reading' && ` · ${formatMoney(item.amount)}`}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      {item.type !== 'payment' && item.type !== 'reading' ? (
                        <StatusBadge status={item.status} />
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">{item.status}</span>
                      )}
                      <p className="mt-1 text-[11px] text-slate-400">{timeAgo(item.happened_at)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="animate-fade-up" style={{ animationDelay: '320ms' }} title="Quick actions">
          <div className="grid gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:bg-amber-50 hover:text-slate-900 hover:ring-amber-200"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition group-hover:bg-amber-400 group-hover:text-slate-900 group-hover:ring-amber-400">
                  <Icon name={action.icon} className="h-4 w-4" />
                </span>
                <span className="flex-1">{action.label}</span>
                <Icon name="chevronRight" className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

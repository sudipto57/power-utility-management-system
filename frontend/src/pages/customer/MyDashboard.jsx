import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import { getMyDashboard } from '../../api/my';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import StatCard from '../../components/common/StatCard';
import WelcomeBanner, { BannerChip } from '../../components/common/WelcomeBanner';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { PageSkeleton } from '../../components/common/Skeleton';
import BarChart from '../../components/charts/BarChart';
import UsageGauge from '../../components/charts/UsageGauge';
import EnergyTips from '../../components/common/EnergyTips';
import { CHART_COLORS } from '../../components/charts/colors';
import { firstName, formatDate, formatDateTime, formatMoney, formatNumber } from '../../utils/format';

/** "↓ 12% less than last month" (green) or "↑ 8% more than last month" (red), with a moving arrow. */
function CompareBadge({ current, previous }) {
  if (!previous || previous.units === 0) {
    return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">First month on record</span>;
  }
  if (current.units === previous.units) {
    return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Same as {previous.month}</span>;
  }
  const less = current.units < previous.units;
  const percent = Math.round((Math.abs(current.units - previous.units) / previous.units) * 100);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${
        less ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'
      }`}
    >
      <Icon name="arrowRight" className={`h-3.5 w-3.5 animate-float ${less ? 'rotate-90' : '-rotate-90'}`} strokeWidth={2.6} />
      {percent}% {less ? 'less' : 'more'} than {previous.month}
    </span>
  );
}

// Alert colours: danger = overdue, warning = due soon, info = new bill / reply / payment being checked
const ALERT_TONES = {
  danger: { box: 'bg-rose-50 ring-rose-200', icon: 'alert', iconClass: 'text-rose-700' },
  warning: { box: 'bg-amber-50 ring-amber-200', icon: 'clock', iconClass: 'text-amber-700' },
  info: { box: 'bg-sky-50 ring-sky-200', icon: 'info', iconClass: 'text-sky-700' },
};

/** Things that need the customer's attention (worked out by the backend every time) */
function AlertsList({ alerts }) {
  if (alerts.length === 0) {
    return <EmptyState icon="check" title="All good" text="Nothing needs your attention right now." />;
  }
  return (
    <ul className="space-y-2.5">
      {alerts.map((alert) => {
        const tone = ALERT_TONES[alert.tone] || ALERT_TONES.info;
        return (
          <li key={alert.text}>
            <Link
              to={alert.link}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition hover:-translate-y-0.5 ${tone.box}`}
            >
              <Icon name={tone.icon} className={`h-5 w-5 shrink-0 ${tone.iconClass}`} />
              <span className="flex-1 text-sm font-semibold text-slate-800">{alert.text}</span>
              {alert.amount > 0 && (
                <span className="font-display text-sm font-extrabold text-slate-900">{formatMoney(alert.amount)}</span>
              )}
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Outage notices for the customer's area (state: Happening now / Planned) */
function NoticesList({ notices }) {
  if (notices.length === 0) {
    return <EmptyState icon="bolt" title="No power cuts planned" text="Planned work in your area will show here." />;
  }
  return (
    <ul className="space-y-3">
      {notices.map((notice) => (
        <li key={notice.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={notice.state} />
            <span className="text-xs font-semibold text-slate-500">{notice.area}</span>
          </div>
          <p className="mt-2 font-bold text-slate-900">{notice.title}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {formatDateTime(notice.starts_at)} – {formatDateTime(notice.ends_at)}
          </p>
          {notice.details && <p className="mt-1.5 text-sm text-slate-600">{notice.details}</p>}
        </li>
      ))}
    </ul>
  );
}

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
  // Latest month and the month before it, for the gauge and the "compared to last month" badge
  const thisMonth = d.usage[d.usage.length - 1];
  const lastMonth = d.usage[d.usage.length - 2];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <WelcomeBanner
        role="customer"
        eyebrow="Customer portal"
        title={`Welcome back, ${firstName(user?.full_name)}!`}
        subtitle="Here is your electricity account at a glance."
        actions={
          <>
            <Button variant="secondary" icon="complaint" to="/my/requests/new">
              Report a problem
            </Button>
            <Button variant="glass" icon="gauge" to="/my/usage">
              Send meter reading
            </Button>
          </>
        }
      >
        <BannerChip>
          {d.outstanding_amount > 0 ? `💳 ${formatMoney(d.outstanding_amount)} to pay` : '✅ All bills paid'}
        </BannerChip>
        <BannerChip>🔌 {formatNumber(d.connections_active)} active service(s)</BannerChip>
      </WelcomeBanner>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Alerts"
          subtitle="Bills due, new bills and replies"
          className="animate-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          <AlertsList alerts={d.alerts} />
        </Card>
        <Card
          title="Power notices"
          subtitle="Power cuts and maintenance in your area"
          className="animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          <NoticesList notices={d.notices} />
        </Card>
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
              <p className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-900">
                {formatMoney(bill.total_amount)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatNumber(bill.consumption)} kWh · {formatDate(bill.billing_period_start)} –{' '}
                {formatDate(bill.billing_period_end)}
              </p>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-50 to-rose-50 px-4 py-3 ring-1 ring-orange-100">
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
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-orange-600 hover:underline"
              >
                View full bill <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="This month's usage"
          subtitle={thisMonth ? `Units used in ${thisMonth.month}` : 'Shown after your first reading'}
          className="animate-fade-up"
          style={{ animationDelay: '260ms' }}
        >
          {thisMonth ? (
            <div className="flex flex-col items-center gap-4">
              <UsageGauge units={thisMonth.units} />
              <CompareBadge current={thisMonth} previous={lastMonth} />
            </div>
          ) : (
            <EmptyState icon="gauge" title="No readings yet" text="Your usage appears here after the first meter reading." />
          )}
        </Card>

        <Card
          title="Energy-saving tips"
          subtitle="Small habits that lower your bill"
          className="animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          <EnergyTips />
        </Card>
      </div>
    </div>
  );
}

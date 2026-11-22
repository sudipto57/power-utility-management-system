import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getDashboardStats, getRecentActivity } from '../../api/dashboard';
import { approveChangeRequest, getChangeRequests, rejectChangeRequest } from '../../api/changeRequests';
import useToast from '../../hooks/useToast';
import Modal from '../../components/common/Modal';
import { Field, Textarea } from '../../components/common/FormField';
import WelcomeBanner, { BannerChip } from '../../components/common/WelcomeBanner';
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

// tone = gradient colour of the icon
const QUICK_ACTIONS = [
  { to: '/admin/customers/new', label: 'Add customer', icon: 'users', tone: 'from-violet-600 to-fuchsia-600' },
  { to: '/admin/readings/new', label: 'Enter reading', icon: 'gauge', tone: 'from-sky-600 to-blue-600' },
  { to: '/admin/bills/generate', label: 'Generate bill', icon: 'receipt', tone: 'from-ember to-flame' },
  { to: '/admin/requests?status=Pending', label: 'Pending complaints', icon: 'complaint', tone: 'from-rose-600 to-pink-600' },
];

// "Needs attention" rows under the quick actions (tone = background + text colour)
function attentionRows(s) {
  return [
    {
      label: 'Online payments to confirm',
      value: formatNumber(s.pending_payments),
      done: s.pending_payments === 0,
      to: '/admin/bills?status=waiting',
      icon: 'wallet',
      tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    },
    {
      label: 'Customer readings to check',
      value: formatNumber(s.pending_readings),
      done: s.pending_readings === 0,
      to: '/admin/readings?status=Pending',
      icon: 'gauge',
      tone: 'bg-sky-50 text-sky-600 ring-sky-100',
    },
    {
      label: 'Overdue bills',
      value: formatNumber(s.overdue_bills),
      done: s.overdue_bills === 0,
      to: '/admin/bills?status=Overdue',
      icon: 'alert',
      tone: 'bg-rose-50 text-rose-600 ring-rose-100',
    },
    {
      label: 'Complaints waiting',
      value: formatNumber(s.pending_requests),
      done: s.pending_requests === 0,
      to: '/admin/requests?status=Pending',
      icon: 'complaint',
      tone: 'bg-amber-50 text-amber-600 ring-amber-100',
    },
    {
      label: 'Profile changes waiting',
      value: formatNumber(s.pending_change_requests),
      done: s.pending_change_requests === 0,
      to: '#change-requests', // the section further down this page
      icon: 'user',
      tone: 'bg-violet-50 text-violet-600 ring-violet-100',
    },
    {
      label: 'Money to collect',
      value: formatMoney(s.outstanding_amount),
      done: s.outstanding_amount === 0,
      to: '/admin/bills',
      icon: 'wallet',
      tone: 'bg-sky-50 text-sky-600 ring-sky-100',
    },
  ];
}

export default function Dashboard() {
  const stats = useFetch(getDashboardStats);
  const activity = useFetch(getRecentActivity);
  const s = stats.data;

  const monthly = useMemo(() => {
    if (!s) return null;
    return {
      labels: s.monthly.map((m) => m.month),
      series: [
        { label: 'Billed', data: s.monthly.map((m) => m.billed), color: CHART_COLORS.rose },
        { label: 'Collected', data: s.monthly.map((m) => m.collected), color: CHART_COLORS.emerald },
      ],
    };
  }, [s]);

  const statusChart = useMemo(() => {
    if (!s) return null;
    return {
      labels: s.bill_status.map((b) => b.status),
      values: s.bill_status.map((b) => b.count),
      colors: s.bill_status.map((b) => STATUS_COLORS[b.status] || CHART_COLORS.sand),
    };
  }, [s]);

  if (stats.loading && !s) return <PageSkeleton />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;

  return (
    <div className="space-y-6">
      <WelcomeBanner
        role="admin"
        eyebrow="Admin panel · live"
        title="Dashboard"
        subtitle="A live overview of customers, services, bills and complaints."
        actions={
          <>
            <Button variant="secondary" icon="receipt" to="/admin/bills/generate">
              Generate bill
            </Button>
            <Button
              variant="glass"
              icon="refresh"
              onClick={() => {
                stats.reload();
                activity.reload();
              }}
            >
              Refresh
            </Button>
          </>
        }
      >
        <BannerChip>
          <Icon name="wallet" className="h-3.5 w-3.5" />
          {formatMoney(s.collected_this_month)} collected this month
        </BannerChip>
        <BannerChip>
          <Icon name="clock" className="h-3.5 w-3.5" />
          {formatMoney(s.outstanding_amount)} outstanding
        </BannerChip>
      </WelcomeBanner>

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
          <ul className="divide-y divide-sand-100">
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
                    className="group flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-gradient-to-r hover:from-violet-50 hover:to-transparent"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${kind.tone} transition group-hover:scale-110`}>
                      <Icon name={kind.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-sand-800">
                        {kind.verb}: <span className="font-extrabold">{item.title}</span>
                      </p>
                      <p className="truncate text-xs text-sand-500">
                        {item.subtitle}
                        {item.amount !== null && item.type === 'reading' && ` · ${formatNumber(item.amount)} kWh`}
                        {item.amount !== null && item.type !== 'reading' && ` · ${formatMoney(item.amount)}`}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      {item.type !== 'payment' && item.type !== 'reading' ? (
                        <StatusBadge status={item.status} />
                      ) : (
                        <span className="text-xs font-semibold text-sand-500">{item.status}</span>
                      )}
                      <p className="mt-1 text-[11px] text-sand-500">{timeAgo(item.happened_at)}</p>
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
                className="group flex items-center gap-3 rounded-2xl bg-sand-50 px-4 py-3 text-sm font-bold text-sand-700 ring-1 ring-sand-200/70 transition hover:-translate-y-0.5 hover:bg-white hover:text-sand-900 hover:shadow-md"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.tone} text-white shadow-md transition group-hover:rotate-6 group-hover:scale-110`}
                >
                  <Icon name={action.icon} className="h-4 w-4" />
                </span>
                <span className="flex-1">{action.label}</span>
                <Icon name="chevronRight" className="h-4 w-4 text-sand-500 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>

          {/* Needs attention: the numbers that need action today */}
          <p className="mt-6 text-[11px] font-extrabold uppercase tracking-wider text-sand-500">Needs attention</p>
          <div className="mt-3 grid gap-2">
            {attentionRows(s).map((row) => {
              const rowClass = `flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${row.tone}`;
              const content = (
                <>
                  <Icon name={row.done ? 'check' : row.icon} className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-sand-700">{row.label}</span>
                  <span className="font-display text-base font-extrabold">{row.done ? 'All clear' : row.value}</span>
                </>
              );
              // '#...' jumps to a section on this page, anything else opens another page
              return row.to.startsWith('#') ? (
                <a key={row.label} href={row.to} className={rowClass}>
                  {content}
                </a>
              ) : (
                <Link key={row.label} to={row.to} className={rowClass}>
                  {content}
                </Link>
              );
            })}
          </div>

          {/* Live status line */}
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-sand-900 px-4 py-3 text-xs font-bold text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            System online · live data from the database
          </div>
        </Card>
      </div>

      <ChangeRequestsSection onChanged={stats.reload} />
    </div>
  );
}

/**
 * Customers' requests to change their email, phone, customer type or connection type.
 * The customer sees the same requests (and the answer) on their My Profile page.
 */
function ChangeRequestsSection({ onChanged }) {
  const toast = useToast();
  const list = useFetch(() => getChangeRequests({ status: 'Pending' }));
  const { hash } = useLocation();

  // Opened from the bell ("/admin#change-requests"): scroll down to this section
  useEffect(() => {
    if (hash === '#change-requests' && list.data) {
      document.getElementById('change-requests')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hash, list.data]);
  const [rejecting, setRejecting] = useState(null); // the request in the "reject" pop-up
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState(null);

  const finish = () => {
    list.reload();
    onChanged();
  };

  const approve = async (request) => {
    setBusyId(request.id);
    try {
      await approveChangeRequest(request.id);
      toast.success(`${request.field_label} changed for ${request.customer_name}`);
      finish();
    } catch (err) {
      toast.error(err.message);
    }
    setBusyId(null);
  };

  const reject = async () => {
    setBusyId(rejecting.id);
    try {
      await rejectChangeRequest(rejecting.id, note.trim());
      toast.success(`Request from ${rejecting.customer_name} rejected`);
      setRejecting(null);
      setNote('');
      finish();
    } catch (err) {
      toast.error(err.message);
    }
    setBusyId(null);
  };

  const items = list.data || [];

  return (
    <div id="change-requests" className="scroll-mt-24">
      <Card
        className="animate-fade-up"
        style={{ animationDelay: '380ms' }}
        title="Profile change requests"
        subtitle="Customers asked to change these. Nothing changes until you approve."
        actions={items.length > 0 && <StatusBadge status="Pending" className="!px-3" />}
      >
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <p className="text-sm text-sand-500">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon="check" title="No requests waiting" text="New email, phone or type change requests appear here." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((r) => (
              <li key={r.id} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/admin/customers/${r.customer_id}`} className="text-sm font-bold text-sand-900 hover:text-orange-600">
                      {r.customer_name}
                    </Link>
                    <p className="text-xs text-sand-500">
                      {r.customer_number} · {timeAgo(r.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                    {r.field_label}
                    {r.meter_number && ` · ${r.meter_number}`}
                  </span>
                </div>
                <p className="mt-3 break-all text-sm text-sand-600">
                  {r.old_value || '—'} <Icon name="arrowRight" className="inline h-3.5 w-3.5 text-sand-500" />{' '}
                  <b className="text-sand-900">{r.new_value}</b>
                </p>
                {r.reason && <p className="mt-1 text-xs text-sand-500">Reason: {r.reason}</p>}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="success" icon="check" loading={busyId === r.id && !rejecting} onClick={() => approve(r)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" icon="x" disabled={busyId === r.id} onClick={() => setRejecting(r)}>
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject this request?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={Boolean(busyId)}>
              Cancel
            </Button>
            <Button variant="danger" icon="x" onClick={reject} loading={Boolean(busyId)}>
              Reject
            </Button>
          </>
        }
      >
        {rejecting && (
          <div className="space-y-3">
            <p className="text-sm text-sand-600">
              {rejecting.customer_name} asked to change their {rejecting.field_label.toLowerCase()} to{' '}
              <b className="break-all">{rejecting.new_value}</b>.
            </p>
            <Field label="Note for the customer (optional)">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please visit the office with your NID" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

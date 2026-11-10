import useFetch from '../../hooks/useFetch';
import { getMyProfile } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Icon from '../../components/common/Icon';
import InfoRow from '../../components/common/InfoRow';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { PageSkeleton } from '../../components/common/Skeleton';
import { formatDate, formatDateTime, formatNumber, initials } from '../../utils/format';

export default function MyProfile() {
  const { data: p, loading, error, reload } = useFetch(getMyProfile);

  if (loading && !p) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" subtitle="To change your details, please contact the utility office." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="animate-fade-up text-center" bodyClassName="p-7">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 text-2xl font-extrabold text-slate-900 shadow-lg shadow-amber-500/30">
            {initials(p.full_name)}
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">{p.full_name}</h2>
          <p className="text-sm text-slate-500">{p.customer_number}</p>
          <div className="mt-3 flex justify-center gap-2">
            <StatusBadge status={p.status} />
            <StatusBadge status={p.customer_type} />
          </div>
          <p className="mt-4 text-xs text-slate-400">Customer since {formatDate(p.created_at)}</p>
        </Card>

        <Card title="Contact details" className="animate-fade-up lg:col-span-2" style={{ animationDelay: '60ms' }}>
          <div className="grid sm:grid-cols-2 sm:gap-x-6">
            <InfoRow icon="phone" label="Phone">
              {p.phone}
            </InfoRow>
            <InfoRow icon="mail" label="Email">
              {p.email}
            </InfoRow>
            <InfoRow icon="mapPin" label="Address">
              {p.address}
            </InfoRow>
            <InfoRow icon="key" label="Username">
              {p.username}
              <span className="block text-xs font-normal text-slate-500">Last login: {formatDateTime(p.last_login)}</span>
            </InfoRow>
          </div>
        </Card>
      </div>

      <Card title="My electricity connections" className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        {p.connections.length === 0 ? (
          <EmptyState icon="plug" title="No connections yet" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.connections.map((co, index) => (
              <div
                key={co.id}
                className="animate-fade-up rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-white shadow-md transition hover:-translate-y-1"
                style={{ animationDelay: `${150 + index * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono font-bold text-amber-300">
                    <Icon name="gauge" className="h-4 w-4" /> {co.meter_number}
                  </span>
                  <StatusBadge status={co.status} />
                </div>
                <p className="mt-4 text-2xl font-extrabold">
                  {co.last_reading !== null ? formatNumber(co.last_reading) : '—'}{' '}
                  <span className="text-sm font-semibold text-slate-400">kWh</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {co.last_reading_date ? `Last read ${formatDate(co.last_reading_date)}` : 'No reading yet'}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {co.connection_type} · installed {formatDate(co.installation_date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

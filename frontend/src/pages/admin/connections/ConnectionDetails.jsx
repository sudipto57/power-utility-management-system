import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import { getConnection } from '../../../api/connections';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import InfoRow from '../../../components/common/InfoRow';
import StatusBadge from '../../../components/common/StatusBadge';
import MeterDigits from '../../../components/common/MeterDigits';
import DataTable from '../../../components/common/DataTable';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import { PageSkeleton } from '../../../components/common/Skeleton';
import LineChart from '../../../components/charts/LineChart';
import { CHART_COLORS } from '../../../components/charts/colors';
import { formatDate, formatMoney, formatNumber } from '../../../utils/format';

export default function ConnectionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: co, loading, error, reload } = useFetch(() => getConnection(id), [id]);

  // Consumption chart: oldest -> newest
  const chart = useMemo(() => {
    if (!co) return null;
    const verified = co.readings
      .filter((r) => r.status === 'Verified')
      .slice(0, 12)
      .reverse();
    return {
      labels: verified.map((r) => formatDate(r.reading_date)),
      series: [{ label: 'kWh used', data: verified.map((r) => r.consumption), color: CHART_COLORS.amber }],
    };
  }, [co]);

  if (loading && !co) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const readingColumns = [
    { key: 'reading_date', header: 'Date', render: (r) => formatDate(r.reading_date) },
    { key: 'previous_reading', header: 'Previous', className: 'text-right', render: (r) => formatNumber(r.previous_reading) },
    { key: 'current_reading', header: 'Current', className: 'text-right', render: (r) => formatNumber(r.current_reading) },
    {
      key: 'consumption',
      header: 'Used',
      className: 'text-right',
      render: (r) => <span className="font-semibold text-slate-900">{formatNumber(r.consumption)} kWh</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'bill',
      header: 'Bill',
      render: (r) =>
        r.bill_id ? (
          <Link
            to={`/admin/bills/${r.bill_id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-sky-600 hover:underline"
          >
            {r.bill_number}
          </Link>
        ) : (
          <Link
            to={`/admin/bills/generate?reading=${r.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
          >
            <Icon name="receipt" className="h-3.5 w-3.5" /> Generate
          </Link>
        ),
    },
  ];

  const billColumns = [
    { key: 'bill_number', header: 'Bill', render: (b) => <span className="font-semibold text-slate-900">{b.bill_number}</span> },
    {
      key: 'period',
      header: 'Period',
      render: (b) => `${formatDate(b.billing_period_start)} - ${formatDate(b.billing_period_end)}`,
    },
    { key: 'due_date', header: 'Due', render: (b) => formatDate(b.due_date) },
    { key: 'total_amount', header: 'Amount', className: 'text-right', render: (b) => formatMoney(b.total_amount) },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        back="/admin/connections"
        title="Connection details"
        actions={
          <>
            <Button variant="secondary" icon="edit" to={`/admin/connections/${co.id}/edit`}>
              Edit
            </Button>
            {co.status === 'Active' && (
              <Button variant="accent" icon="gauge" to={`/admin/readings/new?connection=${co.id}`}>
                Enter reading
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Meter card */}
        <div className="relative animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-white shadow-lg">
          <div className="absolute -bottom-12 -right-12 h-44 w-44 animate-glow rounded-full bg-amber-500/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Meter</span>
              <StatusBadge status={co.status} />
            </div>
            <p className="mt-3 font-mono text-3xl font-extrabold tracking-wider text-amber-300">{co.meter_number}</p>
            {/* Odometer-style last reading */}
            <div className="mt-5 flex items-end gap-2">
              <MeterDigits value={co.last_reading} />
              <span className="text-xs text-slate-400">kWh</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {co.last_reading_date ? `Last read on ${formatDate(co.last_reading_date)}` : 'No reading yet'}
            </p>
          </div>
        </div>

        <Card title="Meter information" className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <InfoRow icon="plug" label="Connection type">
            {co.connection_type}
          </InfoRow>
          <InfoRow icon="calendar" label="Installation date">
            {formatDate(co.installation_date)}
          </InfoRow>
          <InfoRow icon="gauge" label="Readings recorded">
            {formatNumber(co.readings_count)}
          </InfoRow>
          <InfoRow icon="file" label="Notes">
            {co.notes}
          </InfoRow>
        </Card>

        <Card title="Customer" className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <InfoRow icon="user" label="Name">
            <Link to={`/admin/customers/${co.customer_id}`} className="text-sky-600 hover:underline">
              {co.customer_name}
            </Link>
          </InfoRow>
          <InfoRow icon="key" label="Customer ID">
            {co.customer_number}
          </InfoRow>
          <InfoRow icon="users" label="Customer type">
            {co.customer_type}
          </InfoRow>
          <InfoRow icon="phone" label="Phone">
            {co.customer_phone}
          </InfoRow>
        </Card>
      </div>

      <Card
        title="Consumption history"
        subtitle="kWh used per reading"
        className="animate-fade-up"
        style={{ animationDelay: '160ms' }}
      >
        {chart.labels.length > 0 ? (
          <LineChart labels={chart.labels} series={chart.series} height={250} />
        ) : (
          <EmptyState icon="activity" title="No readings yet" text="Enter the first meter reading to start the history." />
        )}
      </Card>

      <Card title="Meter readings" bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <DataTable columns={readingColumns} rows={co.readings} emptyIcon="gauge" emptyTitle="No readings yet" />
      </Card>

      <Card title="Bills for this connection" bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '240ms' }}>
        <DataTable
          columns={billColumns}
          rows={co.bills}
          onRowClick={(b) => navigate(`/admin/bills/${b.id}`)}
          emptyIcon="receipt"
          emptyTitle="No bills yet"
        />
      </Card>
    </div>
  );
}

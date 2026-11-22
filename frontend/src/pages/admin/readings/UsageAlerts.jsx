import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import { getUnusualReadings } from '../../../api/readings';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import DataTable from '../../../components/common/DataTable';
import ErrorState from '../../../components/common/ErrorState';
import { formatDate, formatNumber } from '../../../utils/format';

const TABS = [
  { value: '', label: 'All alerts' },
  { value: 'Very high', label: 'Very high' },
  { value: 'Very low', label: 'Very low' },
];

/**
 * Admin: readings whose usage per day is more than double, or less than a third, of that meter's
 * average over its previous 3 readings. Worked out by the database view unusual_readings.
 */
export default function UsageAlerts() {
  const navigate = useNavigate();
  const [alert, setAlert] = useState('');
  const { data, loading, error, reload } = useFetch(() => getUnusualReadings({ alert }), [alert]);

  const columns = [
    { key: 'reading_date', header: 'Date', render: (r) => formatDate(r.reading_date) },
    {
      key: 'meter_number',
      header: 'Meter',
      render: (r) => <span className="font-mono font-bold text-sand-900">{r.meter_number}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (r) => (
        <div>
          <p className="font-semibold text-sand-800">{r.customer_name}</p>
          <p className="text-xs text-sand-500">{r.customer_number}</p>
        </div>
      ),
    },
    {
      key: 'consumption',
      header: 'Used',
      className: 'text-right',
      render: (r) => `${formatNumber(r.consumption)} kWh in ${r.days} day${r.days === 1 ? '' : 's'}`,
    },
    {
      key: 'daily_usage',
      header: 'Per day',
      className: 'text-right',
      render: (r) => <span className="font-bold text-sand-900">{formatNumber(r.daily_usage)} kWh</span>,
    },
    {
      key: 'usual_daily_usage',
      header: 'Usual per day',
      className: 'text-right',
      render: (r) => `${formatNumber(r.usual_daily_usage)} kWh`,
    },
    {
      key: 'alert',
      header: 'Alert',
      render: (r) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
            r.alert === 'Very high' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-sky-50 text-sky-700 ring-sky-200'
          }`}
        >
          {r.alert} · {r.times_usual}×
        </span>
      ),
    },
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
          <span className="text-xs font-semibold text-amber-700">Not billed yet</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        back="/admin/readings"
        title="Usage alerts"
        subtitle="Readings far from the meter's usual use per day (more than double, or less than a third). Check them before billing."
      />
      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-sand-100 p-4">
          <div className="flex rounded-xl bg-sand-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setAlert(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  alert === tab.value ? 'bg-white text-sand-900 shadow-sm' : 'text-sand-500 hover:text-sand-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {data && <span className="text-xs font-semibold text-sand-500">{data.length} found</span>}
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
            onRowClick={(r) => navigate(`/admin/connections/${r.connection_id}`)}
            emptyIcon="gauge"
            emptyTitle="No unusual readings"
            emptyText="Every reading is close to its meter's usual use."
          />
        )}
      </Card>
    </div>
  );
}

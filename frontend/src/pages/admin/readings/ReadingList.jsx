import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import { getReadings } from '../../../api/readings';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import { formatDate, formatNumber } from '../../../utils/format';

const TABS = [
  { value: '', label: 'All readings' },
  { value: 'no', label: 'Waiting for a bill' },
  { value: 'yes', label: 'Billed' },
];

export default function ReadingList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [billed, setBilled] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, loading, error, reload } = useFetch(
    () => getReadings({ search: debouncedSearch, billed }),
    [debouncedSearch, billed]
  );

  const columns = [
    {
      key: 'reading_date',
      header: 'Date',
      render: (r) => <span className="font-semibold text-slate-800">{formatDate(r.reading_date)}</span>,
    },
    {
      key: 'meter_number',
      header: 'Meter',
      render: (r) => <span className="font-mono font-bold text-slate-900">{r.meter_number}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-800">{r.customer_name}</p>
          <p className="text-xs text-slate-500">{r.customer_number}</p>
        </div>
      ),
    },
    { key: 'previous_reading', header: 'Previous', className: 'text-right', render: (r) => formatNumber(r.previous_reading) },
    { key: 'current_reading', header: 'Current', className: 'text-right', render: (r) => formatNumber(r.current_reading) },
    {
      key: 'consumption',
      header: 'Used',
      className: 'text-right',
      render: (r) => <span className="font-bold text-slate-900">{formatNumber(r.consumption)} kWh</span>,
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
            <Icon name="receipt" className="h-3.5 w-3.5" /> Generate bill
          </Link>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Meter readings"
        subtitle="Every reading entered, and which ones still need a bill."
        actions={
          <Button variant="accent" icon="plus" to="/admin/readings/new">
            Enter reading
          </Button>
        }
      />
      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setBilled(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  billed === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search meter or customer..." className="min-w-60 flex-1" />
          {data && <span className="text-xs font-semibold text-slate-500">{data.length} found</span>}
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
            emptyTitle={billed === 'no' ? 'Every reading is billed' : 'No readings found'}
            emptyText={billed === 'no' ? 'Nice! Nothing is waiting for a bill.' : undefined}
          />
        )}
      </Card>
    </div>
  );
}

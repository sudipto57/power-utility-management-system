import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import { getRequests } from '../../../api/requests';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import SearchBar from '../../../components/common/SearchBar';
import FilterSelect from '../../../components/common/FilterSelect';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES, REQUEST_STATUSES } from '../../../utils/options';
import { timeAgo } from '../../../utils/format';

const STATUS_TONES = {
  Pending: 'from-amber-400 to-amber-500',
  'In Progress': 'from-sky-400 to-sky-500',
  Resolved: 'from-emerald-400 to-emerald-500',
  Cancelled: 'from-sand-300 to-sand-400',
};

export default function RequestList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useFetch(
    () => getRequests({ search: debouncedSearch, status, priority, category }),
    [debouncedSearch, status, priority, category]
  );
  // Counts per status for the clickable summary cards (from the full, unfiltered list)
  const all = useFetch(() => getRequests({}), []);
  const counts = REQUEST_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: (all.data || []).filter((r) => r.status === s).length }),
    {}
  );

  const columns = [
    {
      key: 'request_number',
      header: 'Request',
      render: (r) => <span className="font-mono font-bold text-sand-900">{r.request_number}</span>,
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
      key: 'category',
      header: 'Problem',
      render: (r) => (
        <div className="max-w-xs">
          <p className="font-semibold text-sand-800">{r.category}</p>
          <p className="truncate text-xs text-sand-500">{r.description}</p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'assigned_to_name',
      header: 'Assigned to',
      render: (r) => r.assigned_to_name || <span className="text-sand-500">nobody yet</span>,
    },
    {
      key: 'created_at',
      header: 'Received',
      render: (r) => <span className="text-xs text-sand-500">{timeAgo(r.created_at)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Complaint management" subtitle="Service requests sent by customers. Open one to update its status." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {REQUEST_STATUSES.map((s, index) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? '' : s)}
            className={`group relative animate-fade-up overflow-hidden rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${
              status === s ? 'ring-2 ring-sand-900' : 'ring-sand-200/70'
            }`}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${STATUS_TONES[s]}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-sand-500">{s}</p>
            <p className="mt-1 text-2xl font-extrabold text-sand-900">{all.data ? counts[s] : '…'}</p>
          </button>
        ))}
      </div>

      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-sand-100 p-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search request, customer or text..."
            className="min-w-60 flex-1"
          />
          <FilterSelect value={status} onChange={setStatus} options={REQUEST_STATUSES} allLabel="All statuses" />
          <FilterSelect value={priority} onChange={setPriority} options={REQUEST_PRIORITIES} allLabel="All priorities" />
          <FilterSelect value={category} onChange={setCategory} options={REQUEST_CATEGORIES} allLabel="All categories" />
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
            onRowClick={(r) => navigate(`/admin/requests/${r.id}`)}
            emptyIcon="complaint"
            emptyTitle="No requests found"
          />
        )}
      </Card>
    </div>
  );
}

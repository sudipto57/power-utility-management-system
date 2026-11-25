import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import { getSupportTickets } from '../../../api/support';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';
import SearchBar from '../../../components/common/SearchBar';
import StatusBadge from '../../../components/common/StatusBadge';
import DataTable from '../../../components/common/DataTable';
import ErrorState from '../../../components/common/ErrorState';
import { SUPPORT_STATUSES } from '../../../utils/options';
import { timeAgo } from '../../../utils/format';

/** Admin: problems sent from the Support form on the first page (anybody, with a confirmed email). */
export default function SupportList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, loading, error, reload } = useFetch(
    () => getSupportTickets({ search: debouncedSearch, status }),
    [debouncedSearch, status]
  );
  // Counts for the filter chips (from the whole list)
  const all = useFetch(() => getSupportTickets({}), []);
  const countOf = (s) => (all.data || []).filter((t) => t.status === s).length;

  const columns = [
    { key: 'ticket_number', header: 'Ticket', render: (t) => <span className="font-mono font-bold text-sand-900">{t.ticket_number}</span> },
    {
      key: 'name',
      header: 'From',
      render: (t) => (
        <div>
          <p className="font-semibold text-sand-800">{t.name}</p>
          <p className="text-xs text-sand-500">{t.email}</p>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Problem',
      render: (t) => (
        <div className="max-w-xs">
          <p className="flex items-center gap-1.5 font-semibold text-sand-800">
            {t.subject}
            {t.attachment_name && <Icon name="file" className="h-3.5 w-3.5 shrink-0 text-sand-500" />}
          </p>
          <p className="truncate text-xs text-sand-500">{t.category}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'verified_at', header: 'Received', render: (t) => <span className="text-xs text-sand-500">{timeAgo(t.verified_at)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Support" subtitle="Problems sent from the Support form on the first page. Solving one emails your reply." />

      <div className="flex flex-wrap gap-2">
        {['', ...SUPPORT_STATUSES].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-2 text-sm font-bold ring-1 transition ${
              status === s ? 'bg-sand-900 text-white ring-sand-900 dark:bg-orange-500' : 'bg-white text-sand-600 ring-sand-200 hover:ring-sand-300'
            }`}
          >
            {s || 'All'} {s && all.data ? <span className="ml-1 opacity-70">{countOf(s)}</span> : null}
          </button>
        ))}
      </div>

      <Card bodyClassName="p-0">
        <div className="border-b border-sand-100 p-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search ticket number, name, email or subject" className="max-w-md" />
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            loading={loading}
            onRowClick={(t) => navigate(`/admin/support/${t.id}`)}
            emptyIcon="complaint"
            emptyTitle="No support problems"
            emptyText="Problems sent from the first page show here after the sender confirms their email."
          />
        )}
      </Card>
    </div>
  );
}

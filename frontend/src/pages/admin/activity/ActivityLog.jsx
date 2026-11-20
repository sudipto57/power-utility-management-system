import { useState } from 'react';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import { getActivity } from '../../../api/activity';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import SearchBar from '../../../components/common/SearchBar';
import FilterSelect from '../../../components/common/FilterSelect';
import DataTable from '../../../components/common/DataTable';
import ErrorState from '../../../components/common/ErrorState';
import { formatDateTime, timeAgo } from '../../../utils/format';

// Table names from the database, in words people understand
const TABLE_LABELS = {
  customers: 'Customer',
  connections: 'Connection',
  meter_readings: 'Meter reading',
  bills: 'Bill',
  payments: 'Payment',
  service_requests: 'Complaint',
  bill_adjustments: 'Late fee / waiver',
  outage_notices: 'Outage notice',
  meter_replacements: 'Meter replacement',
};
const TABLE_BY_LABEL = Object.fromEntries(Object.entries(TABLE_LABELS).map(([table, label]) => [label, table]));

const ACTION_LABELS = { INSERT: 'Added', UPDATE: 'Changed', DELETE: 'Deleted' };
const ACTION_BY_LABEL = { Added: 'INSERT', Changed: 'UPDATE', Deleted: 'DELETE' };
const ACTION_STYLES = {
  INSERT: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  UPDATE: 'bg-sky-50 text-sky-700 ring-sky-200',
  DELETE: 'bg-rose-50 text-rose-700 ring-rose-200',
};

// Columns that are not interesting to show in the "What changed" list
const HIDDEN_FIELDS = ['id', 'created_at', 'updated_at', 'password_hash'];

/** A JSON value from the log as short text. */
function show(value) {
  if (value === null || value === undefined || value === '') return '-';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

/** "status: Unpaid → Paid" lines for a change. */
function ChangeList({ row }) {
  if (row.action === 'DELETE') return <span className="text-slate-500">Row removed</span>;
  const fields = Object.keys(row.new_values || {}).filter((key) => !HIDDEN_FIELDS.includes(key));
  if (row.action === 'INSERT') {
    return <span className="text-slate-500">New record ({fields.length} fields)</span>;
  }
  return (
    <ul className="space-y-0.5 text-xs">
      {fields.map((key) => (
        <li key={key}>
          <span className="font-bold text-slate-700">{key.replace(/_/g, ' ')}:</span>{' '}
          <span className="text-slate-400 line-through">{show(row.old_values?.[key])}</span>{' '}
          <span className="text-slate-400">→</span> <span className="text-slate-900">{show(row.new_values[key])}</span>
        </li>
      ))}
    </ul>
  );
}

/** Admin: the activity log. Every row is written by a database trigger, not by the website. */
export default function ActivityLog() {
  const [search, setSearch] = useState('');
  const [table, setTable] = useState('');
  const [action, setAction] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, loading, error, reload } = useFetch(
    () => getActivity({ search: debouncedSearch, table: TABLE_BY_LABEL[table], action: ACTION_BY_LABEL[action] }),
    [debouncedSearch, table, action]
  );

  const columns = [
    {
      key: 'changed_at',
      header: 'When',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-800">{timeAgo(r.changed_at)}</p>
          <p className="text-xs text-slate-500">{formatDateTime(r.changed_at)}</p>
        </div>
      ),
    },
    {
      key: 'changed_by_name',
      header: 'Who',
      render: (r) =>
        r.changed_by_name ? (
          <div>
            <p className="font-semibold text-slate-800">{r.changed_by_name}</p>
            <p className="text-xs capitalize text-slate-500">{r.changed_by_role}</p>
          </div>
        ) : (
          <span className="text-slate-500" title="Done by the database itself (e.g. a bill turning Overdue) or in pgAdmin">
            System
          </span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${ACTION_STYLES[r.action]}`}>
          {ACTION_LABELS[r.action]}
        </span>
      ),
    },
    {
      key: 'label',
      header: 'What',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.label || '-'}</p>
          <p className="text-xs text-slate-500">{TABLE_LABELS[r.table_name] || r.table_name}</p>
        </div>
      ),
    },
    { key: 'changes', header: 'Details', render: (r) => <ChangeList row={r} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Activity log"
        subtitle="Who added, changed or deleted what. Written by the database itself, so nothing is missed."
      />
      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search bill, meter, customer or staff name..."
            className="min-w-60 flex-1"
          />
          <FilterSelect value={table} onChange={setTable} options={Object.values(TABLE_LABELS)} allLabel="Everything" />
          <FilterSelect value={action} onChange={setAction} options={Object.keys(ACTION_BY_LABEL)} allLabel="All actions" />
          {data && <span className="text-xs font-semibold text-slate-500">latest {data.length}</span>}
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
            emptyIcon="activity"
            emptyTitle="Nothing logged yet"
            emptyText="Changes show up here as soon as someone adds or edits a record."
          />
        )}
      </Card>
    </div>
  );
}

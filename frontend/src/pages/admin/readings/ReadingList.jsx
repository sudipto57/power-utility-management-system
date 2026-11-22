import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import useToast from '../../../hooks/useToast';
import { getReadings, rejectReading, verifyReading } from '../../../api/readings';
import NoteDialog from '../../../components/common/NoteDialog';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import { formatDate, formatNumber } from '../../../utils/format';

// "Sent by customers" = readings customers typed in themselves (Pending until staff check them)
const TABS = [
  { value: '', label: 'All readings' },
  { value: 'pending', label: 'Sent by customers' },
  { value: 'no', label: 'Waiting for a bill' },
  { value: 'yes', label: 'Billed' },
];

export default function ReadingList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(params.get('status') === 'Pending' ? 'pending' : ''); // the bell links here with ?status=Pending
  const [rejecting, setRejecting] = useState(null); // the reading in the "Reject" pop-up
  const [busyId, setBusyId] = useState(null);
  const debouncedSearch = useDebounce(search);
  const { data, loading, error, reload } = useFetch(
    () => getReadings({ search: debouncedSearch, ...(tab === 'pending' ? { status: 'Pending' } : { billed: tab }) }),
    [debouncedSearch, tab]
  );

  const verify = async (reading) => {
    setBusyId(reading.id);
    try {
      await verifyReading(reading.id);
      toast.success(`Reading for ${reading.meter_number} verified. It can be billed now`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (note) => {
    setBusyId(rejecting.id);
    try {
      await rejectReading(rejecting.id, note);
      toast.success(`Reading for ${rejecting.meter_number} rejected. The customer was told`);
      setRejecting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'reading_date',
      header: 'Date',
      render: (r) => <span className="font-semibold text-sand-800">{formatDate(r.reading_date)}</span>,
    },
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
          <p className="text-xs text-sand-500">
            {r.customer_number}
            {r.recorded_by_role === 'customer' && <span className="ml-1.5 font-bold text-sky-700">· sent by customer</span>}
          </p>
        </div>
      ),
    },
    { key: 'previous_reading', header: 'Previous', className: 'text-right', render: (r) => formatNumber(r.previous_reading) },
    { key: 'current_reading', header: 'Current', className: 'text-right', render: (r) => formatNumber(r.current_reading) },
    {
      key: 'consumption',
      header: 'Used',
      className: 'text-right',
      render: (r) => <span className="font-bold text-sand-900">{formatNumber(r.consumption)} kWh</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'bill',
      header: 'Bill',
      render: (r) =>
        r.status === 'Pending' ? (
          // A customer sent this reading: staff check it before it counts
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="success" icon="check" loading={busyId === r.id} onClick={() => verify(r)}>
              Verify
            </Button>
            <Button size="sm" variant="secondary" icon="x" disabled={busyId === r.id} onClick={() => setRejecting(r)}>
              Reject
            </Button>
          </div>
        ) : r.status === 'Rejected' ? (
          <span className="text-xs text-sand-500">Not used</span>
        ) : r.bill_id ? (
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
        subtitle="Every reading entered, readings customers sent, and which ones still need a bill."
        actions={
          <>
            <Button variant="secondary" icon="alert" to="/admin/readings/alerts">
              Usage alerts
            </Button>
            <Button variant="accent" icon="plus" to="/admin/readings/new">
              Enter reading
            </Button>
          </>
        }
      />
      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-sand-100 p-4">
          <div className="flex flex-wrap rounded-xl bg-sand-100 p-1">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === item.value ? 'bg-white text-sand-900 shadow-sm' : 'text-sand-500 hover:text-sand-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search meter or customer..." className="min-w-60 flex-1" />
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
            emptyTitle={
              tab === 'no' ? 'Every reading is billed' : tab === 'pending' ? 'No readings to check' : 'No readings found'
            }
            emptyText={
              tab === 'no'
                ? 'Nothing is waiting for a bill.'
                : tab === 'pending'
                  ? 'Readings that customers send from their Meter & Usage page appear here.'
                  : undefined
            }
          />
        )}
      </Card>
      <NoteDialog
        key={rejecting?.id}
        open={Boolean(rejecting)}
        title="Reject this reading?"
        message={
          rejecting &&
          `${rejecting.customer_name} sent ${formatNumber(rejecting.current_reading)} kWh for meter ${rejecting.meter_number}. The reading will not be used for a bill.`
        }
        confirmLabel="Reject reading"
        loading={busyId === rejecting?.id}
        onConfirm={reject}
        onCancel={() => setRejecting(null)}
      />
    </div>
  );
}

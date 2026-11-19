import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useDebounce from '../../../hooks/useDebounce';
import useToast from '../../../hooks/useToast';
import { deleteCustomer, getCustomers, getSqlFileStatus, saveSqlFileNow, updateCustomer } from '../../../api/customers';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import SearchBar from '../../../components/common/SearchBar';
import FilterSelect from '../../../components/common/FilterSelect';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '../../../utils/options';
import { formatMoney, initials } from '../../../utils/format';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Joined in the last 7 days (shows a small "New" label in the list)
const isNew = (customer) => Date.now() - new Date(customer.created_at).getTime() < WEEK_MS;

export default function CustomerList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useFetch(
    () => getCustomers({ search: debouncedSearch, status, type }),
    [debouncedSearch, status, type]
  );

  // Delete flow: confirm -> delete. If the customer has bills, offer "Deactivate" instead.
  const [toDelete, setToDelete] = useState(null);
  const [toDeactivate, setToDeactivate] = useState(null);
  const [working, setWorking] = useState(false);

  const confirmDelete = async () => {
    setWorking(true);
    try {
      await deleteCustomer(toDelete.id);
      toast.success(`${toDelete.full_name} was deleted`);
      setToDelete(null);
      reload();
    } catch (err) {
      if (err.code === 'HAS_BILLS') {
        setToDeactivate({ ...toDelete, reason: err.message });
        setToDelete(null);
      } else {
        toast.error(err.message);
      }
    } finally {
      setWorking(false);
    }
  };

  const confirmDeactivate = async () => {
    setWorking(true);
    try {
      await updateCustomer(toDeactivate.id, { status: 'Inactive' });
      toast.success(`${toDeactivate.full_name} is now Inactive`);
      setToDeactivate(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    {
      key: 'full_name',
      header: 'Customer',
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-xs font-bold text-amber-300">
            {initials(c.full_name)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-semibold text-slate-900">
              {c.full_name}
              {isNew(c) && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                  New
                </span>
              )}
            </p>
            <p className="truncate text-xs text-slate-500">
              {c.customer_number} · {c.email || 'no email'}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'customer_type', header: 'Type', render: (c) => <StatusBadge status={c.customer_type} /> },
    { key: 'connections_count', header: 'Services', className: 'text-center' },
    {
      key: 'outstanding_amount',
      header: 'Outstanding',
      className: 'text-right',
      render: (c) => (
        <span className={c.outstanding_amount > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}>
          {formatMoney(c.outstanding_amount)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Edit"
            onClick={() => navigate(`/admin/customers/${c.id}/edit`)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <Icon name="edit" className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => setToDelete(c)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Add, view, edit and delete customer accounts."
        actions={
          <Button variant="accent" icon="plus" to="/admin/customers/new">
            Add customer
          </Button>
        }
      />

      <SqlFileStrip />

      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search name, ID, phone, email..."
            className="min-w-60 flex-1"
          />
          <FilterSelect value={type} onChange={setType} options={CUSTOMER_TYPES} allLabel="All types" />
          <FilterSelect value={status} onChange={setStatus} options={CUSTOMER_STATUSES} allLabel="All statuses" />
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
            onRowClick={(c) => navigate(`/admin/customers/${c.id}`)}
            emptyIcon="users"
            emptyTitle="No customers found"
            emptyAction={
              <Button variant="accent" icon="plus" to="/admin/customers/new">
                Add the first customer
              </Button>
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete customer?"
        message={
          toDelete &&
          `This permanently deletes ${toDelete.full_name} (${toDelete.customer_number}), their connections, readings and requests.`
        }
        confirmLabel="Delete"
        loading={working}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={Boolean(toDeactivate)}
        title="Can't delete. Deactivate instead?"
        message={toDeactivate?.reason}
        confirmLabel="Set as Inactive"
        variant="primary"
        loading={working}
        onConfirm={confirmDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  );
}

/**
 * Small strip above the list. New customers (website sign-ups) are saved live in the database
 * at once. The laptop then copies them into database/04_sample_data.sql (straight away when the
 * backend runs there, otherwise when the laptop is switched on). "Save now" only exists on the laptop.
 */
function SqlFileStrip() {
  const toast = useToast();
  const { data, error, reload } = useFetch(getSqlFileStatus, []);
  const [saving, setSaving] = useState(false);

  const saveNow = async () => {
    setSaving(true);
    try {
      await saveSqlFileNow();
      toast.success('database/04_sample_data.sql is up to date');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error || !data) return null; // the list below still works; this strip is only extra information

  const upToDate = data.waiting === 0;
  const where = data.computer ? `on ${data.computer}` : 'on the laptop';
  const when = data.last_saved ? ` (last copied ${data.last_saved})` : '';

  let detail;
  if (upToDate) {
    detail = `All of them are also in ${data.file} ${where}${when}.`;
  } else if (data.found) {
    detail = `${data.waiting} not copied into ${data.file} yet. Press "Save now".`;
  } else {
    detail = `${data.waiting} waiting safely in the database. They are copied into ${data.file} automatically when the laptop is on${when}.`;
  }

  return (
    <div
      className={`mb-4 flex animate-fade-up flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
        upToDate ? 'bg-emerald-50 ring-emerald-100' : 'bg-amber-50 ring-amber-100'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
          upToDate ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      >
        <Icon name={upToDate ? 'check' : 'clock'} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-slate-900">
          {data.customers_in_database} new {data.customers_in_database === 1 ? 'customer' : 'customers'} since the sample data
          <span className="font-semibold text-slate-500"> · saved live in the database</span>
        </p>
        <p className="text-xs text-slate-600">{detail}</p>
      </div>
      {data.found && (
        <Button variant="secondary" size="sm" icon="refresh" loading={saving} onClick={saveNow}>
          Save now
        </Button>
      )}
    </div>
  );
}

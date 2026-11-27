import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useToast from '../../../hooks/useToast';
import { deleteCustomerForever, deleteCustomerPhoto, getCustomer, setCustomerPhoto } from '../../../api/customers';
import DeleteForeverDialog from '../../../components/common/DeleteForeverDialog';
import ProfilePhoto from '../../../components/common/ProfilePhoto';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import InfoRow from '../../../components/common/InfoRow';
import StatusBadge from '../../../components/common/StatusBadge';
import DataTable from '../../../components/common/DataTable';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import { PageSkeleton } from '../../../components/common/Skeleton';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../../../utils/format';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: c, loading, error, reload } = useFetch(() => getCustomer(id), [id]);
  const [deleting, setDeleting] = useState(false); // the "Delete permanently" pop-up is open

  const deleteForever = async (typedNumber) => {
    await deleteCustomerForever(c.id, typedNumber);
    toast.success(`${c.customer_number} was deleted permanently`);
    navigate('/admin/customers', { replace: true });
  };

  if (loading && !c) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const billColumns = [
    { key: 'bill_number', header: 'Bill', render: (b) => <span className="font-semibold text-sand-900">{b.bill_number}</span> },
    { key: 'meter_number', header: 'Meter' },
    {
      key: 'period',
      header: 'Period',
      render: (b) => `${formatDate(b.billing_period_start)} - ${formatDate(b.billing_period_end)}`,
    },
    { key: 'total_amount', header: 'Amount', className: 'text-right', render: (b) => formatMoney(b.total_amount) },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        back="/admin/customers"
        title="Customer profile"
        actions={
          <>
            <Button variant="secondary" icon="wallet" to={`/admin/customers/${c.id}/statement`}>
              View statement
            </Button>
            <Button variant="secondary" icon="plug" to={`/admin/connections/new?customer=${c.id}`}>
              Add connection
            </Button>
            <Button variant="accent" icon="edit" to={`/admin/customers/${c.id}/edit`}>
              Edit
            </Button>
            <Button variant="danger" icon="trash" onClick={() => setDeleting(true)}>
              Delete permanently
            </Button>
          </>
        }
      />

      {/* Header card */}
      <div className="relative animate-fade-up overflow-hidden rounded-2xl bg-sand-950 p-6 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <ProfilePhoto
            key={c.id}
            name={c.full_name}
            photo={c.photo}
            onSave={(photo) => setCustomerPhoto(c.id, photo)}
            onRemove={() => deleteCustomerPhoto(c.id)}
            dark
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-extrabold tracking-tight">{c.full_name}</h2>
            <p className="mt-1 text-sm text-sand-400">
              {c.customer_number} · Customer since {formatDate(c.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={c.status} />
              <StatusBadge status={c.customer_type} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center sm:text-right">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-sand-400">Services</p>
              <p className="mt-1 text-xl font-extrabold">{formatNumber(c.connections_count)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-sand-400">Total billed</p>
              <p className="mt-1 text-xl font-extrabold">{formatMoney(c.total_billed)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-sand-400">Outstanding</p>
              <p className={`mt-1 text-xl font-extrabold ${c.outstanding_amount > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {formatMoney(c.outstanding_amount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Contact details" className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <InfoRow icon="phone" label="Phone">
            {c.phone}
          </InfoRow>
          <InfoRow icon="mail" label="Email">
            {c.email}
          </InfoRow>
          <InfoRow icon="mapPin" label="Address">
            {c.address}
          </InfoRow>
          <InfoRow icon="key" label="Login">
            {c.username ? (
              <span>
                {c.username}
                <span className="block text-xs font-normal text-sand-500">Last login: {formatDateTime(c.last_login)}</span>
              </span>
            ) : (
              <span className="text-sand-500">No login account</span>
            )}
          </InfoRow>
        </Card>

        <Card
          title="Electricity connections"
          subtitle="Services and meters"
          className="animate-fade-up lg:col-span-2"
          style={{ animationDelay: '120ms' }}
        >
          {c.connections.length === 0 ? (
            <EmptyState
              icon="plug"
              title="No connections yet"
              text="Create the first electricity service for this customer."
              action={
                <Button variant="accent" icon="plus" to={`/admin/connections/new?customer=${c.id}`}>
                  Add connection
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {c.connections.map((co, index) => (
                <Link
                  key={co.id}
                  to={`/admin/connections/${co.id}`}
                  className="group animate-fade-up rounded-xl bg-sand-50 p-4 ring-1 ring-sand-200/70 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  style={{ animationDelay: `${150 + index * 60}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono text-sm font-bold text-sand-900">
                      <Icon name="gauge" className="h-4 w-4 text-amber-500" /> {co.meter_number}
                    </span>
                    <StatusBadge status={co.status} />
                  </div>
                  <p className="mt-3 text-xs text-sand-500">
                    {co.connection_type} · installed {formatDate(co.installation_date)}
                  </p>
                  <p className="mt-1 text-xs text-sand-500">
                    Last reading:{' '}
                    <span className="font-semibold text-sand-700">
                      {co.last_reading !== null
                        ? `${formatNumber(co.last_reading)} kWh on ${formatDate(co.last_reading_date)}`
                        : 'none yet'}
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Bills"
        subtitle={`${c.bills.length} bill(s)`}
        bodyClassName="p-0"
        className="animate-fade-up"
        style={{ animationDelay: '180ms' }}
      >
        <DataTable
          columns={billColumns}
          rows={c.bills}
          onRowClick={(b) => navigate(`/admin/bills/${b.id}`)}
          emptyIcon="receipt"
          emptyTitle="No bills yet"
          emptyText="Bills appear here after a meter reading is billed."
        />
      </Card>

      <Card
        title="Service requests"
        subtitle={`${c.requests.length} request(s)`}
        className="animate-fade-up"
        style={{ animationDelay: '220ms' }}
      >
        {c.requests.length === 0 ? (
          <EmptyState icon="complaint" title="No service requests" />
        ) : (
          <ul className="divide-y divide-sand-100">
            {c.requests.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/admin/requests/${r.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-sand-50"
                >
                  <span className="font-mono text-xs font-bold text-sand-500">{r.request_number}</span>
                  <span className="flex-1 truncate text-sm font-semibold text-sand-800">{r.category}</span>
                  <StatusBadge status={r.priority} />
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <DeleteForeverDialog open={deleting} customer={c} onCancel={() => setDeleting(false)} onDelete={deleteForever} />
    </div>
  );
}

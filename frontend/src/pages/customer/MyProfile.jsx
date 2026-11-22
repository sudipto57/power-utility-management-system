import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { createMyChangeRequest, getMyChangeRequests, getMyProfile, updateMyProfile } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Icon from '../../components/common/Icon';
import InfoRow from '../../components/common/InfoRow';
import StatusBadge from '../../components/common/StatusBadge';
import MeterDigits from '../../components/common/MeterDigits';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import FormError from '../../components/common/FormError';
import { Field, Input, Select, Textarea } from '../../components/common/FormField';
import { PageSkeleton } from '../../components/common/Skeleton';
import { formatDate, formatDateTime, initials } from '../../utils/format';

// What the customer can ask the office to change (name and address they change alone)
const CHANGE_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone number' },
  { value: 'customer_type', label: 'Customer type (Residential / Commercial)' },
  { value: 'connection_type', label: 'Connection type of a meter (Single / Three Phase)' },
];

export default function MyProfile() {
  const { data: p, loading, error, reload } = useFetch(getMyProfile);
  const changes = useFetch(getMyChangeRequests);
  const [editOpen, setEditOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  if (loading && !p) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pendingCount = (changes.data || []).filter((r) => r.status === 'Pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        subtitle="Change your name and address here. Email, phone and types change after the office approves."
        actions={
          <>
            <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>
              Edit my details
            </Button>
            <Button variant="accent" icon="send" onClick={() => setRequestOpen(true)}>
              Request a change
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="animate-fade-up text-center" bodyClassName="p-7">
          <span className="keep-dark mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 text-2xl font-extrabold text-sand-900 shadow-lg shadow-amber-500/30">
            {initials(p.full_name)}
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-sand-900">{p.full_name}</h2>
          <p className="text-sm text-sand-500">{p.customer_number}</p>
          <div className="mt-3 flex justify-center gap-2">
            <StatusBadge status={p.status} />
            <StatusBadge status={p.customer_type} />
          </div>
          <p className="mt-4 text-xs text-sand-500">Customer since {formatDate(p.created_at)}</p>
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
              <span className="block text-xs font-normal text-sand-500">Last login: {formatDateTime(p.last_login)}</span>
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
                className="animate-fade-up rounded-2xl bg-gradient-to-br from-sand-900 to-sand-950 p-5 text-white shadow-md transition hover:-translate-y-1"
                style={{ animationDelay: `${150 + index * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono font-bold text-amber-300">
                    <Icon name="gauge" className="h-4 w-4" /> {co.meter_number}
                  </span>
                  <StatusBadge status={co.status} />
                </div>
                <div className="mt-4 flex items-end gap-2">
                  {co.last_reading !== null ? (
                    <MeterDigits value={co.last_reading} size="sm" />
                  ) : (
                    <span className="text-2xl font-extrabold">—</span>
                  )}
                  <span className="text-sm font-semibold text-sand-400">kWh</span>
                </div>
                <p className="mt-1 text-xs text-sand-400">
                  {co.last_reading_date ? `Last read ${formatDate(co.last_reading_date)}` : 'No reading yet'}
                </p>
                <p className="mt-3 text-xs text-sand-400">
                  {co.connection_type} · installed {formatDate(co.installation_date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ---------- The customer's change requests (the admin answers them on the Admin Dashboard) ---------- */}
      <Card
        title="My change requests"
        subtitle={pendingCount > 0 ? `${pendingCount} waiting for the office` : 'Email, phone and type changes you asked for'}
        className="animate-fade-up"
        style={{ animationDelay: '180ms' }}
      >
        {changes.error ? (
          <ErrorState message={changes.error} onRetry={changes.reload} />
        ) : !changes.data ? (
          <p className="text-sm text-sand-500">Loading…</p>
        ) : changes.data.length === 0 ? (
          <EmptyState
            icon="send"
            title="No change requests yet"
            text="Need a new email, phone number or connection type? Press Request a change."
          />
        ) : (
          <ul className="divide-y divide-sand-100">
            {changes.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-sand-900">
                    {r.field_label}
                    {r.meter_number && <span className="font-mono text-sand-500"> · {r.meter_number}</span>}
                  </p>
                  <p className="mt-0.5 break-all text-sm text-sand-600">
                    {r.old_value || '—'} <Icon name="arrowRight" className="inline h-3.5 w-3.5 text-sand-500" />{' '}
                    <b className="text-sand-900">{r.new_value}</b>
                  </p>
                  {r.admin_note && <p className="mt-1 text-xs text-sand-500">Office note: {r.admin_note}</p>}
                </div>
                <div className="text-right">
                  <StatusBadge status={r.status} />
                  <p className="mt-1 text-xs text-sand-500">
                    {r.decided_at ? `Answered ${formatDate(r.decided_at)}` : `Sent ${formatDate(r.created_at)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EditDetailsModal open={editOpen} profile={p} onClose={() => setEditOpen(false)} onSaved={reload} />
      <ChangeRequestModal
        open={requestOpen}
        profile={p}
        onClose={() => setRequestOpen(false)}
        onSent={changes.reload}
      />
    </div>
  );
}

/** Name and address: saved straight away. */
function EditDetailsModal({ open, profile, onClose, onSaved }) {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Fill the form with the current values each time the pop-up opens
  const values = form || { full_name: profile.full_name, address: profile.address };
  const close = () => {
    setForm(null);
    setError('');
    onClose();
  };

  const save = async () => {
    setError('');
    if (!values.full_name.trim() || !values.address.trim()) {
      setError('Please fill in your name and address.');
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({ full_name: values.full_name.trim(), address: values.address.trim() });
      await refreshUser(); // new name in the top bar too
      toast.success('Your details were saved');
      onSaved();
      close();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Edit my details"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" icon="check" onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" required>
          <Input value={values.full_name} onChange={(e) => setForm({ ...values, full_name: e.target.value })} />
        </Field>
        <Field label="Address" required>
          <Textarea rows={3} value={values.address} onChange={(e) => setForm({ ...values, address: e.target.value })} />
        </Field>
        <p className="flex items-start gap-2 rounded-xl bg-sand-50 px-3 py-2.5 text-xs text-sand-500">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          To change your email, phone number or a type, use Request a change. The office checks it first.
        </p>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

const EMPTY_REQUEST = { field: 'email', new_value: '', connection_id: '', reason: '' };

/** Email, phone, customer type, connection type: sent to the office for approval. */
function ChangeRequestModal({ open, profile, onClose, onSent }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_REQUEST);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const close = () => {
    setForm(EMPTY_REQUEST);
    setError('');
    onClose();
  };
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const chooseField = (event) => setForm({ ...EMPTY_REQUEST, field: event.target.value, reason: form.reason });

  const send = async () => {
    setError('');
    if (form.field === 'connection_type' && !form.connection_id) {
      setError('Please choose the meter.');
      return;
    }
    if (!form.new_value.trim()) {
      setError('Please enter the new value.');
      return;
    }
    setSending(true);
    try {
      await createMyChangeRequest({
        field: form.field,
        new_value: form.new_value.trim(),
        connection_id: form.field === 'connection_type' ? form.connection_id : undefined,
        reason: form.reason.trim(),
      });
      toast.success('Request sent. You will get an email when the office answers.');
      onSent();
      close();
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
  };

  const current = {
    email: profile.email,
    phone: profile.phone,
    customer_type: profile.customer_type,
    connection_type: profile.connections.find((co) => co.id === form.connection_id)?.connection_type,
  }[form.field];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Request a change"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={sending}>
            Cancel
          </Button>
          <Button variant="accent" icon="send" onClick={send} loading={sending}>
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="What do you want to change?">
          <Select value={form.field} onChange={chooseField} options={CHANGE_OPTIONS} />
        </Field>

        {form.field === 'connection_type' && (
          <Field label="Which meter?">
            <Select
              value={form.connection_id}
              onChange={set('connection_id')}
              placeholder={profile.connections.length ? 'Choose a meter…' : 'You have no meters yet'}
              options={profile.connections.map((co) => ({ value: co.id, label: `${co.meter_number} (${co.connection_type})` }))}
            />
          </Field>
        )}

        <Field label="New value" hint={current ? `Now: ${current}` : undefined}>
          {form.field === 'customer_type' ? (
            <Select value={form.new_value} onChange={set('new_value')} placeholder="Choose…" options={['Residential', 'Commercial']} />
          ) : form.field === 'connection_type' ? (
            <Select value={form.new_value} onChange={set('new_value')} placeholder="Choose…" options={['Single Phase', 'Three Phase']} />
          ) : (
            <Input
              type={form.field === 'email' ? 'email' : 'tel'}
              value={form.new_value}
              onChange={set('new_value')}
              placeholder={form.field === 'email' ? 'new@email.com' : '01XXXXXXXXX'}
            />
          )}
        </Field>

        <Field label="Reason (optional)">
          <Textarea rows={2} value={form.reason} onChange={set('reason')} placeholder="e.g. I changed my SIM card" />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

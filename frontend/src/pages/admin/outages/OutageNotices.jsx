import { useState } from 'react';
import useFetch from '../../../hooks/useFetch';
import useToast from '../../../hooks/useToast';
import { createOutage, deleteOutage, getOutages, updateOutage } from '../../../api/outages';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import DataTable from '../../../components/common/DataTable';
import ErrorState from '../../../components/common/ErrorState';
import FormError from '../../../components/common/FormError';
import { Field, Input, Textarea } from '../../../components/common/FormField';
import { formatDateTime, formatNumber } from '../../../utils/format';

const STATE_STYLES = {
  'Happening now': 'bg-rose-50 text-rose-700 ring-rose-200',
  Planned: 'bg-amber-50 text-amber-700 ring-amber-200',
  Ended: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** ISO time from the API -> the "2026-11-25T10:00" text a datetime-local input needs (local time). */
function toInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const EMPTY_FORM = { title: '', area: '', starts_at: '', ends_at: '', details: '' };

/** Add / edit one notice. `notice` = null for a new one. */
function OutageForm({ notice, onClose, onSaved }) {
  const [form, setForm] = useState(
    notice
      ? { ...notice, starts_at: toInputValue(notice.starts_at), ends_at: toInputValue(notice.ends_at), details: notice.details || '' }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSave = async () => {
    if (!form.starts_at || !form.ends_at) return setError('Please choose the start and the end.');
    setSaving(true);
    setError('');
    // The browser turns the local time into an exact moment (UTC), so everyone sees the right time
    const body = {
      title: form.title,
      area: form.area,
      details: form.details,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    };
    try {
      const saved = notice ? await updateOutage(notice.id, body) : await createOutage(body);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={saving ? undefined : onClose}
      title={notice ? 'Edit outage notice' : 'New outage notice'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" icon="check" loading={saving} onClick={handleSave}>
            {notice ? 'Save changes' : 'Post notice'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2" hint="e.g. Transformer repair">
          <Input value={form.title} onChange={set('title')} maxLength={120} />
        </Field>
        <Field
          label="Area"
          required
          className="sm:col-span-2"
          hint="e.g. Mirpur 10, Dhaka. Customers whose address has the first place (Mirpur 10) see it, or type All areas"
        >
          <Input value={form.area} onChange={set('area')} maxLength={150} />
        </Field>
        <Field label="Power off from" required>
          <Input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} />
        </Field>
        <Field label="Power back by" required>
          <Input type="datetime-local" value={form.ends_at} onChange={set('ends_at')} />
        </Field>
        <Field label="Details (optional)" className="sm:col-span-2">
          <Textarea value={form.details} onChange={set('details')} rows={3} maxLength={1000} />
        </Field>
      </div>
      <div className="mt-4">
        <FormError message={error} />
      </div>
    </Modal>
  );
}

/** Admin: planned power cuts. Notices that have not ended yet scroll in everyone's news strip. */
export default function OutageNotices() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => getOutages(), []);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, notice = edit
  const [deleting, setDeleting] = useState(null);
  const [working, setWorking] = useState(false);

  const handleDelete = async () => {
    setWorking(true);
    try {
      await deleteOutage(deleting.id);
      toast.success('Outage notice deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Notice',
      render: (o) => (
        <div>
          <p className="font-semibold text-slate-900">{o.title}</p>
          <p className="text-xs text-slate-500">
            {o.area} · {formatNumber(o.customers_reached)} customer(s)
          </p>
        </div>
      ),
    },
    { key: 'starts_at', header: 'Power off from', render: (o) => formatDateTime(o.starts_at) },
    { key: 'ends_at', header: 'Power back by', render: (o) => formatDateTime(o.ends_at) },
    {
      key: 'state',
      header: 'State',
      render: (o) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${STATE_STYLES[o.state]}`}>{o.state}</span>
      ),
    },
    { key: 'created_by_name', header: 'Posted by', render: (o) => o.created_by_name || '-' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (o) => (
        <Button
          variant="ghost"
          size="sm"
          icon="trash"
          onClick={(e) => {
            e.stopPropagation();
            setDeleting(o);
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Outage notices"
        subtitle="Planned power cuts. Notices that have not ended yet scroll in the news strip for staff and customers."
        actions={
          <Button variant="accent" icon="plus" onClick={() => setEditing({})}>
            New notice
          </Button>
        }
      />
      <Card bodyClassName="p-0" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={data}
            loading={loading}
            onRowClick={(o) => setEditing(o)}
            emptyIcon="megaphone"
            emptyTitle="No outage notices"
            emptyText="Post a notice before a planned power cut, so customers know in advance."
          />
        )}
      </Card>

      {editing && (
        <OutageForm
          notice={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            toast.success(`Notice "${saved.title}" saved. ${formatNumber(saved.customers_reached)} customer(s) in this area see it`);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this notice?"
        message={deleting ? `"${deleting.title}" will disappear from the news strip.` : ''}
        confirmLabel="Delete"
        loading={working}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

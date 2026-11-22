// Power notices: staff announce power cuts and maintenance work for one area or for everyone.
// Customers in that area see the notice on My Dashboard and get a message in their inbox.
import { useState } from 'react';
import useFetch from '../../../hooks/useFetch';
import useToast from '../../../hooks/useToast';
import { createNotice, deleteNotice, getNoticeAreas, getNotices, updateNotice } from '../../../api/notices';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import FormError from '../../../components/common/FormError';
import { Field, Input, Select, Textarea } from '../../../components/common/FormField';
import { formatDateTime, formatNumber } from '../../../utils/format';

const ALL_AREAS = 'All areas';

// <input type="datetime-local"> works with local time like "2026-11-25T09:00"
function toLocalInput(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyForm() {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow, same time
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hours later
  return {
    title: '',
    notice_type: 'Maintenance',
    area: ALL_AREAS,
    message: '',
    starts_at: toLocalInput(start),
    ends_at: toLocalInput(end),
  };
}

/** Pop-up form to post or edit a notice. Render with a new `key` for every opening. */
function NoticeForm({ notice, areas, onClose, onSaved }) {
  const [form, setForm] = useState(
    notice ? { ...notice, starts_at: toLocalInput(notice.starts_at), ends_at: toLocalInput(notice.ends_at) } : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    // The browser turns local time into a full date with time zone, so everyone sees the right time
    const body = { ...form, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() };
    try {
      onSaved(notice ? await updateNotice(notice.id, body) : await createNotice(body));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={notice ? 'Edit notice' : 'Post a notice'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" icon="megaphone" loading={saving} onClick={save}>
            {notice ? 'Save changes' : 'Post notice'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2">
          <Input value={form.title} onChange={set('title')} maxLength={150} placeholder="Line repair on the Tongi feeder" />
        </Field>
        <Field label="Type">
          <Select value={form.notice_type} onChange={set('notice_type')} options={['Outage', 'Maintenance']} />
        </Field>
        <Field label="Area" hint="A place name from the address (e.g. Gazipur), or All areas">
          <Input value={form.area} onChange={set('area')} list="notice-areas" maxLength={100} />
          <datalist id="notice-areas">
            <option value={ALL_AREAS} />
            {areas.map((a) => (
              <option key={a.area} value={a.area}>{`${a.customers} customer(s)`}</option>
            ))}
          </datalist>
        </Field>
        <Field label="Starts" required>
          <Input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} />
        </Field>
        <Field label="Ends" required>
          <Input type="datetime-local" value={form.ends_at} min={form.starts_at} onChange={set('ends_at')} />
        </Field>
        <Field label="Message for customers" required className="sm:col-span-2">
          <Textarea
            rows={3}
            maxLength={2000}
            value={form.message}
            onChange={set('message')}
            placeholder="What will happen, and what should customers do?"
          />
        </Field>
      </div>
      {!notice && (
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Every customer in the area also gets a message in their inbox.
        </p>
      )}
      <div className="mt-4">
        <FormError message={error} />
      </div>
    </Modal>
  );
}

export default function NoticeList() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(getNotices);
  const { data: areas } = useFetch(getNoticeAreas);
  const [editing, setEditing] = useState(null); // null = closed, {} = new notice, notice = edit
  const [deleting, setDeleting] = useState(null);
  const [working, setWorking] = useState(false);

  const handleDelete = async () => {
    setWorking(true);
    try {
      await deleteNotice(deleting.id);
      toast.success('Notice deleted');
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
      render: (n) => (
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status={n.notice_type} />
            <p className="truncate font-semibold text-slate-900">{n.title}</p>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{n.message}</p>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      render: (n) => (
        <div>
          <p className="font-semibold text-slate-800">{n.area}</p>
          <p className="text-xs text-slate-500">{formatNumber(n.customers_reached)} customer(s)</p>
        </div>
      ),
    },
    {
      key: 'starts_at',
      header: 'When',
      render: (n) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800">{formatDateTime(n.starts_at)}</p>
          <p className="text-slate-500">to {formatDateTime(n.ends_at)}</p>
        </div>
      ),
    },
    { key: 'state', header: 'Status', render: (n) => <StatusBadge status={n.state} /> },
    {
      key: 'actions',
      header: '',
      render: (n) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(n)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" icon="trash" onClick={() => setDeleting(n)} aria-label={`Delete ${n.title}`} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Power notices"
        subtitle="Tell customers about power cuts and maintenance work in their area."
        actions={
          <Button variant="accent" icon="plus" onClick={() => setEditing({})}>
            Post a notice
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
            emptyIcon="megaphone"
            emptyTitle="No notices yet"
            emptyText="Post a notice before planned work, so customers know in advance."
          />
        )}
      </Card>

      {editing && (
        <NoticeForm
          key={editing.id || 'new'}
          notice={editing.id ? editing : null}
          areas={areas || []}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            toast.success(editing.id ? 'Notice saved' : `Notice posted to ${formatNumber(saved.customers_reached)} customer(s)`);
            setEditing(null);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this notice?"
        message={deleting && `"${deleting.title}" disappears from the customers' dashboards.`}
        confirmLabel="Delete"
        loading={working}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useToast from '../../../hooks/useToast';
import { addRequestComment, getRequest, getStaff, updateRequestStatus } from '../../../api/requests';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import InfoRow from '../../../components/common/InfoRow';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import FormError from '../../../components/common/FormError';
import RequestTimeline from '../../../components/common/RequestTimeline';
import RequestProgress from '../../../components/common/RequestProgress';
import { PageSkeleton } from '../../../components/common/Skeleton';
import { Field, Select, Textarea } from '../../../components/common/FormField';
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from '../../../utils/options';
import { formatDateTime } from '../../../utils/format';

/** Feature 13: admin sees a request, changes its status, assigns staff, adds notes. */
export default function RequestDetails() {
  const { id } = useParams();
  const toast = useToast();
  const { data: request, loading, error, reload, setData } = useFetch(() => getRequest(id), [id]);
  const staff = useFetch(getStaff);

  const [form, setForm] = useState({ status: '', priority: '', assigned_to: '', resolution_notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Fill the form when the request loads or its saved values change
  // (adding a comment does not reset what you are typing in the form)
  const savedKey = request ? `${request.id}|${request.updated_at}` : '';
  useEffect(() => {
    if (!request) return;
    setForm({
      status: request.status,
      priority: request.priority,
      assigned_to: request.assigned_to || '',
      resolution_notes: request.resolution_notes || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  if (loading && !request) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const saveStatus = async (event) => {
    event.preventDefault();
    setFormError('');
    if (form.status === 'Resolved' && !form.resolution_notes.trim()) {
      setFormError('Please write a short resolution note before resolving.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateRequestStatus(id, form);
      setData(updated);
      toast.success(`Request is now ${updated.status}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      const updated = await addRequestComment(id, comment);
      setData(updated);
      setComment('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCommenting(false);
    }
  };

  const staffOptions = (staff.data || []).map((s) => ({ value: s.id, label: s.full_name }));

  return (
    <div className="space-y-6">
      <PageHeader
        back="/admin/requests"
        title={`${request.request_number} · ${request.category}`}
        subtitle={`Received ${formatDateTime(request.created_at)}`}
        actions={
          <>
            <StatusBadge status={request.priority} />
            <StatusBadge status={request.status} />
          </>
        }
      />

      <Card title="Progress" className="animate-fade-up">
        <RequestProgress status={request.status} size="lg" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Conversation" className="animate-fade-up" style={{ animationDelay: '60ms' }}>
            <RequestTimeline request={request} />
            <form onSubmit={sendComment} className="mt-6 flex gap-3">
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a note for this request..."
              />
              <Button
                type="submit"
                variant="primary"
                icon="send"
                loading={commenting}
                disabled={!comment.trim()}
                className="self-end"
              >
                Add
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Update request" className="animate-fade-up" style={{ animationDelay: '120ms' }}>
            <form onSubmit={saveStatus} className="space-y-4" noValidate>
              <Field label="Status">
                <Select value={form.status} onChange={set('status')} options={REQUEST_STATUSES} />
              </Field>
              <Field label="Priority">
                <Select value={form.priority} onChange={set('priority')} options={REQUEST_PRIORITIES} />
              </Field>
              <Field label="Assigned to">
                <Select value={form.assigned_to} onChange={set('assigned_to')} options={staffOptions} placeholder="Nobody" />
              </Field>
              <Field label="Resolution notes" hint={form.status === 'Resolved' ? 'Required when resolving' : undefined}>
                <Textarea
                  rows={3}
                  value={form.resolution_notes}
                  onChange={set('resolution_notes')}
                  placeholder="What was done?"
                />
              </Field>
              <FormError message={formError} />
              <Button type="submit" variant="accent" icon="check" loading={saving} className="w-full">
                Save changes
              </Button>
            </form>
          </Card>

          <Card title="Customer" className="animate-fade-up" style={{ animationDelay: '180ms' }}>
            <InfoRow icon="user" label="Name">
              <Link to={`/admin/customers/${request.customer_id}`} className="text-sky-600 hover:underline">
                {request.customer_name}
              </Link>
            </InfoRow>
            <InfoRow icon="key" label="Customer ID">
              {request.customer_number}
            </InfoRow>
            <InfoRow icon="phone" label="Phone">
              {request.customer_phone}
            </InfoRow>
            <InfoRow icon="mapPin" label="Address">
              {request.customer_address}
            </InfoRow>
            {request.resolved_at && (
              <InfoRow icon="check" label="Resolved">
                {formatDateTime(request.resolved_at)}
              </InfoRow>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import useToast from '../../../hooks/useToast';
import { downloadSupportFile, getSupportTicket, updateSupportTicket } from '../../../api/support';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import InfoRow from '../../../components/common/InfoRow';
import StatusBadge from '../../../components/common/StatusBadge';
import FormError from '../../../components/common/FormError';
import ErrorState from '../../../components/common/ErrorState';
import { PageSkeleton } from '../../../components/common/Skeleton';
import { Field, Input, Select, Textarea } from '../../../components/common/FormField';
import { SUPPORT_CATEGORIES } from '../../../utils/options';
import { formatDateTime, formatNumber } from '../../../utils/format';

/**
 * Admin: one support problem.
 * Edit the problem (fix the subject or category), approve it (In Progress), write a reply
 * and mark it solved: the reply is emailed to the sender automatically.
 */
export default function SupportDetails() {
  const { id } = useParams();
  const { data: ticket, loading, error, reload, setData } = useFetch(() => getSupportTicket(id), [id]);

  if (loading && !ticket) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  // key: after a save the form starts again from the saved ticket
  return <TicketPage key={ticket.updated_at} ticket={ticket} onSaved={setData} />;
}

function TicketPage({ ticket, onSaved }) {
  const id = ticket.id;
  const toast = useToast();
  const [form, setForm] = useState({
    category: ticket.category,
    subject: ticket.subject,
    message: ticket.message,
    admin_reply: ticket.admin_reply || '',
  });
  const [saving, setSaving] = useState(''); // which button is busy
  const [formError, setFormError] = useState('');

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const solved = ticket.status === 'Solved';

  const save = async (status, button) => {
    setFormError('');
    if (status === 'Solved' && !form.admin_reply.trim()) {
      setFormError('Write a reply for the customer first. It is emailed to them when you mark the problem solved.');
      return;
    }
    setSaving(button);
    try {
      const saved = await updateSupportTicket(id, { ...form, status });
      onSaved(saved);
      if (status === 'Solved' && !solved) {
        toast.success(saved.email_sent ? `Solved. The reply was emailed to ${saved.email}` : 'Solved, but the email could not be sent');
      } else {
        toast.success(status === 'In Progress' && ticket.status === 'Open' ? 'Approved: now in progress' : 'Changes saved');
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving('');
    }
  };

  const download = async () => {
    try {
      const blob = await downloadSupportFile(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = ticket.attachment_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        back="/admin/support"
        title={`Support ${ticket.ticket_number}`}
        subtitle={`Received ${formatDateTime(ticket.verified_at)}`}
        actions={<StatusBadge status={ticket.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="animate-fade-up lg:col-span-2" title="The problem" subtitle="You can fix the wording or the category">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={form.category} onChange={set('category')} options={SUPPORT_CATEGORIES} disabled={solved} />
            </Field>
            <Field label="Subject">
              <Input value={form.subject} onChange={set('subject')} maxLength={150} disabled={solved} />
            </Field>
            <Field label="Problem" className="sm:col-span-2">
              <Textarea rows={6} value={form.message} onChange={set('message')} maxLength={3000} disabled={solved} />
            </Field>
          </div>
          {ticket.attachment_name && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand-50 px-4 py-3 ring-1 ring-sand-200">
              <p className="min-w-0 text-sm">
                <span className="block truncate font-bold text-sand-800">{ticket.attachment_name}</span>
                <span className="text-xs text-sand-500">{formatNumber(Math.ceil(ticket.attachment_size / 1024))} KB attached</span>
              </p>
              <Button variant="secondary" size="sm" icon="file" onClick={download}>
                Download file
              </Button>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="animate-fade-up" title="From" style={{ animationDelay: '60ms' }}>
            <InfoRow icon="user" label="Name">
              {ticket.name}
            </InfoRow>
            <InfoRow icon="mail" label="Email (confirmed with a code)">
              <a href={`mailto:${ticket.email}`} className="text-orange-700 hover:underline">
                {ticket.email}
              </a>
            </InfoRow>
            {solved && (
              <InfoRow icon="check" label="Solved">
                {formatDateTime(ticket.solved_at)} by {ticket.solved_by_name || 'an admin'}
              </InfoRow>
            )}
          </Card>

          <Card className="animate-fade-up" title="Reply" subtitle="Emailed to the sender when you mark it solved" style={{ animationDelay: '120ms' }}>
            <Textarea
              rows={5}
              value={form.admin_reply}
              onChange={set('admin_reply')}
              maxLength={3000}
              disabled={solved}
              placeholder="What did you do to solve it?"
            />
            <div className="mt-4 space-y-3">
              <FormError message={formError} />
              {solved ? (
                <p className="text-sm text-sand-600">This problem is solved and the reply was emailed.</p>
              ) : (
                <>
                  <Button
                    variant="success"
                    icon="check"
                    className="w-full"
                    loading={saving === 'solve'}
                    onClick={() => save('Solved', 'solve')}
                  >
                    Mark solved and email reply
                  </Button>
                  {ticket.status === 'Open' ? (
                    <Button
                      variant="accent"
                      icon="refresh"
                      className="w-full"
                      loading={saving === 'approve'}
                      onClick={() => save('In Progress', 'approve')}
                    >
                      Approve and start working
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    icon="edit"
                    className="w-full"
                    loading={saving === 'save'}
                    onClick={() => save(ticket.status, 'save')}
                  >
                    Save changes
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

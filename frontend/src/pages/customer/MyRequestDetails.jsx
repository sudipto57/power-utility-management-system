import { useState } from 'react';
import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import useToast from '../../hooks/useToast';
import { addMyRequestComment, getMyRequest } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Textarea } from '../../components/common/FormField';
import StatusBadge from '../../components/common/StatusBadge';
import InfoRow from '../../components/common/InfoRow';
import ErrorState from '../../components/common/ErrorState';
import RequestTimeline from '../../components/common/RequestTimeline';
import RequestProgress from '../../components/common/RequestProgress';
import { PageSkeleton } from '../../components/common/Skeleton';
import { formatDateTime } from '../../utils/format';

export default function MyRequestDetails() {
  const { id } = useParams();
  const toast = useToast();
  const { data: r, loading, error, reload, setData } = useFetch(() => getMyRequest(id), [id]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  if (loading && !r) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const isOpen = r.status === 'Pending' || r.status === 'In Progress'; // replies only while the office is working on it

  const sendReply = async (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      setData(await addMyRequestComment(id, reply));
      setReply('');
      toast.success('Message sent to the office');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        back="/my/requests"
        title={`${r.request_number} · ${r.category}`}
        subtitle={`Sent ${formatDateTime(r.created_at)}`}
        actions={
          <>
            <StatusBadge status={r.priority} />
            <StatusBadge status={r.status} />
          </>
        }
      />
      <Card title="Progress" className="animate-fade-up">
        <RequestProgress status={r.status} size="lg" />
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Updates" className="animate-fade-up lg:col-span-2">
          <RequestTimeline request={r} />
          {isOpen ? (
            <form onSubmit={sendReply} className="mt-6 flex gap-3">
              <Textarea
                rows={2}
                maxLength={2000}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Answer the office or add more details..."
                aria-label="Your message"
              />
              <Button type="submit" variant="accent" icon="send" loading={sending} disabled={!reply.trim()} className="self-end">
                Send
              </Button>
            </form>
          ) : (
            <p className="mt-6 rounded-xl bg-sand-100 px-4 py-3 text-xs font-semibold text-sand-500">
              This request is {r.status.toLowerCase()}. Still need help? Send a new request.
            </p>
          )}
        </Card>
        <Card title="Details" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          <InfoRow icon="info" label="Status">
            <StatusBadge status={r.status} />
          </InfoRow>
          <InfoRow icon="user" label="Handled by">
            {r.assigned_to_name || 'Not assigned yet'}
          </InfoRow>
          {r.resolution_notes && (
            <InfoRow icon="check" label="Resolution">
              {r.resolution_notes}
            </InfoRow>
          )}
          {r.resolved_at && (
            <InfoRow icon="calendar" label="Resolved on">
              {formatDateTime(r.resolved_at)}
            </InfoRow>
          )}
        </Card>
      </div>
    </div>
  );
}

import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getMyRequest } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import InfoRow from '../../components/common/InfoRow';
import ErrorState from '../../components/common/ErrorState';
import RequestTimeline from '../../components/common/RequestTimeline';
import { PageSkeleton } from '../../components/common/Skeleton';
import { formatDateTime } from '../../utils/format';

export default function MyRequestDetails() {
  const { id } = useParams();
  const { data: r, loading, error, reload } = useFetch(() => getMyRequest(id), [id]);

  if (loading && !r) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

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
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Updates" className="animate-fade-up lg:col-span-2">
          <RequestTimeline request={r} />
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

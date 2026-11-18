import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { getMyRequests } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import RequestProgress from '../../components/common/RequestProgress';
import { PageSkeleton } from '../../components/common/Skeleton';
import { timeAgo } from '../../utils/format';

export default function MyRequests() {
  const { data, loading, error, reload } = useFetch(getMyRequests);

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title="My service requests"
        subtitle="Problems and requests you have sent to the utility."
        actions={
          <Button variant="accent" icon="plus" to="/my/requests/new">
            New request
          </Button>
        }
      />

      {data.length === 0 ? (
        <Card>
          <EmptyState
            icon="complaint"
            title="No requests yet"
            text="If something is wrong with your power, meter or bill, tell us here."
            action={
              <Button variant="accent" icon="plus" to="/my/requests/new">
                Send a request
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((r, index) => {
            return (
              <Link
                key={r.id}
                to={`/my/requests/${r.id}`}
                className="group animate-fade-up rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-lg"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-slate-400">{r.request_number}</p>
                    <p className="mt-1 font-bold text-slate-900">{r.category}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.description}</p>

                {/* Progress bar: Pending -> In Progress -> Resolved */}
                <div className="mt-5">
                  <RequestProgress status={r.status} />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Sent {timeAgo(r.created_at)} · {r.comments_count} update(s)
                  </span>
                  <Icon name="chevronRight" className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

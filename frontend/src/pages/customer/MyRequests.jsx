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
import { PageSkeleton } from '../../components/common/Skeleton';
import { timeAgo } from '../../utils/format';

// Progress steps shown on each request card
const STEPS = ['Pending', 'In Progress', 'Resolved'];

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
            const step = r.status === 'Cancelled' ? -1 : STEPS.indexOf(r.status);
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
                {step >= 0 && (
                  <div className="mt-5 flex items-center gap-2">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          {i <= step && (
                            <div
                              className="h-full origin-left animate-grow rounded-full bg-amber-400"
                              style={{ animationDelay: `${i * 150}ms` }}
                            />
                          )}
                        </div>
                        <p className={`mt-1.5 text-[11px] font-semibold ${i <= step ? 'text-slate-700' : 'text-slate-400'}`}>
                          {s}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

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

import Icon from './Icon';
import { formatDateTime, timeAgo } from '../../utils/format';

/** Conversation-style list of comments on a service request. */
export default function RequestTimeline({ request }) {
  const items = [
    {
      id: 'created',
      who: request.customer_name,
      role: 'customer',
      text: request.description,
      at: request.created_at,
      first: true,
    },
    ...request.comments.map((c) => ({ id: c.id, who: c.user_name, role: c.user_role, text: c.comment, at: c.created_at })),
  ];

  return (
    <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
      {items.map((item, index) => (
        <li key={item.id} className="relative animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
          <span
            className={`absolute -left-[35px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white ${
              item.role === 'admin' ? 'bg-slate-900 text-amber-300' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Icon name={item.first ? 'complaint' : item.role === 'admin' ? 'bolt' : 'user'} className="h-3.5 w-3.5" />
          </span>
          <div
            className={`rounded-2xl p-4 ${item.role === 'admin' ? 'bg-slate-50 ring-1 ring-slate-200/70' : 'bg-amber-50/70 ring-1 ring-amber-100'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">
                {item.who}
                <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {item.first ? 'opened the request' : item.role === 'admin' ? 'staff' : 'customer'}
                </span>
              </p>
              <time className="text-xs text-slate-400" title={formatDateTime(item.at)}>
                {timeAgo(item.at)}
              </time>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

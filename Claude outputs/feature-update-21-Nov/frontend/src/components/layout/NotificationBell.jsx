import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

/**
 * Bell with a red count. Clicking it opens the list (built by hooks/useNotifications.js).
 * items = [{ id, icon, tone, title, text, to, time?, unread? }]
 * count = the red number; openItem(item) runs when an item is clicked; readAll = "Mark all as read" (customers)
 */
export default function NotificationBell({ items = [], count = 0, openItem, readAll }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Close the list when the user clicks somewhere else (clicking an item closes it too)
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const isInbox = items.some((item) => 'unread' in item); // customers: the inbox keeps read messages too

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-orange-600 hover:ring-orange-300"
        aria-label={`Notifications (${count})`}
      >
        <Icon name="bell" className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-60" />
            <span className="relative">{count > 9 ? '9+' : count}</span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-display text-sm font-extrabold text-slate-900">{isInbox ? 'Inbox' : 'Notifications'}</p>
            {readAll ? (
              <button type="button" onClick={readAll} className="text-[11px] font-extrabold text-orange-600 hover:underline">
                Mark all as read
              </button>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{count} new</span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl">✨</p>
              <p className="mt-2 text-sm font-bold text-slate-700">You are all caught up</p>
              <p className="text-xs text-slate-500">
                {isInbox ? 'New bills, payments and replies will show here.' : 'Nothing needs your attention right now.'}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    onClick={() => {
                      openItem?.(item);
                      setOpen(false);
                    }}
                    className={`flex items-start gap-3 px-4 py-3 transition hover:bg-orange-50/60 ${item.unread ? 'bg-orange-50/40' : ''}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm text-slate-800 ${item.unread === false ? 'font-semibold' : 'font-bold'}`}
                      >
                        {item.title}
                      </span>
                      <span className="line-clamp-2 block text-xs text-slate-500">{item.text}</span>
                      {item.time && <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">{item.time}</span>}
                    </span>
                    {item.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-label="Unread" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

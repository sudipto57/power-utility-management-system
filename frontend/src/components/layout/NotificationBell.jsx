import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

/**
 * Bell with a red count. Clicking it opens the list (built by hooks/useNotifications.js).
 * items = [{ id, icon, tone, title, text, to, time?, unread? }]
 * count = the red number; openItem(item) runs when an item is clicked (it then disappears from the list);
 * readAll = "Mark all as read" (empties the list); isInbox = true for customers (their inbox)
 */
export default function NotificationBell({ items = [], count = 0, openItem, readAll, isInbox = false }) {
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


  return (
    <div ref={boxRef} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-sand-600 shadow-sm ring-1 ring-sand-200 transition hover:text-orange-600 hover:ring-orange-300"
        aria-label={`Notifications (${count})`}
      >
        <Icon name="bell" className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-dusk px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        // Phones: the list is as wide as the screen, just under the top bar. Bigger screens: under the bell.
        <div className="absolute inset-x-3 top-full z-40 mt-2 animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-sand-200 sm:inset-x-auto sm:right-0 sm:top-12 sm:mt-0 sm:w-80">
          <div className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
            <p className="font-display text-sm font-extrabold text-sand-900">{isInbox ? 'Inbox' : 'Notifications'}</p>
            {readAll ? (
              <button type="button" onClick={readAll} className="text-[11px] font-extrabold text-orange-700 hover:underline">
                Mark all as read
              </button>
            ) : (
              <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-sand-500">{count} new</span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <p className="mt-2 text-sm font-bold text-sand-700">You are all caught up</p>
              <p className="text-xs text-sand-500">
                {isInbox ? 'New bills, payments and replies will show here.' : 'Nothing needs your attention right now.'}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-sand-100 overflow-y-auto">
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
                        className={`block truncate text-sm text-sand-800 ${item.unread === false ? 'font-semibold' : 'font-bold'}`}
                      >
                        {item.title}
                      </span>
                      <span className="line-clamp-2 block text-xs text-sand-500">{item.text}</span>
                      {item.time && <span className="mt-0.5 block text-[11px] font-semibold text-sand-500">{item.time}</span>}
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

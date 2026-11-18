import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

/**
 * Bell with a red count. Clicking it opens a list of things that need attention.
 * items = [{ id, icon, tone, title, text, to }]   (built by hooks/useNotifications.js)
 */
export default function NotificationBell({ items = [] }) {
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

  const count = items.length;

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
            <p className="font-display text-sm font-extrabold text-slate-900">Notifications</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{count} new</span>
          </div>
          {count === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl">✨</p>
              <p className="mt-2 text-sm font-bold text-slate-700">You are all caught up</p>
              <p className="text-xs text-slate-500">Nothing needs your attention right now.</p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-orange-50/60"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800">{item.title}</span>
                      <span className="block truncate text-xs text-slate-500">{item.text}</span>
                    </span>
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

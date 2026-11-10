import { useState } from 'react';
import Icon from '../common/Icon';
import { initials } from '../../utils/format';

const DATE_TEXT = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Top bar: menu button (phones), greeting, user chip and logout. */
export default function Topbar({ user, onMenu, onLogout }) {
  const [now] = useState(() => new Date()); // read the clock once
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.full_name || '').split(' ')[0];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md print:hidden">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {greeting}, {firstName}
          </p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{DATE_TEXT.format(now)}</p>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-100/80 py-1 pl-1 pr-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-amber-300">
            {initials(user?.full_name)}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-bold text-slate-800">{user?.full_name}</p>
            <p className="text-[11px] capitalize text-slate-500">{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Icon name="logout" className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}

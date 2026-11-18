import Icon from '../common/Icon';
import NotificationBell from './NotificationBell';
import ThemeToggle from '../common/ThemeToggle';
import useNow from '../../hooks/useNow';
import { dayPartFor } from '../../utils/time';
import { firstName, initials } from '../../utils/format';

const DATE_TEXT = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const TIME_TEXT = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Role chip colours (same as the login page switch)
const ROLE_STYLE = {
  admin: 'from-indigo-500 via-violet-500 to-fuchsia-500',
  customer: 'from-amber-400 via-orange-500 to-rose-500',
};

/** Top bar: menu button (phones), greeting, live clock, notifications, user chip and logout. */
export default function Topbar({ user, notifications, onMenu, onLogout }) {
  const now = useNow(1000); // live clock, ticks every second
  // Uses the same live clock, so the greeting changes by itself (at 5 AM, 12 PM, 5 PM and 9 PM)
  const greeting = dayPartFor(now.getHours());
  const name = firstName(user?.full_name);
  const gradient = ROLE_STYLE[user?.role] || ROLE_STYLE.customer;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/75 backdrop-blur-lg print:hidden">
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
          <p className="truncate font-display text-base font-extrabold text-slate-900">
            {greeting.greeting}, <span className="text-brand">{name}</span>{' '}
            <span className="inline-block animate-float">{greeting.emoji}</span>
          </p>
          <p className="hidden truncate text-xs font-semibold text-slate-500 sm:block">{DATE_TEXT.format(now)}</p>
        </div>
        {/* Live clock chip (hidden on small phones) */}
        <div className="hidden items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-extrabold tabular-nums text-white shadow-md md:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <Icon name="clock" className="h-3.5 w-3.5 text-amber-300" />
          {TIME_TEXT.format(now)}
        </div>
        <ThemeToggle />
        <NotificationBell items={notifications} />
        <div className="flex items-center gap-3 rounded-full bg-white py-1 pl-1 pr-1 shadow-sm ring-1 ring-slate-200 sm:pr-3">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-extrabold text-white shadow-md`}
          >
            {initials(user?.full_name)}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-extrabold text-slate-800">{user?.full_name}</p>
            <p className={`bg-gradient-to-r ${gradient} bg-clip-text text-[11px] font-extrabold capitalize text-transparent`}>{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Icon name="logout" className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}

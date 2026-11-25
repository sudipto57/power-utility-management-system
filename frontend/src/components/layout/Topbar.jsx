import Icon from '../common/Icon';
import NotificationBell from './NotificationBell';
import ThemeToggle from '../common/ThemeToggle';
import LiveClock from '../common/LiveClock';
import useNow from '../../hooks/useNow';
import { dayPartFor } from '../../utils/time';
import { firstName, initials } from '../../utils/format';

// Role chip colours (same as the login page switch; deep shades behind the white initials)
const ROLE_STYLE = {
  admin: 'from-indigo-600 via-violet-600 to-fuchsia-600',
  customer: 'from-ember via-flame to-dusk',
};

/**
 * Top bar: menu button (phones), greeting, live clock, notifications, user chip and logout.
 * Greeting on two lines: "Good afternoon," then the name (admins: the full name, customers: the first name).
 * On phones the live clock gets its own thin row under the bar.
 */
export default function Topbar({ user, notifications, onMenu, onLogout }) {
  const now = useNow(60000); // the greeting changes by itself (at 5 AM, 12 PM, 5 PM and 9 PM)
  const greeting = dayPartFor(now.getHours());
  const name = user?.role === 'admin' ? user?.full_name : firstName(user?.full_name);
  const gradient = ROLE_STYLE[user?.role] || ROLE_STYLE.customer;

  return (
    <header className="sticky top-0 z-20 border-b border-sand-200/70 bg-white/75 backdrop-blur-lg print:hidden">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-sand-600 hover:bg-sand-100 lg:hidden"
          aria-label="Open menu"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-sand-600 sm:text-sm">
            <Icon name={greeting.icon} className="h-4 w-4 shrink-0 text-amber-500" />
            {greeting.greeting},
          </p>
          <p className="truncate font-display text-sm font-extrabold sm:text-base">
            <span className="text-brand">{name}</span>
          </p>
        </div>
        {/* Live clock chip (computers and tablets; phones get the row below) */}
        <div className="hidden items-center gap-2 rounded-full bg-sand-900 px-3 py-1.5 text-xs font-extrabold text-white shadow-md md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="lg:hidden">
            <LiveClock withDate={false} iconClassName="text-amber-300" />
          </span>
          <span className="hidden lg:inline">
            <LiveClock iconClassName="text-amber-300" />
          </span>
        </div>
        <ThemeToggle />
        <NotificationBell {...notifications} />
        {/* User chip (hidden on phones: the greeting already shows the name) */}
        <div className="hidden items-center gap-3 rounded-full bg-white py-1 pl-1 pr-3 shadow-sm ring-1 ring-sand-200 sm:flex">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-extrabold text-white shadow-md`}
          >
            {initials(user?.full_name)}
          </span>
          <div className="leading-tight">
            <p className="text-xs font-extrabold text-sand-800">{user?.full_name}</p>
            <p className="text-[11px] font-bold capitalize text-sand-500">{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-sand-600 transition sm:px-3 hover:bg-rose-50 hover:text-rose-600"
        >
          <Icon name="logout" className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
      {/* Phones: the live clock with today's date */}
      <div className="flex h-8 items-center justify-center border-t border-sand-200/70 text-xs font-bold text-sand-600 md:hidden">
        <LiveClock iconClassName="text-orange-600" />
      </div>
    </header>
  );
}

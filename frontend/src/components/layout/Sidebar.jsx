import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';
import Logo from '../common/Logo';

// Same colours as the Customer / Admin switch on the login page (deep shades, so the white label is easy to read)
const ACTIVE = {
  customer: 'bg-gradient-to-r from-ember via-flame to-dusk shadow-orange-500/30',
  admin: 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-violet-500/30',
};

// Menu background: warm near-black for customers, with a touch of indigo night for admins
const PANEL = {
  customer: 'from-sand-950 via-sand-900 to-sand-800',
  admin: 'from-sand-950 via-sand-900 to-indigo-950',
};

/**
 * Left menu. `items` = [{ to, label, icon, end }]   `role` = 'admin' | 'customer'
 * On small screens it slides in when `open` is true.
 */
export default function Sidebar({ items, open, onClose, roleLabel, role = 'customer' }) {
  return (
    <>
      {/* Dark overlay behind the menu on phones */}
      <div
        className={`fixed inset-0 z-30 bg-sand-900/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col overflow-hidden bg-gradient-to-b ${PANEL[role] || PANEL.customer} px-4 pb-5 pt-6 transition-transform duration-300 print:hidden lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Animated "power line" decoration */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-40"
          viewBox="0 0 272 160"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 120 C 60 80, 120 150, 180 100 S 272 60, 272 60"
            stroke="#f97316"
            strokeWidth="1.5"
            strokeDasharray="6 10"
            className="animate-flow"
          />
          <path
            d="M0 145 C 70 110, 140 160, 200 125 S 272 95, 272 95"
            stroke="#c084fc"
            strokeWidth="1"
            strokeDasharray="4 12"
            className="animate-flow"
          />
        </svg>

        <div className="relative flex items-center justify-between px-2">
          <Logo light />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-sand-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <p className="relative mb-2 mt-8 flex items-center gap-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sand-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {roleLabel}
        </p>
        <nav className="relative flex-1 space-y-1.5 overflow-y-auto">
          {items.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              style={{ animationDelay: `${index * 40}ms` }}
              className={({ isActive }) =>
                `group relative flex animate-fade-up items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? `${ACTIVE[role] || ACTIVE.customer} text-white shadow-lg`
                    : 'text-sand-400 hover:translate-x-1 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      isActive ? 'bg-white/25 text-white' : 'bg-white/5 text-sand-400 group-hover:text-orange-300'
                    }`}
                  >
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  {item.label}
                  {isActive && <Icon name="chevronRight" className="ml-auto h-4 w-4 opacity-80" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Copyright: always one line, bold Sora font */}
        <p className="relative mt-4 whitespace-nowrap border-t border-white/10 pt-4 text-center font-display text-[10px] font-extrabold tracking-tight text-sand-300">
          <span className="text-amber-400">©</span> 2026{' '}
          <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-400 bg-clip-text text-transparent">
            Sparkility
          </span>
        </p>
      </aside>
    </>
  );
}

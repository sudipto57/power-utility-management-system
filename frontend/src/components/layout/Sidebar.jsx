import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';
import Logo from '../common/Logo';

/**
 * Left menu. `items` = [{ to, label, icon, end }]
 * On small screens it slides in when `open` is true.
 */
export default function Sidebar({ items, open, onClose, roleLabel }) {
  return (
    <>
      {/* Dark overlay behind the menu on phones */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col bg-slate-950 px-4 pb-5 pt-6 transition-transform duration-300 print:hidden lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Animated "power line" decoration */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-30"
          viewBox="0 0 272 160"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 120 C 60 80, 120 150, 180 100 S 272 60, 272 60"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="6 10"
            className="animate-flow"
          />
          <path
            d="M0 145 C 70 110, 140 160, 200 125 S 272 95, 272 95"
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="4 12"
            className="animate-flow"
          />
        </svg>

        <div className="flex items-center justify-between px-2">
          <Logo light />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 mt-8 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{roleLabel}</p>
        <nav className="relative flex-1 space-y-1 overflow-y-auto">
          {items.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              style={{ animationDelay: `${index * 40}ms` }}
              className={({ isActive }) =>
                `group relative flex animate-fade-up items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:translate-x-1 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-amber-400 transition-all duration-300 ${
                      isActive ? 'opacity-100' : 'scale-y-0 opacity-0'
                    }`}
                  />
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      isActive ? 'bg-amber-400 text-slate-900' : 'bg-white/5 text-slate-400 group-hover:text-amber-300'
                    }`}
                  >
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

/** App logo: a glowing lightning bolt + name. */
export default function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 shadow-lg shadow-orange-500/30">
        <span className="absolute inset-0 animate-glow rounded-xl bg-amber-300/40 blur-md print:hidden" />
        <svg viewBox="0 0 24 24" className="relative h-5 w-5 text-white" fill="currentColor" aria-hidden="true">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className={`font-display text-sm font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
            Power Utility
          </p>
          <p className={`text-[11px] font-semibold ${light ? 'text-slate-400' : 'text-slate-500'}`}>Management System</p>
        </div>
      )}
    </div>
  );
}

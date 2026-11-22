/** App logo: a lightning bolt on the sunrise colour + name. */
export default function Logo({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ember via-flame to-dusk shadow-md shadow-orange-500/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden="true">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className={`font-display text-sm font-extrabold tracking-tight ${light ? 'text-white' : 'text-sand-900'}`}>
            Power Utility
          </p>
          <p className={`text-[11px] font-semibold ${light ? 'text-sand-500' : 'text-sand-500'}`}>Management System</p>
        </div>
      )}
    </div>
  );
}

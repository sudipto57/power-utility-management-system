import Logo from './Logo';

/** Full-screen loader shown while the app checks who is logged in. */
export default function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-b from-orange-50 via-white to-rose-50">
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-rose-300/20 blur-3xl" />

      <div className="relative animate-float">
        <Logo />
      </div>

      {/* Current flowing along a little power line */}
      <svg viewBox="0 0 200 20" className="relative h-5 w-48" fill="none" aria-hidden="true">
        <path d="M0 10 H200" stroke="#e9e2d8" strokeWidth="3" strokeLinecap="round" />
        <path d="M0 10 H200" stroke="#f97316" strokeWidth="3" strokeDasharray="10 16" strokeLinecap="round" className="animate-flow" />
      </svg>

      <p className="relative animate-pulse text-sm font-bold text-sand-600">{text}</p>
    </div>
  );
}

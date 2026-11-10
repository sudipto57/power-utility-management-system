import Logo from './Logo';

/** Full-screen loader shown while the app checks who is logged in. */
export default function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="animate-float">
        <Logo compact />
      </div>
      <p className="animate-pulse text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

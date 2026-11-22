import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';
import { homePathFor } from '../utils/routes';

// Drawing: two power towers with a broken cable and a flickering spark between them
function BrokenLine() {
  return (
    <svg viewBox="0 0 360 170" fill="none" className="h-auto w-full max-w-md" aria-hidden="true">
      {[60, 300].map((x) => (
        <g key={x} className="stroke-sand-700" strokeWidth="3" strokeLinejoin="round">
          <path d={`M${x - 22} 165 L${x} 40 L${x + 22} 165`} />
          <path d={`M${x - 32} 56 H${x + 32} M${x - 24} 74 H${x + 24} M${x - 14} 120 H${x + 14}`} />
        </g>
      ))}
      {/* Left half of the cable, with current still flowing */}
      <path d="M28 56 Q 100 96, 160 84" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M28 56 Q 100 96, 160 84" stroke="#f97316" strokeWidth="3" strokeDasharray="6 12" strokeLinecap="round" className="animate-flow" />
      {/* Right half, hanging down: no power here */}
      <path d="M332 56 Q 260 96, 205 120" stroke="#cbd5e1" strokeWidth="2" />
      {/* Spark at the break */}
      <g className="animate-pulse">
        <path d="M168 70 L176 84 L166 86 L178 104" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="172" cy="86" r="16" fill="#fde047" opacity="0.35" />
      </g>
    </svg>
  );
}

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-orange-50 via-white to-violet-50 px-6 text-center">
      {/* Glowing colour blobs */}
      <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" />

      <div className="relative flex w-full flex-col items-center">
        <div className="animate-fade-up">
          <Logo />
        </div>
        <div className="mt-8 w-full max-w-md animate-fade-up" style={{ animationDelay: '80ms' }}>
          <BrokenLine />
        </div>
        <p className="mt-4 animate-fade-up font-display text-7xl font-extrabold tracking-tight text-brand sm:text-8xl" style={{ animationDelay: '140ms' }}>
          404
        </p>
        <h1 className="mt-2 animate-fade-up text-xl font-extrabold text-sand-900 sm:text-2xl" style={{ animationDelay: '200ms' }}>
          Looks like this line is disconnected
        </h1>
        <p className="mt-2 animate-fade-up text-sm font-semibold text-sand-500" style={{ animationDelay: '260ms' }}>
          The page you are looking for does not exist or has moved.
        </p>
        <Button
          variant="accent"
          size="lg"
          icon="arrowLeft"
          to={user ? homePathFor(user) : '/login'}
          className="mt-8 animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          Back to safety
        </Button>
      </div>
    </div>
  );
}

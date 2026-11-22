import Icon from './Icon';

// Little drawing for empty pages: a sleeping electricity meter with floating "z"s
function SleepingMeter() {
  return (
    <svg viewBox="0 0 140 110" className="h-24 w-28" aria-hidden="true">
      {/* z z z */}
      {[
        { x: 98, y: 26, size: 16, delay: '0s' },
        { x: 112, y: 14, size: 12, delay: '0.8s' },
        { x: 124, y: 6, size: 9, delay: '1.6s' },
      ].map((z) => (
        <text
          key={z.x}
          x={z.x}
          y={z.y + 10}
          fontSize={z.size}
          fontWeight="800"
          fill="#fb923c"
          className="animate-float"
          style={{ animationDelay: z.delay, animationDuration: '3s' }}
        >
          z
        </text>
      ))}
      <g className="animate-float" style={{ animationDuration: '5s' }}>
        {/* Meter body */}
        <rect x="22" y="24" width="80" height="70" rx="16" fill="#ffedd5" stroke="#fdba74" strokeWidth="3" />
        {/* Display with closed eyes and a small smile */}
        <rect x="34" y="36" width="56" height="28" rx="7" fill="white" stroke="#fdba74" strokeWidth="2" />
        <path d="M46 49 q4 4 8 0 M70 49 q4 4 8 0" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M58 56 q4 3 8 0" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
        {/* Number wheels */}
        {[40, 54, 68].map((x) => (
          <rect key={x} x={x} y="72" width="10" height="12" rx="2" fill="white" stroke="#fdba74" strokeWidth="1.5" />
        ))}
        {/* Feet */}
        <path d="M38 94 v6 M86 94 v6" stroke="#fdba74" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function EmptyState({ icon = 'search', title = 'Nothing here yet', text, action }) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative">
        <SleepingMeter />
        {/* The page's own icon on a small badge */}
        <span className="absolute -bottom-1 right-0 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ember via-flame to-dusk text-white shadow-md ring-2 ring-white">
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-sm font-extrabold text-sand-800">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-sand-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

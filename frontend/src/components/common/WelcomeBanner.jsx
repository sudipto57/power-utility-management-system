// Big colourful banner at the top of the Admin and Customer dashboards.
// The picture on the right is drawn with SVG (no image file needed) and is animated:
// current flows along the power lines and the house window glows.
// It follows the live clock: a sun by day, sunset colours in the evening, a moon and stars at night.
import useNow from '../../hooks/useNow';
import { dayPartFor } from '../../utils/time';

const BACKGROUND = {
  admin: 'from-indigo-600 via-violet-600 to-fuchsia-600',
  customer: 'from-amber-500 via-orange-500 to-rose-500',
};

// A see-through colour layer on top of the banner for each part of the day
const SKY = {
  morning: 'bg-gradient-to-b from-amber-200/30 via-transparent to-transparent',
  afternoon: 'bg-transparent',
  evening: 'bg-gradient-to-br from-transparent via-rose-500/30 to-purple-900/50',
  night: 'bg-gradient-to-b from-indigo-950/85 via-indigo-900/65 to-violet-900/45',
};

// Star positions (x %, y %) used at night
const STARS = [
  [8, 18], [18, 62], [27, 12], [36, 40], [44, 8], [52, 70], [58, 22], [66, 54], [73, 10], [81, 36], [88, 64], [94, 16],
];

function Sky({ part }) {
  if (part === 'night') {
    // Crescent moon + soft glow
    return (
      <g className="animate-float">
        <circle cx="356" cy="46" r="34" fill="#e0e7ff" opacity="0.12" />
        <path d="M360 22 A24 24 0 0 0 360 70 A12 24 0 0 1 360 22 Z" fill="#fef9c3" />
      </g>
    );
  }
  if (part === 'evening') {
    // Big orange sun going down behind the hills
    return (
      <g className="animate-float">
        <circle cx="360" cy="118" r="40" fill="#fb923c" opacity="0.25" />
        <circle cx="360" cy="118" r="26" fill="#fdba74" />
      </g>
    );
  }
  // Morning sun sits lower, the afternoon sun is high
  const y = part === 'morning' ? 70 : 42;
  return (
    <g className="animate-float">
      <circle cx="360" cy={y} r="34" fill="#fde047" opacity="0.2" />
      <circle cx="360" cy={y} r="22" fill="#fde047" opacity="0.95" />
    </g>
  );
}

function PowerScene({ part }) {
  const towers = [70, 210];
  const isNight = part === 'night';
  return (
    <svg viewBox="0 0 420 210" fill="none" className="h-full w-full" aria-hidden="true">
      <Sky part={part} />

      {/* Ground */}
      <path d="M0 200 H420" stroke="white" strokeOpacity="0.35" strokeWidth="2" />

      {/* Two transmission towers */}
      {towers.map((x) => (
        <g key={x} stroke="white" strokeOpacity="0.85" strokeWidth="2.5" strokeLinejoin="round">
          <path d={`M${x - 24} 200 L${x} 62 L${x + 24} 200`} />
          <path d={`M${x - 16} 150 L${x + 16} 150 M${x - 10} 110 L${x + 10} 110`} />
          <path d={`M${x - 14} 150 L${x + 9} 110 M${x + 14} 150 L${x - 9} 110`} strokeOpacity="0.5" />
          <path d={`M${x - 34} 78 H${x + 34} M${x - 26} 96 H${x + 26}`} />
        </g>
      ))}

      {/* Power lines: a faint cable + yellow "current" flowing along it */}
      {[
        'M-10 70 Q 35 92, 36 78 M36 78 Q 140 104, 244 78 M244 78 Q 300 96, 330 132',
        'M-10 88 Q 40 108, 44 96 M44 96 Q 140 120, 236 96 M236 96 Q 290 114, 322 140',
      ].map((d, i) => (
        <g key={d}>
          <path d={d} stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
          <path
            d={d}
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 14"
            className="animate-flow"
            style={{ animationDuration: i ? '2.8s' : '2s' }}
          />
        </g>
      ))}

      {/* House: the window light is on in the evening and at night */}
      <g>
        <path d="M300 200 V150 L340 122 L380 150 V200 Z" fill="white" fillOpacity="0.95" />
        <path d="M292 154 L340 116 L388 154" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect
          x="314"
          y="160"
          width="20"
          height="18"
          rx="3"
          fill={isNight || part === 'evening' ? '#fde047' : '#bae6fd'}
          className={isNight || part === 'evening' ? 'animate-pulse' : ''}
        />
        <rect x="346" y="168" width="18" height="32" rx="3" fill="#1e293b" fillOpacity="0.25" />
      </g>
    </svg>
  );
}

/**
 * <WelcomeBanner role="admin" eyebrow="Admin panel" title="Dashboard" subtitle="..." actions={<Button/>}>
 *   optional small chips (children) under the subtitle
 * </WelcomeBanner>
 */
export default function WelcomeBanner({ role = 'customer', eyebrow, title, subtitle, actions, children }) {
  const now = useNow(60000); // check the time once a minute
  const part = dayPartFor(now.getHours()).key;

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-3xl p-7 text-white shadow-xl sm:p-8">
      {/* Moving gradient background */}
      <div
        className={`absolute inset-0 animate-gradient bg-gradient-to-br ${BACKGROUND[role] || BACKGROUND.customer} bg-[length:200%_200%]`}
      />
      {/* Day / evening / night colour layer */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${SKY[part]}`} />
      {/* Twinkling stars at night */}
      {part === 'night' &&
        STARS.map(([x, y], i) => (
          <span
            key={i}
            className="absolute h-1 w-1 animate-twinkle rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 0.5}s` }}
          />
        ))}
      {/* Soft light blobs + dotted pattern */}
      <div className="absolute -left-10 -top-20 h-64 w-64 animate-glow rounded-full bg-white/20 blur-3xl" />
      <div
        className="absolute bottom-0 right-1/3 h-48 w-48 animate-glow rounded-full bg-yellow-200/20 blur-3xl"
        style={{ animationDelay: '1s' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.15)_1px,transparent_1px)] bg-[size:18px_18px]" />

      {/* Animated picture (hidden on small phones) */}
      <div className="pointer-events-none absolute bottom-0 right-2 hidden h-[88%] w-[42%] max-w-md md:block">
        <PowerScene part={part} />
      </div>

      <div className="relative max-w-xl">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest ring-1 ring-white/30 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-300" />
            {eyebrow}
          </span>
        )}
        <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm font-semibold text-white/85 sm:text-base">{subtitle}</p>}
        {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/** Small see-through chip for the banner, e.g. <BannerChip>৳5,000 due</BannerChip> */
export function BannerChip({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 backdrop-blur">
      {children}
    </span>
  );
}

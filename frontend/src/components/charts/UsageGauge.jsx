import { useEffect, useState } from 'react';
import { formatNumber } from '../../utils/format';

// kWh limits for the three colours (change them here if the team wants other limits)
const LOW = 200; // up to 200 kWh  -> green
const HIGH = 400; // up to 400 kWh -> amber, above -> red
const MAX = 600; // the right end of the dial

function levelFor(units) {
  if (units <= LOW) return { label: 'Low use', color: '#009e73', text: 'text-emerald-600' };
  if (units <= HIGH) return { label: 'Medium use', color: '#e69f00', text: 'text-amber-600' };
  return { label: 'High use', color: '#d55e00', text: 'text-rose-600' };
}

/** Half-circle dial. The needle swings from 0 to `units` when the page opens. */
export default function UsageGauge({ units = 0 }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const level = levelFor(units);
  const percent = ready ? Math.min(units, MAX) / MAX : 0; // 0 = left end, 1 = right end
  const angle = -90 + percent * 180; // needle angle in degrees

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-full max-w-xs" role="img" aria-label={`${units} kWh, ${level.label}`}>
        {/* Grey track */}
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" className="stroke-sand-100" strokeWidth="16" strokeLinecap="round" />
        {/* Coloured arc that grows to the value (pathLength=100 makes it a simple percentage) */}
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={level.color}
          strokeWidth="16"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - percent * 100}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
        {/* Small marks at 0, LOW, HIGH and MAX */}
        {[0, LOW, HIGH, MAX].map((mark) => {
          const a = Math.PI - (mark / MAX) * Math.PI;
          return (
            <text
              key={mark}
              x={100 + Math.cos(a) * 62}
              y={100 - Math.sin(a) * 62 + 4}
              textAnchor="middle"
              className="fill-sand-400 text-[8px] font-bold"
            >
              {mark}
            </text>
          );
        })}
        {/* Needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          <path d="M97 100 L100 34 L103 100 Z" className="fill-sand-900" />
        </g>
        {/* Classes (not fixed colours) so the needle follows light / dark mode */}
        <circle cx="100" cy="100" r="8" className="fill-sand-900" />
        <circle cx="100" cy="100" r="3" className="fill-white" />
      </svg>
      <p className="-mt-1 font-display text-3xl font-extrabold tracking-tight text-sand-900">
        {formatNumber(units)} <span className="text-base font-bold text-sand-500">kWh</span>
      </p>
      <p className={`text-sm font-extrabold ${level.text}`}>{level.label}</p>
    </div>
  );
}

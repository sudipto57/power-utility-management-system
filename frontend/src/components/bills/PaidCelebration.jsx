import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const COLORS = ['#f59e0b', '#f97316', '#f43f5e', '#8b5cf6', '#0ea5e9', '#10b981'];

// 24 confetti pieces flying out in a circle (fixed list, so it looks the same every time)
const PIECES = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const distance = 120 + (i % 4) * 30;
  return {
    x: `${Math.round(Math.cos(angle) * distance)}px`,
    y: `${Math.round(Math.sin(angle) * distance)}px`,
    r: `${(i % 2 ? 1 : -1) * (180 + i * 15)}deg`,
    color: COLORS[i % COLORS.length],
    delay: `${(i % 6) * 40}ms`,
  };
});

/**
 * Shown for a moment after a bill is marked as paid:
 * a green tick draws itself and small confetti bursts out. Click anywhere to close it early.
 */
export default function PaidCelebration({ billNumber, onDone }) {
  // Close by itself after 2.4 seconds
  useEffect(() => {
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [onDone]);

  // Shown straight in <body> so it always covers the whole screen
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sand-900/20 backdrop-blur-[2px] print:hidden" onClick={onDone}>
      <div className="relative flex animate-scale-in flex-col items-center rounded-3xl bg-white px-10 py-8 shadow-2xl">
        {/* Confetti */}
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-16 h-2.5 w-1.5 animate-confetti rounded-sm"
            style={{ backgroundColor: p.color, '--x': p.x, '--y': p.y, '--r': p.r, animationDelay: p.delay }}
          />
        ))}

        {/* Green circle + tick that draws itself */}
        <svg viewBox="0 0 52 52" className="h-20 w-20" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="#ecfdf5" stroke="#10b981" strokeWidth="3" />
          <path
            d="M15 27 L23 35 L38 18"
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="40"
            strokeDashoffset="40"
            className="animate-draw"
          />
        </svg>
        <p className="mt-4 font-display text-xl font-extrabold text-sand-900">Payment recorded</p>
        <p className="mt-1 text-sm font-semibold text-sand-500">{billNumber} is now Paid</p>
      </div>
    </div>,
    document.body
  );
}

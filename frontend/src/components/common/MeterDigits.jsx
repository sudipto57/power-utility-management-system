import { useEffect, useState } from 'react';

// Box sizes for the two places we use it
const SIZES = {
  md: { box: 'h-10 w-8 text-lg', row: 'h-10' }, // Connection details
  sm: { box: 'h-8 w-6 text-base', row: 'h-8' }, // My profile cards
};
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Meter reading that rolls up like a real electricity meter, e.g. 0 0 2 7 5 0.
 * Each box holds the numbers 0-9 in a column; the column slides up to the right digit.
 */
export default function MeterDigits({ value, digits = 6, size = 'md' }) {
  const [rolled, setRolled] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const text = String(Math.max(0, Math.round(Number(value) || 0))).padStart(digits, '0');

  // Start rolling a moment after the page appears
  useEffect(() => {
    const timer = setTimeout(() => setRolled(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex gap-1" role="img" aria-label={`${value ?? 0} kWh`}>
      {text.split('').map((digit, i) => (
        <span key={i} className={`relative overflow-hidden rounded-md bg-white/10 font-mono font-bold ring-1 ring-white/10 ${s.box}`}>
          <span
            className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-[1400ms] ease-out"
            style={{
              // move up by one number per step: digit 7 -> 70 % of the column (10 numbers)
              transform: `translateY(-${rolled ? Number(digit) * 10 : 0}%)`,
              transitionDelay: `${i * 90}ms`,
            }}
          >
            {NUMBERS.map((n) => (
              <span key={n} className={`flex items-center justify-center ${s.row}`}>
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}

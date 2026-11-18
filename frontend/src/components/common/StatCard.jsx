import Icon from './Icon';
import useCountUp from '../../hooks/useCountUp';
import { formatMoneyShort, formatNumber } from '../../utils/format';

// Each colour: gradient icon chip + soft glow + bottom line
const TONES = {
  amber: { chip: 'from-amber-400 to-orange-500 shadow-orange-200', glow: 'from-amber-200/70', line: 'from-amber-400 to-orange-500' },
  sky: { chip: 'from-sky-400 to-blue-500 shadow-sky-200', glow: 'from-sky-200/70', line: 'from-sky-400 to-blue-500' },
  emerald: { chip: 'from-emerald-400 to-teal-500 shadow-emerald-200', glow: 'from-emerald-200/70', line: 'from-emerald-400 to-teal-500' },
  rose: { chip: 'from-rose-400 to-pink-600 shadow-rose-200', glow: 'from-rose-200/70', line: 'from-rose-400 to-pink-600' },
  violet: { chip: 'from-violet-500 to-fuchsia-500 shadow-violet-200', glow: 'from-violet-200/70', line: 'from-violet-500 to-fuchsia-500' },
};

/** Big animated number with an icon. format: 'number' | 'money' */
export default function StatCard({ label, value, icon = 'bolt', tone = 'amber', format = 'number', hint, delay = 0 }) {
  const animated = useCountUp(value);
  const colors = TONES[tone] || TONES.amber;
  const shown = format === 'money' ? formatMoneyShort(animated) : formatNumber(Math.round(animated));

  return (
    <div
      className="shine group relative animate-fade-up overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${colors.glow} to-transparent blur-2xl transition duration-500 group-hover:scale-125`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
          <p
            className={`mt-2 truncate font-display font-extrabold tracking-tight text-slate-900 ${format === 'money' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}
            title={shown}
          >
            {shown}
          </p>
          {hint && <p className="mt-1 truncate text-xs font-semibold text-slate-500">{hint}</p>}
        </div>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${colors.chip} text-white shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      {/* Coloured line that grows in along the bottom */}
      <span
        className={`absolute inset-x-0 bottom-0 h-1 origin-left animate-grow bg-gradient-to-r ${colors.line}`}
        style={{ animationDelay: `${delay + 200}ms` }}
      />
    </div>
  );
}

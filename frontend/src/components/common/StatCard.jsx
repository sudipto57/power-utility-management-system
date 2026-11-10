import Icon from './Icon';
import useCountUp from '../../hooks/useCountUp';
import { formatMoneyShort, formatNumber } from '../../utils/format';

const TONES = {
  amber: { chip: 'bg-amber-100 text-amber-600', glow: 'from-amber-200/60' },
  sky: { chip: 'bg-sky-100 text-sky-600', glow: 'from-sky-200/60' },
  emerald: { chip: 'bg-emerald-100 text-emerald-600', glow: 'from-emerald-200/60' },
  rose: { chip: 'bg-rose-100 text-rose-600', glow: 'from-rose-200/60' },
  violet: { chip: 'bg-violet-100 text-violet-600', glow: 'from-violet-200/60' },
};

/** Big animated number with an icon. format: 'number' | 'money' */
export default function StatCard({ label, value, icon = 'bolt', tone = 'amber', format = 'number', hint, delay = 0 }) {
  const animated = useCountUp(value);
  const colors = TONES[tone] || TONES.amber;
  const shown = format === 'money' ? formatMoneyShort(animated) : formatNumber(Math.round(animated));

  return (
    <div
      className="group relative animate-fade-up overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/80"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${colors.glow} to-transparent blur-2xl transition duration-500 group-hover:scale-125`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p
            className={`mt-2 truncate font-extrabold tracking-tight text-slate-900 ${format === 'money' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}
            title={shown}
          >
            {shown}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors.chip} transition duration-300 group-hover:rotate-6 group-hover:scale-110`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

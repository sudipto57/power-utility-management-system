// Shared Tailwind class strings, so every button and input looks the same.

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]';

const BUTTON_VARIANTS = {
  primary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md',
  accent: 'bg-amber-400 text-slate-900 shadow-sm shadow-amber-200 hover:bg-amber-300 hover:shadow-md',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
};

export function buttonClass(variant = 'primary', size = 'md', extra = '') {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary} ${BUTTON_SIZES[size] || BUTTON_SIZES.md} ${extra}`.trim();
}

export const inputClass =
  'block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-1 ring-slate-200 ' +
  'placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-amber-400 ' +
  'disabled:bg-slate-50 disabled:text-slate-500';

export const cardClass = 'rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70';

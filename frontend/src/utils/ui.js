// Shared Tailwind class strings, so every button and input looks the same.

// "shine" = the light sweep on hover (defined in index.css)
const BUTTON_BASE =
  'shine inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 ' +
  'hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 active:scale-[0.98]';

const BUTTON_VARIANTS = {
  primary: 'bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-md shadow-slate-300 hover:shadow-lg dark:ring-1 dark:ring-white/20',
  accent:
    'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300',
  secondary: 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-slate-900 hover:ring-orange-300',
  success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200 hover:shadow-lg',
  danger: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-200 hover:shadow-lg',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  // See-through white button, for use on top of a colourful banner
  glass: 'bg-white/20 text-white ring-1 ring-white/40 backdrop-blur hover:bg-white/30',
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
  'block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 ' +
  'placeholder:font-medium placeholder:text-slate-400 transition hover:ring-slate-300 ' +
  'focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-500';

export const cardClass =
  'rounded-3xl bg-white/90 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/70 backdrop-blur transition-shadow duration-300 hover:shadow-lg hover:shadow-slate-200/80';

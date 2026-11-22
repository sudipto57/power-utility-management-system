// Shared Tailwind class strings, so every button and input looks the same.

// "shine" = the light sweep on hover (defined in index.css)
// ring-focus = the orange keyboard focus ring (a lighter orange in dark mode)
const BUTTON_BASE =
  'shine inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-[transform,box-shadow,background-color,color] duration-200 ' +
  'hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 active:scale-[0.98]';

// White text only sits on deep colours (ember, flame, dusk, leaf), so every label is easy to read
const BUTTON_VARIANTS = {
  primary: 'bg-gradient-to-r from-sand-900 to-sand-700 text-white shadow-md shadow-sand-300 hover:shadow-lg dark:ring-1 dark:ring-white/20',
  accent:
    'bg-gradient-to-r from-ember via-flame to-dusk text-white shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300',
  secondary: 'bg-white text-sand-700 shadow-sm ring-1 ring-sand-300 hover:text-sand-900 hover:ring-orange-400',
  success: 'bg-leaf text-white shadow-md shadow-emerald-200 hover:shadow-lg',
  danger: 'bg-dusk text-white shadow-md shadow-rose-200 hover:shadow-lg',
  ghost: 'text-sand-600 hover:bg-sand-100 hover:text-sand-900',
  // See-through white button, for use on top of a colourful banner
  glass: 'bg-white/20 text-white ring-1 ring-white/40 hover:bg-white/30',
};

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
};

export function buttonClass(variant = 'primary', size = 'md', extra = '') {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary} ${BUTTON_SIZES[size] || BUTTON_SIZES.md} ${extra}`.trim();
}

// The field border is sand-500, dark enough to see (3:1), so people can find every box
export const inputClass =
  'block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm font-semibold text-sand-800 shadow-sm ring-1 ring-sand-500 ' +
  'placeholder:font-medium placeholder:text-sand-500 transition-shadow hover:ring-sand-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-focus disabled:bg-sand-50 disabled:text-sand-500';

// Solid white cards (no see-through), so text stays sharp over the background glows and in sunlight
export const cardClass =
  'rounded-3xl bg-white shadow-sm shadow-sand-200/70 ring-1 ring-sand-200 transition-shadow duration-300 hover:shadow-lg hover:shadow-sand-200/80';

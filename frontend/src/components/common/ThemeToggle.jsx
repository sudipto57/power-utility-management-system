import Icon from './Icon';
import useTheme from '../../hooks/useTheme';

/** Round sun / moon button that switches between light and dark mode. */
export default function ThemeToggle() {
  const { dark, toggle } = useTheme();
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-orange-500 hover:ring-orange-300"
    >
      {/* key = which icon, so the new icon plays a small pop-in animation */}
      <Icon key={dark ? 'sun' : 'moon'} name={dark ? 'sun' : 'moon'} className={`h-5 w-5 animate-scale-in ${dark ? 'text-amber-400' : ''}`} />
    </button>
  );
}

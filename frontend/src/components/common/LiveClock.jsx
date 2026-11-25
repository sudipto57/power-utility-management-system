import Icon from './Icon';
import useNow from '../../hooks/useNow';

const DATE_TEXT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const TIME_TEXT = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * The live clock (it ticks every second): "Wed, 25 Nov 2026 · 01:35:12 AM".
 * withDate = false shows only the time. Used on the first page and in the top bar.
 * iconClassName = the colour of the small clock icon
 */
export default function LiveClock({ withDate = true, className = '', iconClassName = '' }) {
  const now = useNow(1000);
  return (
    <time dateTime={now.toISOString()} className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
      <Icon name="clock" className={`h-3.5 w-3.5 shrink-0 ${iconClassName}`} />
      {withDate && <span>{DATE_TEXT.format(now)}</span>}
      {withDate && <span aria-hidden="true">·</span>}
      <span>{TIME_TEXT.format(now)}</span>
    </time>
  );
}

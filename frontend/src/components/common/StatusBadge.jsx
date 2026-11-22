import Icon from './Icon';

// Coloured pill for any status / priority / type value.
const STYLES = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Inactive: 'bg-sand-100 text-sand-600 ring-sand-200',
  Disconnected: 'bg-rose-50 text-rose-700 ring-rose-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Unpaid: 'bg-amber-50 text-amber-700 ring-amber-200',
  'Partially Paid': 'bg-sky-50 text-sky-700 ring-sky-200',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  'In Progress': 'bg-sky-50 text-sky-700 ring-sky-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-sand-100 text-sand-600 ring-sand-200',
  Verified: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Failed: 'bg-rose-50 text-rose-700 ring-rose-200',
  // outage notices (state from the view current_outage_notices)
  'Happening now': 'bg-rose-50 text-rose-700 ring-rose-200',
  Planned: 'bg-amber-50 text-amber-700 ring-amber-200',
  Low: 'bg-sand-100 text-sand-600 ring-sand-200',
  Medium: 'bg-sky-50 text-sky-700 ring-sky-200',
  High: 'bg-amber-50 text-amber-700 ring-amber-200',
  Critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  Residential: 'bg-violet-50 text-violet-700 ring-violet-200',
  Commercial: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
};

// A small icon next to the word, so the meaning never depends on colour alone
// (done = tick, waiting = clock, in progress = arrows, problem = warning, stopped = cross)
const ICONS = {
  Active: 'check',
  Paid: 'check',
  Resolved: 'check',
  Verified: 'check',
  Approved: 'check',
  Completed: 'check',
  Unpaid: 'clock',
  Pending: 'clock',
  Planned: 'clock',
  'Partially Paid': 'refresh',
  'In Progress': 'refresh',
  Overdue: 'alert',
  Critical: 'alert',
  'Happening now': 'alert',
  Disconnected: 'x',
  Rejected: 'x',
  Failed: 'x',
  Cancelled: 'x',
};

// Types and priorities (Residential, Low, High ...) keep a small coloured dot
const DOTS = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  sand: 'bg-sand-500',
  violet: 'bg-violet-500',
  indigo: 'bg-indigo-500',
};

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const style = STYLES[status] || 'bg-sand-100 text-sand-600 ring-sand-200';
  const color = style.match(/bg-(\w+)-/)?.[1] || 'sand';
  const icon = ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${style} ${className}`}
    >
      {icon ? (
        <Icon name={icon} className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${DOTS[color]}`} />
      )}
      {status}
    </span>
  );
}

// Coloured pill for any status / priority / type value.
const STYLES = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  Disconnected: 'bg-rose-50 text-rose-700 ring-rose-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Unpaid: 'bg-amber-50 text-amber-700 ring-amber-200',
  'Partially Paid': 'bg-sky-50 text-sky-700 ring-sky-200',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  'In Progress': 'bg-sky-50 text-sky-700 ring-sky-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  Verified: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Failed: 'bg-rose-50 text-rose-700 ring-rose-200',
  // outage notices (state from the view current_outage_notices)
  'Happening now': 'bg-rose-50 text-rose-700 ring-rose-200',
  Planned: 'bg-amber-50 text-amber-700 ring-amber-200',
  Low: 'bg-slate-100 text-slate-600 ring-slate-200',
  Medium: 'bg-sky-50 text-sky-700 ring-sky-200',
  High: 'bg-amber-50 text-amber-700 ring-amber-200',
  Critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  Residential: 'bg-violet-50 text-violet-700 ring-violet-200',
  Commercial: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
};

const DOTS = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
  violet: 'bg-violet-500',
  indigo: 'bg-indigo-500',
};

// These statuses still need attention, so their dot gently pulses
const LIVE = ['Pending', 'In Progress', 'Overdue', 'Critical', 'Happening now'];

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const style = STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-200';
  const color = style.match(/bg-(\w+)-/)?.[1] || 'slate';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${style} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {LIVE.includes(status) && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${DOTS[color]}`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${DOTS[color]}`} />
      </span>
      {status}
    </span>
  );
}

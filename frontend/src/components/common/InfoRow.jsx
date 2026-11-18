import Icon from './Icon';

/** Label/value line used on profile and detail pages. */
export default function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
          <Icon name={icon} className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-0.5 break-words text-sm font-bold text-slate-800">{children || '-'}</div>
      </div>
    </div>
  );
}

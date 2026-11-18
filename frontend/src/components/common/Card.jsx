import { cardClass } from '../../utils/ui';

/** White rounded box. Optional title + actions on the right. */
export default function Card({ title, subtitle, actions, className = '', bodyClassName = 'p-5', children, style }) {
  return (
    <section className={`${cardClass} ${className}`} style={style}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-2.5">
            {/* Small gradient bar next to every card title */}
            {title && <span className="mt-0.5 h-4 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-amber-400 to-rose-500" />}
            <div>
              {title && <h2 className="text-[15px] font-extrabold text-slate-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

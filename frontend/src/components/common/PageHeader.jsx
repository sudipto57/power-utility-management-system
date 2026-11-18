import { Link } from 'react-router-dom';
import Icon from './Icon';

/** Title row at the top of every page. `back` = link for the small back arrow. */
export default function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-7 flex animate-fade-up flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            to={back}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:-translate-x-0.5 hover:text-orange-600 print:hidden"
          >
            <Icon name="arrowLeft" className="h-3.5 w-3.5" /> Back
          </Link>
        )}
        <h1 className="truncate text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h1>
        {/* Animated gradient underline */}
        <span className="mt-2 block h-1 w-14 origin-left animate-grow rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500" />
        {subtitle && <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  );
}

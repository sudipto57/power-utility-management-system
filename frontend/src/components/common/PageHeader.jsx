import { Link } from 'react-router-dom';
import Icon from './Icon';

/** Title row at the top of every page. `back` = link for the small back arrow. */
export default function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex animate-fade-up flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            to={back}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900 print:hidden"
          >
            <Icon name="arrowLeft" className="h-3.5 w-3.5" /> Back
          </Link>
        )}
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  );
}

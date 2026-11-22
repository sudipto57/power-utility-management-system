import Icon from './Icon';
import Button from './Button';

/** Shown when loading data failed. */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center rounded-2xl bg-rose-50/60 px-6 py-12 text-center ring-1 ring-rose-100">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display text-base font-extrabold text-sand-900">Could not load this page</p>
      <p className="mt-1 max-w-md text-sm font-semibold text-sand-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon="refresh" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

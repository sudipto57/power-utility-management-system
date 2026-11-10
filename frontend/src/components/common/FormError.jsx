import Icon from './Icon';

/** Red message box above a form's buttons. */
export default function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="flex animate-fade-in items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

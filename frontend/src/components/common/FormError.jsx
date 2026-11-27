import Icon from './Icon';

const TONES = {
  error: 'bg-rose-50 text-rose-700 ring-rose-100', // something went wrong
  warning: 'bg-amber-50 text-amber-900 ring-amber-200', // not wrong, but do something else
};

/** Message box above a form's buttons: red (error) or yellow (tone="warning"). */
export default function FormError({ message, tone = 'error', children }) {
  if (!message) return null;
  return (
    <div className={`flex animate-fade-in items-start gap-2.5 rounded-xl px-4 py-3 text-sm ring-1 ${TONES[tone]}`} role="alert">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}

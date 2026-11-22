import Icon from './Icon';

// The three steps of a service request, each with its own colour
const STEPS = [
  { status: 'Pending', bar: 'bg-amber-400', dot: 'bg-amber-500' },
  { status: 'In Progress', bar: 'bg-sky-500', dot: 'bg-sky-500' },
  { status: 'Resolved', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
];

/**
 * Progress bar for a service request: Pending -> In Progress -> Resolved.
 * The parts fill one after another. size: 'sm' (request cards) | 'lg' (request pages)
 */
export default function RequestProgress({ status, size = 'sm' }) {
  if (status === 'Cancelled') {
    return (
      <p className="flex items-center gap-2 text-xs font-bold text-sand-500">
        <Icon name="x" className="h-4 w-4" /> This request was cancelled.
      </p>
    );
  }

  const current = STEPS.findIndex((step) => step.status === status);
  const big = size === 'lg';

  return (
    <div className="flex gap-2">
      {STEPS.map((step, i) => (
        <div key={step.status} className="flex-1">
          <div className={`overflow-hidden rounded-full bg-sand-100 ${big ? 'h-3' : 'h-1.5'}`}>
            {i <= current && (
              <div
                className={`h-full origin-left animate-grow rounded-full ${step.bar}`}
                style={{ animationDelay: `${i * 350}ms` }} // one part after the other
              />
            )}
          </div>
          <p
            className={`mt-1.5 flex items-center gap-1.5 font-bold ${big ? 'text-xs' : 'text-[11px]'} ${
              i <= current ? 'text-sand-800' : 'text-sand-500'
            }`}
          >
            {i < current && <Icon name="check" className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />}
            {i === current && <span className={`h-2 w-2 rounded-full ${step.dot}`} />}
            {step.status}
          </p>
        </div>
      ))}
    </div>
  );
}

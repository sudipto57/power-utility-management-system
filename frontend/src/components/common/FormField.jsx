import { inputClass } from '../../utils/ui';

/** Label + input + small help/error text. */
export function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ options = [], placeholder, className = '', ...props }) {
  return (
    <select className={`${inputClass} cursor-pointer ${className}`} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) =>
        typeof option === 'string' ? (
          <option key={option} value={option}>
            {option}
          </option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )
      )}
    </select>
  );
}

export function Textarea({ className = '', rows = 4, ...props }) {
  return <textarea rows={rows} className={`${inputClass} resize-y ${className}`} {...props} />;
}

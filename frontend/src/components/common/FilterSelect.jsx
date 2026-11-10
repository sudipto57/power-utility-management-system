import { inputClass } from '../../utils/ui';

// Same look as other inputs, but only as wide as its text (not full width)
const selectClass = inputClass.replace('block w-full ', '');

/** Dropdown filter. The first option ("All ...") means no filter. */
export default function FilterSelect({ value, onChange, options, allLabel = 'All', className = '' }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${selectClass} w-auto min-w-40 cursor-pointer pr-8 ${className}`}
      aria-label={allLabel}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

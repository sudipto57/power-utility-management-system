import Icon from './Icon';

/**
 * A small checklist under a form field: a green tick for each rule that is met.
 * rules = [{ label, ok }] (from utils/accountRules.js)
 */
export default function RuleList({ rules, className = '' }) {
  return (
    <ul className={`mt-2 space-y-1 ${className}`}>
      {rules.map((rule) => (
        <li key={rule.label} className={`flex items-start gap-1.5 text-xs ${rule.ok ? 'text-emerald-700' : 'text-sand-500'}`}>
          <Icon name={rule.ok ? 'check' : 'x'} className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.6} />
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}

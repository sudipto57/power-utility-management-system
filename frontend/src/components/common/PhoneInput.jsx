import useFetch from '../../hooks/useFetch';
import { BANGLADESH, loadCountries } from '../../utils/phone';
import { inputClass } from '../../utils/ui';
import Icon from './Icon';

/**
 * Country code box + phone number box, side by side.
 * <PhoneInput country="BD" number="1712345678" onChange={({ country, number }) => ...} />
 *
 * The country box shows the code (+880) with the country name under it. The real <select>
 * lies invisibly on top of that box, so a click still opens the normal country list.
 */
export default function PhoneInput({ country, number, onChange, id }) {
  const { data } = useFetch(loadCountries, []);
  const countries = data || [BANGLADESH];
  const info = countries.find((c) => c.code === country) || BANGLADESH;

  return (
    <div className="flex gap-2">
      <div
        className="relative w-40 shrink-0 rounded-xl bg-white shadow-sm ring-1 ring-sand-500 transition-shadow hover:ring-sand-600 focus-within:ring-2 focus-within:ring-focus sm:w-44"
        title={`${info.name} (+${info.dial})`}
      >
        {/* What you see */}
        <div className="flex h-full items-center gap-2 py-1.5 pl-3 pr-2" aria-hidden="true">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-extrabold text-sand-900">+{info.dial}</p>
            <p className="line-clamp-2 text-[11px] font-semibold text-sand-600">{info.name}</p>
          </div>
          <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-sand-500" />
        </div>
        {/* The real list (invisible, covers the whole box) */}
        <select
          value={info.code}
          onChange={(event) => onChange({ country: event.target.value, number })}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Country code"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {`${c.name} (+${c.dial})`}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0 flex-1">
        <input
          id={id}
          value={number}
          onChange={(event) => onChange({ country, number: event.target.value })}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={info.example ? `e.g. ${info.example}` : `${info.min} digits`}
          className={`${inputClass} h-full`}
          aria-label="Phone number"
        />
      </div>
    </div>
  );
}

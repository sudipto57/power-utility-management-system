import useFetch from '../../hooks/useFetch';
import { BANGLADESH, loadCountries } from '../../utils/phone';
import { inputClass } from '../../utils/ui';


/**
 * Country code box + phone number box.
 * <PhoneInput country="BD" number="1712345678" onChange={({ country, number }) => ...} />
 */
export default function PhoneInput({ country, number, onChange, id }) {
  const { data } = useFetch(loadCountries, []);
  const countries = data || [BANGLADESH];
  const info = countries.find((c) => c.code === country) || BANGLADESH;

  return (
    <div className="flex gap-2">
      <div className="w-32 shrink-0">
        <select
          value={country}
          onChange={(event) => onChange({ country: event.target.value, number })}
          className={`${inputClass} cursor-pointer px-2.5`}
          aria-label="Country code"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {`+${c.dial} ${c.name}`}
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
          className={inputClass}
          aria-label="Phone number"
        />
      </div>
    </div>
  );
}

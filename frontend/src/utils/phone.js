// Phone numbers with a country code (+880 1712-345678). Used by components/common/PhoneInput.jsx.
// The backend checks the same rules again (backend/src/utils/countries.js).
import { getCountries } from '../api/auth';

// The list comes from the backend once (backend/src/utils/countries.js) and is kept for the whole visit
let savedCountries = null;
export const loadCountries = async () => {
  if (!savedCountries) savedCountries = await getCountries();
  return savedCountries;
};
// Bangladesh is always there, even before the list has loaded
export const BANGLADESH = { code: 'BD', name: 'Bangladesh', dial: '880', min: 10, max: 10, example: '1712345678' };

/**
 * Splits a saved number like "+8801712345678" into { country: 'BD', number: '1712345678' }.
 * A number without + is read as Bangladeshi (01712345678).
 */
export function splitPhone(phone, countries = savedCountries || [BANGLADESH]) {
  const text = String(phone || '').replace(/[\s-]/g, '');
  if (!text.startsWith('+')) return { country: 'BD', number: text.replace(/^0+/, '') };
  const match = countries
    .filter((c) => text.slice(1).startsWith(c.dial))
    .sort((a, b) => b.dial.length - a.dial.length || (a.code === 'BD' ? -1 : 1))[0];
  return match ? { country: match.code, number: text.slice(1 + match.dial.length) } : { country: 'BD', number: text };
}

/** Is the number the right length for the country? Returns an error sentence or ''. */
export function phoneProblem(country, number, countries = savedCountries || [BANGLADESH]) {
  const info = countries.find((c) => c.code === country);
  let digits = String(number || '').replace(/[\s\-().]/g, '');
  if (!['IT', 'VA'].includes(country)) digits = digits.replace(/^0+/, ''); // the first 0 is not part of the number
  if (!digits) return 'Please enter your phone number.';
  if (!/^[0-9]+$/.test(digits)) return 'The phone number can only have digits.';
  if (!info) return 'Please choose the country of the phone number.';
  if (country === 'BD' && !/^1[3-9][0-9]{8}$/.test(digits)) return 'Enter a Bangladeshi mobile number: +880 1XXXXXXXXX (013 to 019).';
  if (digits.length < info.min || digits.length > info.max) {
    const size = info.min === info.max ? info.min : `${info.min} to ${info.max}`;
    return `A ${info.name} number has ${size} digits after +${info.dial}.`;
  }
  return '';
}

/**
 * The full number to save: "+880" + "01712-345678" -> "+8801712345678".
 * The first 0 is left out (Italy and the Vatican keep it: it is part of their numbers).
 */
export async function fullPhone(country, number) {
  const info = (await loadCountries()).find((c) => c.code === country) || BANGLADESH;
  let digits = String(number || '').replace(/[\s\-().]/g, '');
  if (!['IT', 'VA'].includes(info.code)) digits = digits.replace(/^0+/, '');
  return `+${info.dial}${digits}`;
}

// Formatting helpers used on every page.

// Bangladeshi Taka. Every amount on every page (and the printed bill) uses this sign.
export const CURRENCY = '৳';

// 'en-IN' groups digits the way Bangladesh does: 1,00,000 (one lakh), 1,00,00,000 (one crore)
const LOCALE = 'en-IN';
const numberFormat = new Intl.NumberFormat(LOCALE);
const moneyFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 1537 -> "৳1,537.00"    308896.4 -> "৳3,08,896.40" */
export function formatMoney(value) {
  const number = Number(value) || 0;
  return `${CURRENCY}${moneyFormat.format(number)}`;
}

/** 48230 -> "48,230"    150000 -> "1,50,000" */
export function formatNumber(value) {
  return numberFormat.format(Number(value) || 0);
}

/** Compact money for stat cards, in lakh and crore: 265350 -> "৳2.65 lakh", 12500000 -> "৳1.25 crore" */
export function formatMoneyShort(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1_00_00_000) return `${CURRENCY}${(number / 1_00_00_000).toFixed(2)} crore`;
  if (Math.abs(number) >= 1_00_000) return `${CURRENCY}${(number / 1_00_000).toFixed(2)} lakh`;
  return formatMoney(number);
}

/** '2026-11-05' -> "05 Nov 2026"  (date-only text from the API, no timezone shifting) */
export function formatDate(value) {
  if (!value) return '-';
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split('-');
  if (!year || !month || !day) return text;
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** ISO timestamp -> "05 Nov 2026, 14:30" in the user's local time */
export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** ISO timestamp -> "5 min ago", "3 days ago" */
export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDateTime(value);
}

/** Today's date as 'YYYY-MM-DD' (this computer's date) */
export function todayISO() {
  return addDaysISO(0);
}

/** Today + n days as 'YYYY-MM-DD' */
export function addDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "Rahim Uddin" -> "RU" */
/** "Md. Rafiqul Islam" -> "Rafiqul" (skips titles like Md., Mst., Mr., Mrs., Dr.) for greetings. */
export function firstName(fullName) {
  const words = String(fullName || '').trim().split(/\s+/);
  const titles = ['md', 'md.', 'mohammad', 'mohammed', 'muhammad', 'mst', 'mst.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'dr', 'dr.'];
  return words.find((word) => !titles.includes(word.toLowerCase())) || words[0] || '';
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

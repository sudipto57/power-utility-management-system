// Formatting helpers used on every page.

// Currency label shown before amounts. The sample data is from Kenya (KES).
// Change this one line (e.g. to 'BDT' or '৳') if you use your own local data.
export const CURRENCY = 'KES';

const numberFormat = new Intl.NumberFormat('en-US');
const moneyFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 1537 -> "KES 1,537.00" */
export function formatMoney(value) {
  const number = Number(value) || 0;
  return `${CURRENCY} ${moneyFormat.format(number)}`;
}

/** 48230 -> "48,230" */
export function formatNumber(value) {
  return numberFormat.format(Number(value) || 0);
}

/** Compact money for stat cards: 265350 -> "KES 265.4K" */
export function formatMoneyShort(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1_000_000) return `${CURRENCY} ${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 10_000) return `${CURRENCY} ${(number / 1000).toFixed(1)}K`;
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

/** "John Kamau" -> "JK" */
export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

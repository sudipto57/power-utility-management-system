// Tiny validation helpers. Each one throws a 400 ApiError with a clear message.
import ApiError from './ApiError.js';
import { checkFullPhone, checkPhone } from './countries.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns a trimmed string, or null if empty. */
export function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

export function requireText(value, label, maxLength = 255) {
  const text = clean(value);
  if (!text) throw new ApiError(400, `${label} is required`);
  if (text.length > maxLength) throw new ApiError(400, `${label} must be at most ${maxLength} characters`);
  return text;
}

export function optionalText(value, label, maxLength = 1000) {
  const text = clean(value);
  if (text && text.length > maxLength) throw new ApiError(400, `${label} must be at most ${maxLength} characters`);
  return text;
}

export function requireOneOf(value, allowed, label) {
  const text = clean(value);
  if (!text || !allowed.includes(text)) {
    throw new ApiError(400, `${label} must be one of: ${allowed.join(', ')}`);
  }
  return text;
}

export function optionalOneOf(value, allowed, label) {
  const text = clean(value);
  if (!text) return null;
  return requireOneOf(text, allowed, label);
}

export function requireUuid(value, label = 'id') {
  const text = clean(value);
  if (!text || !UUID_RE.test(text)) throw new ApiError(400, `Invalid ${label}`);
  return text;
}

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function requireDate(value, label) {
  const text = clean(value);
  if (!text || !DATE_RE.test(text) || !isRealDate(text)) {
    throw new ApiError(400, `${label} must be a date like 2026-11-05`);
  }
  return text;
}

/**
 * True only for a day that exists on the calendar.
 * JavaScript quietly turns "2026-02-30" into 2 March, so we build the date and check
 * that the year, month and day did not change. ("2026-02-30" -> false, "2028-02-29" -> true)
 */
function isRealDate(text) {
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function optionalDate(value, label) {
  return clean(value) ? requireDate(value, label) : null;
}

// ---------------------------------------------------------------------
// Email: the standard rules (jane.doe@company.com, user+tag@example.org, team_123@sub-domain.co.uk)
// ---------------------------------------------------------------------
/** Returns null when the email is fine, or a sentence that says what is wrong. */
export function emailProblem(email) {
  const text = String(email ?? '').trim();
  if (text.length > 254) return 'is too long (254 characters at most)';
  const parts = text.split('@');
  if (parts.length !== 2) return 'needs exactly one @, like jane.doe@company.com';
  const [local, domain] = parts;

  // Before the @: letters, numbers and . _ - +   (no . at the start or end, never ..)
  if (!local || local.length > 64) return 'needs 1 to 64 characters before the @';
  if (!/^[A-Za-z0-9._+-]+$/.test(local)) return 'can only use letters, numbers and . _ - + before the @';
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return 'cannot start or end with a dot, or have two dots together';

  // After the @: words of letters, numbers and - separated by dots, ending with an extension like .com
  if (!domain || domain.length > 255) return 'needs a domain after the @, like company.com';
  const labels = domain.split('.');
  if (labels.length < 2) return 'needs an ending like .com or .org after the @';
  for (const label of labels) {
    if (!label) return 'cannot have two dots together or a dot at the start or end of the domain';
    if (label.length > 63 || !/^[A-Za-z0-9-]+$/.test(label)) return 'can only use letters, numbers and - in the domain';
    if (label.startsWith('-') || label.endsWith('-')) return 'cannot have a - at the start or end of a domain part';
  }
  if (!/^[A-Za-z]{2,}$/.test(labels.at(-1))) return 'needs an ending of at least 2 letters, like .com or .bd';
  return null;
}

export function requireEmail(value, label = 'Email') {
  const text = requireText(value, label, 254).toLowerCase(); // emails are saved in small letters
  const problem = emailProblem(text);
  if (problem) throw new ApiError(400, `${label} ${problem}`);
  return text;
}

export function optionalEmail(value, label = 'Email') {
  return clean(value) ? requireEmail(value, label) : null;
}

// ---------------------------------------------------------------------
// Username: 3-20 characters, a-z 0-9 . _ , starts and ends with a letter or number,
// no ".." or "__", not a system word. Saved in small letters (Admin = admin).
// ---------------------------------------------------------------------
export const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'support', 'api', 'login', 'logout', 'signup', 'system', 'staff', 'help', 'null', 'undefined',
];

export function requireUsername(value) {
  const name = requireText(value, 'Username', 50).toLowerCase();
  if (name.length < 3 || name.length > 20) throw new ApiError(400, 'Username must be 3 to 20 characters');
  if (!/^[a-z0-9._]+$/.test(name)) throw new ApiError(400, 'Username can only use letters, numbers, dots (.) and underscores (_)');
  if (!/^[a-z0-9].*[a-z0-9]$/.test(name)) throw new ApiError(400, 'Username must start and end with a letter or number');
  if (/[._]{2}/.test(name)) throw new ApiError(400, 'Username cannot have two symbols together, like .. or __');
  if (RESERVED_USERNAMES.includes(name)) throw new ApiError(400, `"${name}" is reserved for the system. Please choose another username`);
  return name;
}

// ---------------------------------------------------------------------
// Password for a NEW password (sign up, forgot password, a new login made by an admin)
// ---------------------------------------------------------------------
const COMMON_PASSWORDS = ['password', 'qwerty', 'asdf', 'zxcv', 'letmein', 'welcome', 'iloveyou', 'abc123', 'admin', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'master', 'login', 'passw0rd', 'bangladesh'];

/** True for 4 or more characters in a row like 1234, 4321, abcd or aaaa. */
function hasSimpleSequence(text) {
  const lower = text.toLowerCase();
  for (let i = 0; i + 3 < lower.length; i += 1) {
    const codes = [0, 1, 2, 3].map((k) => lower.charCodeAt(i + k));
    const steps = [codes[1] - codes[0], codes[2] - codes[1], codes[3] - codes[2]];
    const sameStep = steps.every((step) => step === steps[0]);
    if (sameStep && [-1, 0, 1].includes(steps[0]) && /^[a-z0-9]{4}$/.test(lower.slice(i, i + 4))) return true;
  }
  return false;
}

/**
 * Returns the first rule a new password breaks, or null.
 * about = { username, email, fullName, phone }: the password may not contain these personal details.
 */
export function passwordProblem(password, about = {}) {
  const text = String(password ?? '');
  if (text.length < 8) return 'must be at least 8 characters (12 or more is better)';
  if (text.length > 64) return 'must be at most 64 characters';
  // A long passphrase of 3+ words is strong too: "green river paper lamp"
  const isPassphrase = text.length >= 16 && text.trim().split(/[\s-]+/).length >= 3;
  if (!isPassphrase && !(/[a-z]/.test(text) && /[A-Z]/.test(text) && /[0-9]/.test(text) && /[^A-Za-z0-9]/.test(text))) {
    return 'needs a capital letter, a small letter, a number and a symbol (or a passphrase of 3+ words, 16+ characters)';
  }

  const lower = text.toLowerCase();
  const personal = [
    about.username,
    String(about.email || '').split('@')[0],
    ...String(about.fullName || '').split(/\s+/),
  ].map((part) => String(part || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (personal.some((part) => part.length >= 3 && lower.replace(/[^a-z0-9]/g, '').includes(part))) {
    return 'cannot contain your name, username or email';
  }
  const phoneDigits = String(about.phone || '').replace(/\D/g, '').slice(-6);
  if (phoneDigits.length === 6 && text.replace(/\D/g, '').includes(phoneDigits)) return 'cannot contain your phone number';
  if (COMMON_PASSWORDS.some((word) => lower.includes(word))) return 'is too easy to guess (avoid words like password or qwerty)';
  if (hasSimpleSequence(text)) return 'cannot have easy runs like 1234, abcd or aaaa';
  return null;
}

export function requireNewPassword(value, about = {}, label = 'Password') {
  const text = value === undefined || value === null ? '' : String(value);
  if (!text) throw new ApiError(400, `${label} is required`);
  const problem = passwordProblem(text, about);
  if (problem) throw new ApiError(400, `${label} ${problem}`);
  return text;
}

// ---------------------------------------------------------------------
// Phone: saved with the country calling code, like +8801712345678 (rules in utils/countries.js)
// ---------------------------------------------------------------------
/** A full number like +8801712345678 (a number without + is read as Bangladeshi: 01712345678). */
export function requirePhone(value, label = 'Phone') {
  const text = requireText(value, label, 20);
  const result = checkFullPhone(text);
  if (!result.ok) throw new ApiError(400, `${label}: ${result.message}`);
  return result.phone;
}

/** Country (BD, IN ...) + the number typed after the country code. */
export function requirePhoneFor(country, number, label = 'Phone') {
  requireText(number, label, 20);
  const result = checkPhone(country, number);
  if (!result.ok) throw new ApiError(400, `${label}: ${result.message}`);
  return result.phone;
}

// The biggest number a PostgreSQL INTEGER column can hold (meter readings are INTEGER)
const MAX_INTEGER = 2147483647;

export function requireWholeNumber(value, label, { min = 0, max = MAX_INTEGER } = {}) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isInteger(num) || num < min) {
    throw new ApiError(400, `${label} must be a whole number of at least ${min}`);
  }
  if (num > max) throw new ApiError(400, `${label} must be at most ${max}`);
  return num;
}

/** Today's date as 'YYYY-MM-DD' (server local time). */
export function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

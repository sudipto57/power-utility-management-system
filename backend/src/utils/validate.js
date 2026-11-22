// Tiny validation helpers. Each one throws a 400 ApiError with a clear message.
import ApiError from './ApiError.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (!text || !DATE_RE.test(text) || Number.isNaN(Date.parse(text))) {
    throw new ApiError(400, `${label} must be a date like 2026-11-05`);
  }
  return text;
}

export function optionalDate(value, label) {
  return clean(value) ? requireDate(value, label) : null;
}

export function requireEmail(value, label = 'Email') {
  const text = requireText(value, label, 255).toLowerCase();
  if (!EMAIL_RE.test(text)) throw new ApiError(400, `${label} is not a valid email address`);
  return text;
}

export function optionalEmail(value, label = 'Email') {
  return clean(value) ? requireEmail(value, label) : null;
}

/**
 * A strong password: 8+ characters with at least one letter and one number.
 * (Used for new passwords: sign up and forgot password.)
 */
export function requirePassword(value, label = 'Password') {
  const text = value === undefined || value === null ? '' : String(value);
  if (!text) throw new ApiError(400, `${label} is required`);
  if (text.length < 8 || text.length > 100 || !/[A-Za-z]/.test(text) || !/[0-9]/.test(text)) {
    throw new ApiError(400, `${label} must be 8-100 characters with at least one letter and one number`);
  }
  return text;
}

/** A phone number like 01712345678 or +8801712345678 (10-15 digits; spaces and dashes are fine). */
export function requirePhone(value, label = 'Phone') {
  const text = requireText(value, label, 20);
  const digits = text.replace(/\D/g, '');
  if (!/^\+?[0-9 -]+$/.test(text) || digits.length < 10 || digits.length > 15) {
    throw new ApiError(400, `${label} must be a phone number like 01712345678`);
  }
  // Bangladeshi mobile numbers are saved in one format: 01712345678 -> +8801712345678
  if (/^(88)?01[0-9]{9}$/.test(digits)) return `+88${digits.slice(-11)}`;
  return text;
}

export function requireWholeNumber(value, label, { min = 0 } = {}) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isInteger(num) || num < min) {
    throw new ApiError(400, `${label} must be a whole number of at least ${min}`);
  }
  return num;
}

/** Today's date as 'YYYY-MM-DD' (server local time). */
export function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

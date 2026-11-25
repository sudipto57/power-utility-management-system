// The username, email and password rules, checked while the person types.
// The backend checks the very same rules again (backend/src/utils/validate.js), so these lists only
// show what is still missing; they are not the real security check.

const RESERVED = ['admin', 'administrator', 'root', 'support', 'api', 'login', 'logout', 'signup', 'system', 'staff', 'help', 'null', 'undefined'];
const COMMON = ['password', 'qwerty', 'asdf', 'zxcv', 'letmein', 'welcome', 'iloveyou', 'abc123', 'admin', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'master', 'login', 'passw0rd', 'bangladesh'];

/** [{ label, ok }] for a username (saved in small letters) */
export function usernameRules(value) {
  const name = value.trim().toLowerCase();
  return [
    { label: '3 to 20 characters', ok: name.length >= 3 && name.length <= 20 },
    { label: 'Only letters, numbers, dot (.) and underscore (_)', ok: /^[a-z0-9._]*$/.test(name) && name.length > 0 },
    { label: 'Starts and ends with a letter or number', ok: /^[a-z0-9](.*[a-z0-9])?$/.test(name) },
    { label: 'No two symbols together (.. or __)', ok: name.length > 0 && !/[._]{2}/.test(name) },
    { label: 'Not a system word (admin, support, root, api, login ...)', ok: name.length > 0 && !RESERVED.includes(name) },
  ];
}

/** null when the email is fine, else what is wrong (same rules as the backend) */
export function emailProblem(value) {
  const text = value.trim();
  if (text.length > 254) return 'Email is too long (254 characters at most).';
  const parts = text.split('@');
  if (parts.length !== 2) return 'Email needs exactly one @, like jane.doe@company.com.';
  const [local, domain] = parts;
  if (!local || local.length > 64) return 'Email needs 1 to 64 characters before the @.';
  if (!/^[A-Za-z0-9._+-]+$/.test(local)) return 'Before the @ you can only use letters, numbers and . _ - +';
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return 'Before the @ the email cannot start or end with a dot, or have two dots together.';
  }
  const labels = domain.split('.');
  if (labels.length < 2) return 'Email needs an ending like .com or .org after the @.';
  for (const label of labels) {
    if (!label) return 'The part after the @ cannot have two dots together.';
    if (label.length > 63 || !/^[A-Za-z0-9-]+$/.test(label)) return 'After the @ you can only use letters, numbers and -.';
    if (label.startsWith('-') || label.endsWith('-')) return 'A part of the domain cannot start or end with -.';
  }
  if (!/^[A-Za-z]{2,}$/.test(labels.at(-1))) return 'Email needs an ending of at least 2 letters, like .com or .bd.';
  return null;
}

/** True for 4+ characters in a row like 1234, 4321, abcd or aaaa */
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
 * [{ label, ok }] for a new password.
 * about = { username, email, fullName, phone }: personal details that may not be inside the password.
 */
export function passwordRules(password, about = {}) {
  const lower = password.toLowerCase();
  const isPassphrase = password.length >= 16 && password.trim().split(/[\s-]+/).length >= 3;
  const mixed = /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  const personal = [about.username, String(about.email || '').split('@')[0], ...String(about.fullName || '').split(/\s+/)]
    .map((part) => String(part || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((part) => part.length >= 3);
  const phone = String(about.phone || '').replace(/\D/g, '').slice(-6);
  const hasPersonal =
    personal.some((part) => lower.replace(/[^a-z0-9]/g, '').includes(part)) ||
    (phone.length === 6 && password.replace(/\D/g, '').includes(phone));

  return [
    { label: '8 to 64 characters (12 or more is better)', ok: password.length >= 8 && password.length <= 64 },
    { label: 'Capital + small letter, a number and a symbol (or a passphrase of 3+ words)', ok: mixed || isPassphrase },
    { label: 'No name, username, email or phone number in it', ok: password.length > 0 && !hasPersonal },
    {
      label: 'No easy patterns (password, qwerty, 1234, abcd)',
      ok: password.length > 0 && !COMMON.some((word) => lower.includes(word)) && !hasSimpleSequence(password),
    },
  ];
}

/** True when every rule in the list is met */
export const allRulesOk = (rules) => rules.every((rule) => rule.ok);

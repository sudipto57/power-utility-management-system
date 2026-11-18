import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useNow from '../../hooks/useNow';
import * as authApi from '../../api/auth';
import Icon from '../common/Icon';
import Spinner from '../common/Spinner';
import FormError from '../common/FormError';
import { Field, Input, PasswordInput } from '../common/FormField';

// The two small forms that use a 6-digit code from an email:
//   ConfirmEmailForm   - after signing up (the account works once the email is confirmed)
//   ForgotPasswordForm - email or phone number -> code -> new password

const WAIT_SECONDS = 60; // the backend sends at most one new code per minute

/** Green "good news" box (FormError is the red one). */
export function FormNotice({ message }) {
  if (!message) return null;
  return (
    <div className="flex animate-fade-in items-start gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
      <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

/** Big box for the 6 digits (numbers only). */
function CodeInput({ value, onChange }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="••••••"
      className="text-center font-mono text-2xl font-extrabold tracking-[0.5em]"
    />
  );
}

/** "Send a new code" link that waits a minute between two emails. */
function ResendLink({ onResend, sentAt }) {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, WAIT_SECONDS - Math.floor((now - sentAt) / 1000));
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={secondsLeft > 0}
      className="text-sm font-bold text-orange-600 hover:underline disabled:cursor-not-allowed disabled:font-semibold disabled:text-slate-400 disabled:no-underline"
    >
      {secondsLeft > 0 ? `Send a new code in ${secondsLeft}s` : 'Send a new code'}
    </button>
  );
}

/** Big gradient button used by every form on the login card. */
export function SubmitButton({ loading, gradient, label, busyLabel }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${gradient} bg-[length:200%_100%] py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:bg-right hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {loading ? busyLabel : label}
      {!loading && <Icon name="arrowRight" className="h-4 w-4" />}
    </button>
  );
}

/**
 * Confirm email (after sign up, or when an unconfirmed customer tries to log in).
 * loginName = the email or username of the new account.
 */
export function ConfirmEmailForm({ loginName, firstNotice, gradient, onDone }) {
  const { confirmEmail } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(firstNotice);
  const [loading, setLoading] = useState(false);
  const [sentAt, setSentAt] = useState(() => Date.now());

  const handleConfirm = async (event) => {
    event.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code from the email.');
      return;
    }
    setLoading(true);
    try {
      onDone(await confirmEmail(loginName, code));
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await authApi.resendCode(loginName);
      setNotice('A new code is on its way. Check your inbox (and the spam folder).');
      setSentAt(Date.now());
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleConfirm} className="mt-6 space-y-5" noValidate>
      <FormNotice message={notice} />
      <Field label="6-digit code" hint="The code works for 15 minutes.">
        <CodeInput value={code} onChange={setCode} />
      </Field>
      <FormError message={error} />
      <SubmitButton loading={loading} gradient={gradient} label="Confirm email" busyLabel="Checking..." />
      <p className="text-center">
        <ResendLink onResend={handleResend} sentAt={sentAt} />
      </p>
    </form>
  );
}

/**
 * Forgot password: 1) email or phone number  2) code + new password  3) done.
 * The code always goes to the email address saved on the account.
 */
export function ForgotPasswordForm({ gradient, onDone }) {
  const [stage, setStage] = useState('ask'); // 'ask' | 'reset'
  const [loginName, setLoginName] = useState('');
  const [form, setForm] = useState({ code: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentAt, setSentAt] = useState(0);

  const sendCode = async () => {
    const result = await authApi.forgotPassword(loginName.trim());
    setNotice(result.message);
    setSentAt(Date.now());
  };

  const handleAsk = async (event) => {
    event.preventDefault();
    setError('');
    if (!loginName.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    setLoading(true);
    try {
      await sendCode();
      setStage('reset');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError('');
    if (form.code.length !== 6) {
      setError('Please enter the 6-digit code from the email.');
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('The new password needs 8+ characters with at least one letter and one number.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.resetPassword(loginName.trim(), form.code, form.password);
      onDone(result.message);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await sendCode();
    } catch (err) {
      setError(err.message);
    }
  };

  if (stage === 'ask') {
    return (
      <form onSubmit={handleAsk} className="mt-6 space-y-5" noValidate>
        <Field label="Email or phone number" hint="We send a 6-digit code to the email saved on your account.">
          <Input
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="you@email.com or 01XXXXXXXXX"
            autoComplete="username"
          />
        </Field>
        <FormError message={error} />
        <SubmitButton loading={loading} gradient={gradient} label="Send me a code" busyLabel="Sending..." />
      </form>
    );
  }

  return (
    <form onSubmit={handleReset} className="mt-6 space-y-4" noValidate>
      <FormNotice message={notice} />
      <Field label="6-digit code">
        <CodeInput value={form.code} onChange={(code) => setForm({ ...form, code })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="New password">
          <PasswordInput
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="8+ letters & numbers"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password">
          <PasswordInput
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            placeholder="Type it again"
            autoComplete="new-password"
          />
        </Field>
      </div>
      <FormError message={error} />
      <SubmitButton loading={loading} gradient={gradient} label="Save new password" busyLabel="Saving..." />
      <p className="text-center">
        <ResendLink onResend={handleResend} sentAt={sentAt} />
      </p>
    </form>
  );
}

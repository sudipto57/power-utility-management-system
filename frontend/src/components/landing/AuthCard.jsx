import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Icon from '../common/Icon';
import FormError from '../common/FormError';
import { Field, Input, PasswordInput, Select } from '../common/FormField';
import { ConfirmEmailForm, ForgotPasswordForm, FormNotice, LoginCodeForm, SubmitButton } from './AccountCodeForms';
import { homePathFor } from '../../utils/routes';

// Colours for each role: the whole card changes colour when you switch
const THEME = {
  customer: {
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    shadow: 'shadow-orange-200',
    soft: 'bg-orange-50 text-orange-600',
  },
  admin: {
    gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500',
    shadow: 'shadow-violet-200',
    soft: 'bg-violet-50 text-violet-600',
  },
};

const EMPTY_SIGNUP = {
  full_name: '',
  email: '',
  phone: '',
  username: '',
  customer_type: 'Residential',
  password: '',
  confirm: '',
  address: '',
};

// Same rule as the backend: 8+ characters with a letter and a number
const isStrongPassword = (password) => password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);

/**
 * Login + Sign up card with the Customer / Admin slide switch.
 * role: 'customer' | 'admin'      mode: 'login' | 'signup' (sign up is for customers only)
 * step (customers only): 'login_code' = type the code from the login email (every login),
 *   'confirm' = type the code from the sign up email, 'forgot' = forgot password
 */
export default function AuthCard({ role, mode, onRoleChange, onModeChange }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); // green message (e.g. "password changed")
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(null); // null | 'login_code' | 'confirm' | 'forgot'
  const [loginResult, setLoginResult] = useState(null); // backend answer when a login code was emailed
  const [codeLogin, setCodeLogin] = useState(''); // email/username waiting for its confirmation code

  const theme = THEME[role];
  const isSignup = role === 'customer' && mode === 'signup' && !step;

  // Back to the normal login form (optionally with a green message)
  const backToLogin = (message = '') => {
    setStep(null);
    onModeChange('login');
    setError('');
    setNotice(message);
    setLoading(false);
  };

  const switchRole = (newRole) => {
    onRoleChange(newRole);
    if (newRole === 'admin') onModeChange('login'); // admins never sign up here
    setLoginForm({ login: '', password: '' });
    setStep(null);
    setError('');
    setNotice('');
  };

  // After login / sign up, open the correct dashboard for the role
  const goHome = (user) => {
    const home = homePathFor(user);
    const from = location.state?.from;
    navigate(from && from.startsWith(home) ? from : home, { replace: true });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    if (!loginForm.login.trim() || !loginForm.password) {
      setError('Please enter your email/username and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(loginForm.login.trim(), loginForm.password, role);
      if (result.needs_code) {
        // Customer: right password, now the 8-digit code from the email
        setLoginResult(result);
        setStep('login_code');
        setLoading(false);
      } else {
        goHome(result);
      }
    } catch (err) {
      if (err.code === 'EMAIL_NOT_CONFIRMED') {
        // Right password, but the email is not confirmed yet: show the code box
        setCodeLogin(loginForm.login.trim());
        setNotice(err.message);
        setStep('confirm');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');
    const form = signupForm;
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.username.trim() || !form.address.trim()) {
      setError('Please fill in every field.');
      return;
    }
    if (!isStrongPassword(form.password)) {
      setError('Password needs 8+ characters with at least one letter and one number.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const data = { ...form };
      delete data.confirm; // "confirm" is only checked here, it is not sent to the backend
      const result = await signup(data);
      // Account created: now the customer types the code we emailed
      setCodeLogin(result.email);
      const number = result.customer_number ? ` Your customer number is ${result.customer_number}.` : '';
      setNotice(
        result.email_sent
          ? `Account created!${number} We sent an 8-digit code to ${result.email}. Type it here to finish.`
          : `Account created!${number} The email could not be sent just now. Press "Send a new code" in a minute.`
      );
      setSignupForm(EMPTY_SIGNUP);
      setStep('confirm');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const updateSignup = (key) => (event) => setSignupForm({ ...signupForm, [key]: event.target.value });

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-white shadow-2xl ${theme.shadow} ring-1 ring-slate-200/70`}>
      {/* Coloured strip on top (changes with the role) */}
      <div className={`h-1.5 bg-gradient-to-r ${theme.gradient} bg-[length:200%_100%] animate-gradient`} />

      <div className="p-7 sm:p-8">
        {/* ---------- Customer / Admin slide switch bar ---------- */}
        <div className="relative grid grid-cols-2 rounded-full bg-slate-100 p-1" role="tablist" aria-label="Choose login type">
          <span
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r ${theme.gradient} shadow-md transition-transform duration-300 ease-out ${
              role === 'admin' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          {[
            { value: 'customer', label: 'Customer', icon: 'user' },
            { value: 'admin', label: 'Admin', icon: 'key' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={role === tab.value}
              onClick={() => switchRole(tab.value)}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-colors duration-300 ${
                role === tab.value ? 'text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon name={tab.icon} className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---------- Heading ---------- */}
        <div key={`${role}-${mode}`} className="mt-6 animate-fade-up">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${theme.soft}`}
          >
            <Icon name={role === 'admin' ? 'shield' : 'bolt'} className="h-3.5 w-3.5" />
            {role === 'admin'
              ? 'Staff area'
              : isSignup
                ? 'New customer'
                : step === 'login_code'
                  ? 'Email verification'
                  : step
                    ? 'Account help'
                    : 'Customer area'}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            {role === 'admin'
              ? 'Admin sign in'
              : step === 'login_code'
                ? 'Verify your identity'
                : step === 'confirm'
                ? 'Confirm your email'
                : step === 'forgot'
                  ? 'Reset your password'
                  : isSignup
                    ? 'Create your account'
                    : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {role === 'admin'
              ? 'Manage customers, meters, bills and requests.'
              : step === 'login_code'
                ? 'For your security, every login needs the code we email to you.'
                : step === 'confirm'
                ? 'One last step: type the 8-digit code from your email.'
                : step === 'forgot'
                  ? 'Use your email or phone number to get a reset code.'
                  : isSignup
                    ? 'Sign up to see your bills and raise requests online.'
                    : 'Log in with your email or username.'}
          </p>
        </div>

        {/* ---------- Confirm email / forgot password (customers only) ---------- */}
        {role === 'customer' && step === 'login_code' ? (
          <LoginCodeForm
            loginName={loginForm.login.trim()}
            password={loginForm.password}
            role={role}
            loginResult={loginResult}
            gradient={theme.gradient}
            onDone={goHome}
          />
        ) : role === 'customer' && step === 'confirm' ? (
          <ConfirmEmailForm loginName={codeLogin} firstNotice={notice} gradient={theme.gradient} onDone={goHome} />
        ) : role === 'customer' && step === 'forgot' ? (
          <ForgotPasswordForm gradient={theme.gradient} onDone={backToLogin} />
        ) : /* ---------- Sign up form (customers only) ---------- */
        isSignup ? (
          <form onSubmit={handleSignup} className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4" noValidate>
            <Field label="Full name" className="col-span-2">
              <Input
                value={signupForm.full_name}
                onChange={updateSignup('full_name')}
                placeholder="Your full name"
                autoComplete="name"
              />
            </Field>
            <Field label="Email" className="col-span-2">
              <Input
                type="email"
                value={signupForm.email}
                onChange={updateSignup('email')}
                placeholder="you@email.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Phone">
              <Input value={signupForm.phone} onChange={updateSignup('phone')} placeholder="01XXXXXXXXX" autoComplete="tel" />
            </Field>
            <Field label="Customer type">
              <Select
                value={signupForm.customer_type}
                onChange={updateSignup('customer_type')}
                options={['Residential', 'Commercial']}
              />
            </Field>
            <Field label="Username" className="col-span-2" hint="You can log in with this or your email.">
              <Input
                value={signupForm.username}
                onChange={updateSignup('username')}
                placeholder="e.g. rahim.uddin"
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <PasswordInput
                value={signupForm.password}
                onChange={updateSignup('password')}
                placeholder="8+ letters & numbers"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm password">
              <PasswordInput
                value={signupForm.confirm}
                onChange={updateSignup('confirm')}
                placeholder="Type it again"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Address" className="col-span-2">
              <Input
                value={signupForm.address}
                onChange={updateSignup('address')}
                placeholder="House, road, area, city"
                autoComplete="street-address"
              />
            </Field>

            <div className="col-span-2 space-y-4">
              <FormError message={error} />
              <SubmitButton loading={loading} gradient={theme.gradient} label="Create account" busyLabel="Creating account..." />
            </div>
          </form>
        ) : (
          /* ---------- Login form (customers and admins) ---------- */
          <form onSubmit={handleLogin} className="mt-6 space-y-5" noValidate>
            <Field label={role === 'admin' ? 'Admin email or username' : 'Email or username'}>
              <Input
                value={loginForm.login}
                onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                placeholder={role === 'admin' ? 'Admin username' : 'you@email.com'}
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <PasswordInput
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            {role === 'customer' && (
              <p className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setStep('forgot');
                    setError('');
                    setNotice('');
                  }}
                  className="text-xs font-bold text-orange-600 hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            )}

            <FormNotice message={notice} />
            <FormError message={error} />
            <SubmitButton
              loading={loading}
              gradient={theme.gradient}
              label={role === 'admin' ? 'Log in as Admin' : 'Log in'}
              busyLabel="Logging in..."
            />
          </form>
        )}

        {/* ---------- Bottom line: switch between log in and sign up ---------- */}
        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          {role === 'admin' ? (
            <p className="flex items-center justify-center gap-2 text-xs">
              <Icon name="info" className="h-4 w-4 text-violet-500" />
              Admin accounts are created by the system administrator.
            </p>
          ) : step ? (
            <p>
              {step === 'login_code' ? 'Wrong account?' : 'Remembered it?'}{' '}
              <button type="button" onClick={() => backToLogin()} className="font-bold text-orange-600 hover:underline">
                Back to log in
              </button>
            </p>
          ) : isSignup ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  onModeChange('login');
                  setError('');
                }}
                className="font-bold text-orange-600 hover:underline"
              >
                Log in
              </button>
            </p>
          ) : (
            <p>
              New customer?{' '}
              <button
                type="button"
                onClick={() => {
                  onModeChange('signup');
                  setError('');
                  setNotice('');
                }}
                className="font-bold text-orange-600 hover:underline"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

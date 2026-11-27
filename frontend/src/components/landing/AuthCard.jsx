import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Icon from '../common/Icon';
import FormError from '../common/FormError';
import { Field, Input, PasswordInput, Select } from '../common/FormField';
import PhoneInput from '../common/PhoneInput';
import { phoneProblem } from '../../utils/phone';
import RuleList from '../common/RuleList';
import { ConfirmEmailForm, ForgotPasswordForm, FormNotice, LoginCodeForm, SubmitButton } from './AccountCodeForms';
import { allRulesOk, emailProblem, passwordRules, usernameRules } from '../../utils/accountRules';
import { homePathFor } from '../../utils/routes';

// Colours for each role: the whole card changes colour when you switch
const THEME = {
  customer: {
    gradient: 'from-ember via-flame to-dusk',
    shadow: 'shadow-orange-200',
    soft: 'bg-orange-50 text-orange-600',
  },
  admin: {
    gradient: 'from-indigo-600 via-violet-600 to-fuchsia-600',
    shadow: 'shadow-violet-200',
    soft: 'bg-violet-50 text-violet-600',
  },
};

const EMPTY_SIGNUP = {
  full_name: '',
  email: '',
  phone_country: 'BD', // Bangladesh first; the number is typed after +880
  phone: '',
  username: '',
  customer_type: 'Residential',
  password: '',
  confirm: '',
  house: '', // the address is: house / road (optional), area, city
  area: '',
  city: '',
};

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
  const [wrongTab, setWrongTab] = useState(null); // { message, role }: the account belongs on the other tab
  const [notice, setNotice] = useState(''); // green message (e.g. "password changed")
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(null); // null | 'login_code' | 'confirm' | 'forgot'
  const [loginResult, setLoginResult] = useState(null); // backend answer when a login code was emailed
  const [codeLogin, setCodeLogin] = useState(''); // email/username waiting for its confirmation code
  const [emailTouched, setEmailTouched] = useState(false); // show the email problem after leaving the box

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

  // keepLogin: keep the typed email/username (used by the "Switch to the ... tab" button)
  const switchRole = (newRole, keepLogin = false) => {
    onRoleChange(newRole);
    if (newRole === 'admin') onModeChange('login'); // admins never sign up here
    setLoginForm({ login: keepLogin ? loginForm.login : '', password: '' });
    setStep(null);
    setError('');
    setWrongTab(null);
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
    setWrongTab(null);
    if (!loginForm.login.trim() || !loginForm.password) {
      setError('Please enter your email/username and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(loginForm.login.trim(), loginForm.password, role);
      if (result.needs_code) {
        // Customer: right password, now the 4-digit code from the email
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
      } else if (err.code === 'WRONG_TAB') {
        // A customer on the Admin tab (or an admin on the Customer tab): a warning, not an error
        setWrongTab({ message: err.message, role: role === 'admin' ? 'customer' : 'admin' });
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
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.username.trim()) {
      setError('Please fill in every field.');
      return;
    }
    // The same rules the backend checks (each list shows what is missing)
    const problem =
      emailProblem(form.email) ||
      phoneProblem(form.phone_country, form.phone) ||
      (!allRulesOk(usernameRules(form.username)) && 'The username does not follow the rules under the box.') ||
      (!allRulesOk(passwordRules(form.password, aboutUser)) && 'The password does not follow the rules under the box.') ||
      (form.password !== form.confirm && 'The two passwords do not match.') ||
      ((!form.area.trim() || !form.city.trim()) && 'Please write your area and your city.');
    if (problem) {
      setEmailTouched(true);
      setError(problem);
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
          ? `Account created.${number} We sent a 4-digit code to ${result.email}. Type it here to finish.`
          : `Account created.${number} The email could not be sent just now. Press "Send a new code" in a minute.`
      );
      setSignupForm(EMPTY_SIGNUP);
      setStep('confirm');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const updateSignup = (key) => (event) => setSignupForm({ ...signupForm, [key]: event.target.value });
  // Personal details that may not be part of the password
  const aboutUser = {
    username: signupForm.username,
    email: signupForm.email,
    fullName: signupForm.full_name,
    phone: signupForm.phone,
  };
  const emailError = emailTouched && signupForm.email.trim() ? emailProblem(signupForm.email) : null;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-white shadow-2xl ${theme.shadow} ring-1 ring-sand-200/70`}>
      {/* Coloured strip on top (changes with the role) */}
      <div className={`h-1.5 bg-gradient-to-r ${theme.gradient} bg-[length:200%_100%] animate-gradient`} />

      <div className="p-7 sm:p-8">
        {/* ---------- Customer / Admin slide switch bar ---------- */}
        <div className="relative grid grid-cols-2 rounded-full bg-sand-100 p-1" role="tablist" aria-label="Choose login type">
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
                role === tab.value ? 'text-white' : 'text-sand-500 hover:text-sand-800'
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
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-sand-900">
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
          <p className="mt-1 text-sm text-sand-500">
            {role === 'admin'
              ? 'Manage customers, meters, bills and requests.'
              : step === 'login_code'
                ? 'For your security, every login needs the code we email to you.'
                : step === 'confirm'
                ? 'One last step: type the 4-digit code from your email.'
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
            <Field label="Email" className="col-span-2" error={emailError}>
              <Input
                type="email"
                value={signupForm.email}
                onChange={updateSignup('email')}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@email.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Phone number" className="col-span-2" hint="Choose the country code, then type the number.">
              <PhoneInput
                country={signupForm.phone_country}
                number={signupForm.phone}
                onChange={({ country, number }) => setSignupForm({ ...signupForm, phone_country: country, phone: number })}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Username" hint={signupForm.username ? '' : 'You can log in with this or your email.'}>
                <Input
                  value={signupForm.username}
                  onChange={updateSignup('username')}
                  placeholder="e.g. rahim.uddin"
                  autoComplete="username"
                />
              </Field>
              {signupForm.username && <RuleList rules={usernameRules(signupForm.username)} />}
            </div>
            <Field label="Password">
              <PasswordInput
                value={signupForm.password}
                onChange={updateSignup('password')}
                placeholder="A strong password"
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
            {signupForm.password && (
              <div className="col-span-2 -mt-2">
                <RuleList rules={passwordRules(signupForm.password, aboutUser)} />
                <p className="mt-1 text-xs text-sand-500">Use a password you do not use on any other website.</p>
              </div>
            )}
            <Field label="House / road" className="col-span-2" hint="Optional">
              <Input
                value={signupForm.house}
                onChange={updateSignup('house')}
                placeholder="e.g. House 12, Road 5"
                autoComplete="address-line1"
              />
            </Field>
            <Field label="Area" required>
              <Input value={signupForm.area} onChange={updateSignup('area')} placeholder="e.g. Khilkhet" />
            </Field>
            <Field label="City" required>
              <Input value={signupForm.city} onChange={updateSignup('city')} placeholder="e.g. Dhaka" autoComplete="address-level2" />
            </Field>
            <Field label="Customer type" className="col-span-2">
              <Select
                value={signupForm.customer_type}
                onChange={updateSignup('customer_type')}
                options={['Residential', 'Commercial']}
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
            <FormError message={wrongTab?.message} tone="warning">
              <button
                type="button"
                onClick={() => switchRole(wrongTab.role, true)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-extrabold text-amber-900 underline-offset-2 hover:underline"
              >
                Switch to the {wrongTab?.role === 'customer' ? 'Customer' : 'Admin'} tab
                <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </button>
            </FormError>
            <SubmitButton
              loading={loading}
              gradient={theme.gradient}
              label={role === 'admin' ? 'Log in as Admin' : 'Log in'}
              busyLabel="Logging in..."
            />
          </form>
        )}

        {/* ---------- Bottom line: switch between log in and sign up ---------- */}
        <div className="mt-6 border-t border-sand-100 pt-5 text-center text-sm text-sand-500">
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

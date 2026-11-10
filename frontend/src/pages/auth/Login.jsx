import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Logo from '../../components/common/Logo';
import Icon from '../../components/common/Icon';
import Button from '../../components/common/Button';
import FormError from '../../components/common/FormError';
import { Field, Input } from '../../components/common/FormField';
import { homePathFor } from '../../utils/routes';

// Demo accounts from database/04_sample_data.sql (handy for the checkpoint demo)
const DEMO_ACCOUNTS = [
  { label: 'Admin demo', login: 'admin', password: 'admin123', icon: 'key' },
  { label: 'Customer demo', login: 'john.kamau', password: 'customer123', icon: 'user' },
];

const FEATURES = [
  { icon: 'users', text: 'Customers, connections and meters in one place' },
  { icon: 'receipt', text: 'Bills calculated from real tariff slabs' },
  { icon: 'complaint', text: 'Service requests tracked from start to finish' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in? Go straight to the right home page.
  if (user) return <Navigate to={homePathFor(user)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.login.trim() || !form.password) {
      setError('Please enter your email/username and password.');
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await login(form.login.trim(), form.password);
      const home = homePathFor(loggedIn);
      const from = location.state?.from;
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ---------- Left: animated brand panel ---------- */}
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-1/4 h-80 w-80 animate-glow rounded-full bg-amber-500/20 blur-3xl" />
        <div
          className="absolute -right-24 bottom-10 h-72 w-72 animate-glow rounded-full bg-sky-500/20 blur-3xl"
          style={{ animationDelay: '1.2s' }}
        />

        {/* Power grid illustration: towers with flowing current */}
        <svg className="absolute inset-x-0 bottom-0 h-72 w-full" viewBox="0 0 600 280" fill="none" aria-hidden="true">
          {[90, 300, 510].map((x) => (
            <g key={x} stroke="#334155" strokeWidth="2">
              <path d={`M${x} 270 L${x - 22} 270 L${x} 120 L${x + 22} 270 Z`} />
              <path d={`M${x - 40} 140 H${x + 40}`} />
              <path d={`M${x - 30} 170 H${x + 30}`} />
            </g>
          ))}
          <path d="M-20 140 Q 90 175 50 140 T 260 140 T 470 140 T 640 140" stroke="#1e293b" strokeWidth="2" />
          <path
            d="M-20 140 C 40 168, 70 168, 130 140 S 220 112, 260 140 S 350 168, 400 140 S 520 112, 640 140"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="8 14"
            className="animate-flow"
          />
          <path
            d="M-20 170 C 50 195, 90 195, 140 170 S 230 145, 270 170 S 360 195, 410 170 S 530 145, 640 170"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="5 16"
            className="animate-flow"
            style={{ animationDuration: '3s' }}
          />
        </svg>

        <div className="relative animate-fade-up">
          <Logo light />
        </div>

        <div className="relative max-w-md">
          <h1 className="animate-fade-up text-4xl font-extrabold leading-tight tracking-tight" style={{ animationDelay: '80ms' }}>
            Keep the lights on.
            <span className="block bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Keep the bills right.
            </span>
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((feature, index) => (
              <li
                key={feature.text}
                className="flex animate-fade-up items-center gap-3 text-sm text-slate-300"
                style={{ animationDelay: `${200 + index * 90}ms` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-amber-300 ring-1 ring-white/10">
                  <Icon name={feature.icon} className="h-4 w-4" />
                </span>
                {feature.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">Power Utility Management System · Academic DBMS project</p>
      </section>

      {/* ---------- Right: login form ---------- */}
      <section className="app-backdrop flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md animate-scale-in">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Log in with your email or username.</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
              <Field label="Email or username">
                <Input
                  autoFocus
                  autoComplete="username"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="admin  or  you@email.com"
                />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                  </button>
                </div>
              </Field>

              <FormError message={error} />

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                {loading ? 'Logging in...' : 'Log in'}
                {!loading && <Icon name="arrowRight" className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick demo login</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.login}
                    type="button"
                    onClick={() => {
                      setForm({ login: account.login, password: account.password });
                      setError('');
                    }}
                    className="group flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-amber-50 hover:ring-amber-200"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition group-hover:text-amber-600">
                      <Icon name={account.icon} className="h-4 w-4" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-xs font-bold text-slate-800">{account.label}</span>
                      <span className="block text-[11px] text-slate-500">{account.login}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

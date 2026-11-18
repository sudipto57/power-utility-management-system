// The sections you see when you scroll down the first page.
import { useState } from 'react';
import Icon from '../common/Icon';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import useCountUp from '../../hooks/useCountUp';
import { estimateBill } from '../../api/tariffs';
import WatchDemoButton from './WatchDemo';
import FeedbackForm from '../common/FeedbackForm';
import { formatMoney, formatNumber } from '../../utils/format';
import { CATEGORIES, FAQS, SERVICES, STEPS, VISION } from './landingData';

/** Small title block used by every section */
function SectionTitle({ eyebrow, title, text, light = false }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">{eyebrow}</p>
      <h2 className={`mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {text && <p className={`mt-3 text-base ${light ? 'text-slate-400' : 'text-slate-500'}`}>{text}</p>}
    </div>
  );
}

/* ---------------- Vision ---------------- */
export function VisionSection() {
  return (
    <section id="vision" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto max-w-7xl px-5">
        <SectionTitle eyebrow="Vision" title="Power that people can trust" text="Why we built the Power Utility Management System." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {VISION.map((item) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-3xl bg-slate-50 p-7 ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl"
            >
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${item.tone} opacity-10 transition group-hover:scale-150 group-hover:opacity-20`} />
              <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}>
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <h3 className="relative mt-5 text-lg font-extrabold text-slate-900">{item.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Overview / services with search + chips ---------------- */
export function ServicesSection({ search, onSearch, category, onCategory }) {
  const text = search.trim().toLowerCase();
  const shown = SERVICES.filter((service) => {
    const matchesCategory = category === 'All' || service.category === category;
    const matchesSearch =
      !text || `${service.title} ${service.category} ${service.text}`.toLowerCase().includes(text);
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="services" className="scroll-mt-20 bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <SectionTitle eyebrow="Overview" title="Everything in one system" text="Search or pick a category to explore what the system does." />

        {/* Search + category chips (like the reference sites) */}
        <div className="mx-auto mt-10 max-w-3xl">
          <label className="flex items-center gap-3 rounded-full bg-white px-5 py-3.5 shadow-sm ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-amber-400">
            <Icon name="search" className="h-5 w-5 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search: bills, meters, outage, payment..."
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => onSearch('')} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Clear search">
                <Icon name="x" className="h-4 w-4" />
              </button>
            )}
          </label>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onCategory(name)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  category === name
                    ? 'bg-slate-900 text-white shadow-md dark:bg-orange-500'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:text-slate-900 hover:ring-slate-300'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {shown.length > 0 ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((service, index) => (
              <div
                key={service.title}
                className="group animate-fade-up rounded-3xl bg-white p-6 ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${service.tone} text-white shadow-md transition group-hover:rotate-6 group-hover:scale-110`}>
                    <Icon name={service.icon} className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">{service.category}</span>
                </div>
                <h3 className="mt-5 font-extrabold text-slate-900">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{service.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
            <p className="font-bold text-slate-800">Nothing matches “{search}”.</p>
            <button
              type="button"
              onClick={() => {
                onSearch('');
                onCategory('All');
              }}
              className="mt-3 text-sm font-bold text-orange-600 hover:underline"
            >
              Show all services
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Bill estimator ---------------- */

// One pill button of a two-choice switch (Residential / Commercial ...)
function Choice({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-xl py-2 text-sm font-bold transition ${
            value === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const QUICK_UNITS = [100, 250, 500, 1000];

export function EstimatorSection() {
  const [customerType, setCustomerType] = useState('Residential');
  const [connectionType, setConnectionType] = useState('Single Phase');
  const [units, setUnits] = useState(250);
  const debouncedUnits = useDebounce(units, 300); // ask the server only after the user stops typing

  // The numbers come from the database bill function (same as a real bill)
  const { data, loading, error } = useFetch(
    () => estimateBill({ customer_type: customerType, connection_type: connectionType, units: debouncedUnits }),
    [customerType, connectionType, debouncedUnits]
  );
  const total = useCountUp(data?.total_amount ?? 0, 700);

  const setUnitsFromInput = (text) => {
    const number = Math.round(Number(text));
    setUnits(Number.isFinite(number) ? Math.min(Math.max(number, 0), 100000) : 0);
  };

  return (
    <section id="estimator" className="scroll-mt-20 bg-gradient-to-b from-white to-orange-50/70 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionTitle
          eyebrow="Bill estimator"
          title="How much will my bill be?"
          text="Type the units you use and see your bill, slab by slab, from the real tariffs."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 lg:col-span-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Customer type</p>
            <div className="mt-2">
              <Choice options={['Residential', 'Commercial']} value={customerType} onChange={setCustomerType} />
            </div>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-slate-500">Connection</p>
            <div className="mt-2">
              <Choice options={['Single Phase', 'Three Phase']} value={connectionType} onChange={setConnectionType} />
            </div>

            <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-slate-500">Units used this month</p>
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-orange-400">
              <Icon name="bolt" className="h-5 w-5 text-orange-500" />
              <input
                type="number"
                min="0"
                max="100000"
                value={units}
                onChange={(event) => setUnitsFromInput(event.target.value)}
                className="w-full bg-transparent font-display text-2xl font-extrabold text-slate-900 focus:outline-none"
                aria-label="Units used (kWh)"
              />
              <span className="font-bold text-slate-400">kWh</span>
            </div>
            <input
              type="range"
              min="0"
              max="1500"
              step="10"
              value={Math.min(units, 1500)}
              onChange={(event) => setUnits(Number(event.target.value))}
              className="mt-4 w-full accent-orange-500"
              aria-label="Units slider"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_UNITS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUnits(value)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    units === value ? 'bg-slate-900 text-white dark:bg-orange-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {value} kWh
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-orange-100">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span>
                Not sure how many units you use? Look for <b className="text-slate-800">Units used</b> on any of your bills. A
                small home often uses 150–300 kWh a month.
              </span>
            </div>
          </div>

          {/* Result */}
          <div className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 transition-opacity lg:col-span-3 ${loading ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Estimated bill</p>
                <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-slate-900">{formatMoney(total)}</p>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 ring-1 ring-orange-100">
                {formatNumber(units)} kWh · {customerType} · {connectionType}
              </span>
            </div>

            {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

            {data && (
              <>
                {/* Slab by slab: each bar shows how many of the units fall in that slab */}
                <div className="mt-6 space-y-3">
                  {data.slabs.map((slab) => (
                    <div key={slab.slab_order}>
                      <div className="flex justify-between text-xs font-bold">
                        <span className={slab.units > 0 ? 'text-slate-700' : 'text-slate-400'}>
                          {slab.end_unit === null ? `Above ${formatNumber(slab.start_unit - 1)}` : `${formatNumber(slab.start_unit)}–${formatNumber(slab.end_unit)}`} kWh ·{' '}
                          {formatMoney(slab.rate_per_unit)} each
                        </span>
                        <span className={slab.units > 0 ? 'text-slate-900' : 'text-slate-400'}>
                          {formatNumber(slab.units)} kWh = {formatMoney(slab.amount)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        {slab.units > 0 && (
                          <div
                            key={`${data.units}-${data.customer_type}-${data.connection_type}`} // replay the animation for every new estimate
                            className="h-full origin-left animate-grow rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                            style={{ width: `${(slab.units / Math.max(data.units, 1)) * 100}%`, animationDelay: `${slab.slab_order * 80}ms` }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <dl className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Fixed monthly charge</dt>
                    <dd className="font-bold text-slate-800">{formatMoney(data.fixed_charge)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Energy charge</dt>
                    <dd className="font-bold text-slate-800">{formatMoney(data.variable_charge)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">VAT</dt>
                    <dd className="font-bold text-slate-800">{formatMoney(data.tax_amount)}</dd>
                  </div>
                  <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base">
                    <dt className="font-extrabold text-slate-900">Total</dt>
                    <dd className="font-display font-extrabold text-slate-900">{formatMoney(data.total_amount)}</dd>
                  </div>
                </dl>
              </>
            )}
            <p className="mt-4 text-xs font-semibold text-slate-400">
              An estimate from today's tariff. Your real bill uses your own meter readings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works (dark band with flowing power line) ---------------- */
export function HowItWorks({ onSignUp }) {
  return (
    <section id="how" className="relative scroll-mt-16 overflow-hidden bg-slate-950 py-20">
      <div className="absolute -left-20 top-10 h-72 w-72 animate-glow rounded-full bg-orange-500/20 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-72 w-72 animate-glow rounded-full bg-violet-500/20 blur-3xl" style={{ animationDelay: '1.2s' }} />

      <div className="relative mx-auto max-w-7xl px-5">
        <SectionTitle light eyebrow="How it works" title="Three simple steps" text="From sign up to your first bill." />

        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          {/* Flowing "current" behind the steps */}
          <svg className="absolute left-0 right-0 top-8 hidden h-4 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 4" aria-hidden="true">
            <path d="M16 2 H84" stroke="#334155" strokeWidth="0.4" />
            <path d="M16 2 H84" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 3" className="animate-flow" />
          </svg>

          {STEPS.map((step, index) => (
            <div key={step.title} className="relative text-center">
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30">
                <Icon name={step.icon} className="h-7 w-7" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-extrabold text-slate-900">
                  {index + 1}
                </span>
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-white">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Get started — it's free
            <Icon name="arrowRight" className="h-4 w-4" />
          </button>
          <WatchDemoButton dark />
        </div>
      </div>
    </section>
  );
}

/* ---------------- Feedback (emailed to the team) ---------------- */
export function FeedbackSection() {
  return (
    <section id="feedback" className="scroll-mt-20 bg-slate-50 py-20">
      <div className="mx-auto max-w-2xl px-5">
        <SectionTitle
          eyebrow="Feedback"
          title="Help us make Power Utility better"
          text="Tell us what you like, what is hard to use, or what we should add next. It takes one minute."
        />
        <div className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8">
          <FeedbackForm />
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ (each question drops down) ---------------- */
export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto max-w-3xl px-5">
        <SectionTitle eyebrow="FAQ" title="Questions? Answers." />
        <div className="mt-10 space-y-3">
          {FAQS.map((item) => (
            // <details> is a built-in HTML dropdown: click the question to open / close it
            <details key={item.q} className="group rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200/70 transition open:bg-white open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-800">
                {item.q}
                <Icon name="chevronDown" className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

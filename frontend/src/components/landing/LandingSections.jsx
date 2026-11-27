// The sections you see when you scroll down the first page.
// "reveal" on a block = it rises into view the first time you scroll to it (hooks/useReveal.js).
import { useEffect, useRef } from 'react';
import Icon from '../common/Icon';
import WatchDemoButton from './WatchDemo';
import FeedbackForm from '../common/FeedbackForm';
import BillCalculator from '../common/BillCalculator';
import { CATEGORIES, FAQS, SERVICES, STEPS, VISION } from './landingData';

/** Small title block used by every section */
function SectionTitle({ eyebrow, title, text, light = false }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">{eyebrow}</p>
      <h2
        className={`mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${light ? 'text-white' : 'text-sand-900'}`}
      >
        {title}
      </h2>
      {text && <p className={`mt-3 text-base ${light ? 'text-sand-400' : 'text-sand-500'}`}>{text}</p>}
    </div>
  );
}

/* ---------------- Vision ---------------- */
export function VisionSection() {
  return (
    <section id="vision" className="scroll-mt-20 bg-white py-20">
      <div className="reveal mx-auto max-w-7xl px-5">
        <SectionTitle
          eyebrow="Vision"
          title="Power that people can trust"
          text="Why we built Sparkility."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {VISION.map((item) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-3xl bg-sand-50 p-7 ring-1 ring-sand-200/70 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl"
            >
              <div
                className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${item.tone} opacity-10 transition group-hover:scale-150 group-hover:opacity-20`}
              />
              <span
                className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}
              >
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <h3 className="relative mt-5 text-lg font-extrabold text-sand-900">{item.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-sand-600">{item.text}</p>
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
    const matchesSearch = !text || `${service.title} ${service.category} ${service.text}`.toLowerCase().includes(text);
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="services" className="scroll-mt-20 bg-sand-50 py-20">
      <div className="reveal mx-auto max-w-7xl px-5">
        <SectionTitle
          eyebrow="Overview"
          title="Everything in one system"
          text="Search or pick a category to explore what the system does."
        />

        {/* Search + category chips (like the reference sites) */}
        <div className="mx-auto mt-10 max-w-3xl">
          <label className="flex items-center gap-3 rounded-full bg-white px-5 py-3.5 shadow-sm ring-1 ring-sand-200 transition focus-within:ring-2 focus-within:ring-amber-400">
            <Icon name="search" className="h-5 w-5 text-sand-500" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search: bills, meters, outage, payment..."
              className="w-full bg-transparent text-sm text-sand-800 placeholder:text-sand-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="rounded-full p-1 text-sand-500 hover:bg-sand-100 hover:text-sand-700"
                aria-label="Clear search"
              >
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
                    ? 'bg-sand-900 text-white shadow-md dark:bg-orange-500'
                    : 'bg-white text-sand-600 ring-1 ring-sand-200 hover:-translate-y-0.5 hover:text-sand-900 hover:ring-sand-300'
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
                className="group animate-fade-up rounded-3xl bg-white p-6 ring-1 ring-sand-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${service.tone} text-white shadow-md transition group-hover:rotate-6 group-hover:scale-110`}
                  >
                    <Icon name={service.icon} className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-bold text-sand-500">
                    {service.category}
                  </span>
                </div>
                <h3 className="mt-5 font-extrabold text-sand-900">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sand-500">{service.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-sand-200">
            <p className="font-bold text-sand-800">Nothing matches “{search}”.</p>
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

/* ---------------- Tagline: the words light up one by one while you scroll ---------------- */
// Two sentences, shown on two lines (one under the other)
const TAGLINE_LINES = ['Every bill shows how it was worked out.', 'Every complaint shows where it stands.'];

export function TaglineSection() {
  const textRef = useRef(null);

  useEffect(() => {
    // (People who prefer less motion see the whole sentence at once: see .tagline-word in index.css)
    const text = textRef.current; // kept here: React clears the ref when the page closes
    const words = [...text.querySelectorAll('.tagline-word')];

    const scroll = { lit: 0, frame: 0 }; // lit = how many words are lit (they never go dark again)
    function update() {
      scroll.frame = 0;
      const box = text.getBoundingClientRect();
      const screen = window.innerHeight;
      // 0 when the text enters the lower part of the screen, 1 when its end reaches the middle
      const progress = (screen * 0.85 - box.top) / (screen * 0.35 + box.height);
      scroll.lit = Math.max(scroll.lit, Math.round(Math.min(Math.max(progress, 0), 1) * words.length));
      words.forEach((word, index) => word.classList.toggle('is-lit', index < scroll.lit));
    }
    // At most one update per screen frame (requestAnimationFrame), so scrolling stays smooth
    function onScroll() {
      if (!scroll.frame) scroll.frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(scroll.frame);
    };
  }, []);

  return (
    <section className="bg-white py-14 sm:py-20" aria-label="Our promise">
      <p
        ref={textRef}
        className="mx-auto max-w-5xl px-5 text-center font-display text-2xl font-bold leading-snug text-sand-900 sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
      >
        {TAGLINE_LINES.map((line) => (
          <span key={line} className="block">
            {line.split(' ').map((word, index) => (
              <span key={index} className="tagline-word">
                {word}{' '}
              </span>
            ))}
          </span>
        ))}
      </p>
    </section>
  );
}

export function EstimatorSection() {
  return (
    <section id="estimator" className="scroll-mt-20 bg-gradient-to-b from-white to-orange-50/70 py-20">
      <div className="reveal mx-auto max-w-6xl px-5">
        <SectionTitle
          eyebrow="Bill estimator"
          title="How much will my bill be?"
          text="Type the units you use, or count your appliances, and see your bill slab by slab from the real tariffs."
        />
        <div className="mt-12">
          <BillCalculator />
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ onSignUp }) {
  return (
    <section id="how" className="relative scroll-mt-16 overflow-hidden bg-sand-950 py-20">
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="reveal relative mx-auto max-w-7xl px-5">
        <SectionTitle light eyebrow="How it works" title="Three simple steps" text="From sign up to your first bill." />

        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          {/* Flowing "current" behind the steps */}
          <svg
            className="absolute left-0 right-0 top-8 hidden h-4 w-full md:block"
            preserveAspectRatio="none"
            viewBox="0 0 100 4"
            aria-hidden="true"
          >
            <path d="M16 2 H84" stroke="#334155" strokeWidth="0.4" />
            <path d="M16 2 H84" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 3" className="animate-flow" />
          </svg>

          {STEPS.map((step, index) => (
            <div key={step.title} className="relative text-center">
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ember via-flame to-dusk text-white shadow-lg shadow-orange-500/30">
                <Icon name={step.icon} className="h-7 w-7" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-extrabold text-sand-900">
                  {index + 1}
                </span>
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-white">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-sand-400">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-sand-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Get started for free
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
    <section id="feedback" className="scroll-mt-20 bg-white py-20">
      <div className="reveal mx-auto max-w-2xl px-5">
        <SectionTitle
          eyebrow="Feedback"
          title="Help us make Sparkility better"
          text="Tell us what you like, what is hard to use, or what we should add next. It takes one minute."
        />
        <div className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sand-200 sm:p-8">
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
      <div className="reveal mx-auto max-w-3xl px-5">
        <SectionTitle eyebrow="FAQ" title="Questions? Answers." />
        <div className="mt-10 space-y-3">
          {FAQS.map((item) => (
            // <details> is a built-in HTML dropdown: click the question to open / close it
            <details
              key={item.q}
              className="group rounded-2xl bg-sand-50 px-5 py-4 ring-1 ring-sand-200/70 transition open:bg-white open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-sand-800">
                {item.q}
                <Icon
                  name="chevronDown"
                  className="h-5 w-5 shrink-0 text-sand-500 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-sand-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

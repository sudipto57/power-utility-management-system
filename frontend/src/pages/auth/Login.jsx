import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useReveal from '../../hooks/useReveal';
import Icon from '../../components/common/Icon';
import { homePathFor } from '../../utils/routes';
import LandingNavbar from '../../components/landing/LandingNavbar';
import AuthCard from '../../components/landing/AuthCard';
import WatchDemoButton from '../../components/landing/WatchDemo';
import SupportSection from '../../components/landing/SupportSection';
import LiveClock from '../../components/common/LiveClock';
import LandingFooter from '../../components/landing/LandingFooter';
import {
  EstimatorSection,
  FaqSection,
  FeedbackSection,
  HowItWorks,
  ServicesSection,
  TaglineSection,
  VisionSection,
} from '../../components/landing/LandingSections';
import { HERO_POINTS, STATS } from '../../components/landing/landingData';

// Smoothly scroll to a section of this page by its id
function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** The first page of the website: hero + role based login / customer sign up + info sections. */
export default function Login() {
  const { user } = useAuth();

  // Shared page state (navbar, login card and services all use it)
  const [role, setRole] = useState('customer'); // 'customer' | 'admin'
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  // The hero video only on wide screens for people who allow animations (checked once)
  const [showVideo] = useState(() => window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches);
  useReveal(); // sections below the hero rise into view while you scroll

  // Already logged in? Go straight to the right home page.
  if (user) return <Navigate to={homePathFor(user)} replace />;

  // Used by the navbar / footer / buttons: open the card on the right tab
  const openAuth = (newRole, newMode) => {
    setRole(newRole);
    setMode(newRole === 'admin' ? 'login' : newMode);
    scrollToId('auth');
  };

  const pickCategory = (name) => {
    setCategory(name);
    scrollToId('services');
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar search={search} onSearch={setSearch} onPickCategory={pickCategory} onOpenAuth={openAuth} />

      <main>
        {/* ================= HERO ================= */}
        <section id="home" className="relative overflow-hidden bg-gradient-to-b from-orange-50/70 via-white to-white">
          {/* Background video: wind and solar power flowing to a city (silent, loops).
              Only added on tablets and computers for people who allow animations,
              so phones never download it (about 500 KB). */}
          {showVideo && (
            <>
              <video
                className="pointer-events-none absolute inset-x-0 top-0 h-[620px] w-full object-cover"
                src="/videos/hero-loop.webm"
                poster="/videos/hero-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                aria-hidden="true"
              />
              {/* Soft colour layer on top of the video, so the text stays easy to read */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-gradient-to-b from-orange-50/80 via-white/85 to-white" />
            </>
          )}
          {/* Soft colour blobs (they stay still, so the page stays smooth) */}
          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-amber-300/30 blur-3xl" />
          <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-rose-300/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="app-backdrop absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

          {/* Power lines with flowing current along the bottom */}
          <svg className="absolute inset-x-0 bottom-0 h-40 w-full" viewBox="0 0 1200 160" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path d="M0 90 C 200 140, 400 40, 600 90 S 1000 140, 1200 90" stroke="#fde68a" strokeWidth="2" />
            <path d="M0 90 C 200 140, 400 40, 600 90 S 1000 140, 1200 90" stroke="#f97316" strokeWidth="2.5" strokeDasharray="10 18" className="animate-flow" />
            <path d="M0 120 C 250 70, 450 160, 700 110 S 1050 70, 1200 120" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="6 16" className="animate-flow" style={{ animationDuration: '3s' }} />
          </svg>

          <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-12 lg:pt-16">
            {/* Project name: one line, bold, sunrise gradient */}
            <div className="text-center">
              <div className="flex animate-fade-up flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-orange-600 shadow-sm ring-1 ring-orange-100">
                  <Icon name="bolt" className="h-3.5 w-3.5" />
                  Smart electricity billing &amp; service
                </span>
                {/* Live clock: today's date and the time, ticking every second */}
                <LiveClock
                  className="rounded-full bg-sand-900 px-4 py-1.5 text-xs font-bold text-white shadow-sm"
                  iconClassName="text-amber-300"
                />
              </div>
              <h1
                className="mt-5 animate-fade-up whitespace-nowrap font-display text-[clamp(2.75rem,9vw,5.5rem)] font-extrabold leading-tight tracking-tight"
                style={{ animationDelay: '80ms' }}
              >
                <span className="text-brand">Sparkility</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl animate-fade-up text-base text-sand-500 sm:text-lg" style={{ animationDelay: '160ms' }}>
                Keep the lights on. Keep the bills right.
              </p>
            </div>

            <div className="mt-12 grid items-start gap-12 lg:grid-cols-[1fr_440px]">
              {/* ---------- Left: points, buttons, stats ---------- */}
              <div className="animate-fade-up lg:pt-6" style={{ animationDelay: '240ms' }}>
                <h2 className="text-2xl font-extrabold leading-snug tracking-tight text-sand-900 sm:text-3xl">
                  Your electricity account,
                  <span className="block text-sand-500">simple, clear and online.</span>
                </h2>

                <ul className="mt-7 space-y-4">
                  {HERO_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sand-700">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember to-flame text-white">
                        <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openAuth('customer', 'signup')}
                    className="inline-flex items-center gap-2 rounded-full bg-sand-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-sand-800 dark:ring-1 dark:ring-white/20"
                  >
                    Create customer account
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId('services')}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-sand-700 ring-1 ring-sand-200 transition hover:-translate-y-0.5 hover:ring-sand-300"
                  >
                    <Icon name="search" className="h-4 w-4" />
                    Explore services
                  </button>
                  <WatchDemoButton />
                </div>

                <div className="mt-10 grid max-w-lg grid-cols-4 gap-3">
                  {STATS.map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-white p-3 text-center ring-1 ring-sand-200">
                      <p className="font-display text-xl font-extrabold text-sand-900">{stat.value}</p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-tight text-sand-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---------- Right: role based login / sign up card ---------- */}
              <div id="auth" className="relative scroll-mt-24 animate-scale-in" style={{ animationDelay: '200ms' }}>
                {/* Little floating cards for a lively look (decoration only) */}
                <div className="absolute -left-28 top-10 z-10 hidden animate-float items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-sand-200 xl:flex" aria-hidden="true">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Icon name="check" className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="text-xs font-bold text-sand-700">Bill paid</span>
                </div>
                <div
                  className="absolute -bottom-6 -right-6 z-10 hidden animate-float items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-sand-200 xl:flex"
                  style={{ animationDelay: '1.5s' }}
                  aria-hidden="true"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Icon name="gauge" className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-sand-700">Reading saved</span>
                </div>

                <AuthCard role={role} mode={mode} onRoleChange={setRole} onModeChange={setMode} />
              </div>
            </div>
          </div>
        </section>

        {/* ================= SCROLL-DOWN SECTIONS ================= */}
        <VisionSection />
        <ServicesSection search={search} onSearch={setSearch} category={category} onCategory={setCategory} />
        <TaglineSection />
        <EstimatorSection />
        <HowItWorks onSignUp={() => openAuth('customer', 'signup')} />
        <FaqSection />
        <SupportSection />
        <FeedbackSection />
      </main>

      <LandingFooter onOpenAuth={openAuth} />
    </div>
  );
}

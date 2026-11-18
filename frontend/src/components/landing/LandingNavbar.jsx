import Logo from '../common/Logo';
import ThemeToggle from '../common/ThemeToggle';
import Icon from '../common/Icon';
import { HELP_LINKS, SERVICES } from './landingData';

/**
 * One dropdown menu. It opens on mouse hover AND on keyboard/tap focus,
 * using only Tailwind classes (group-hover / group-focus-within), no extra JavaScript.
 */
function Dropdown({ label, children }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        {label}
        <Icon name="chevronDown" className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
      </button>
      <div className="invisible absolute left-0 top-full z-30 translate-y-2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="w-72 rounded-2xl bg-white p-2 shadow-xl shadow-slate-200/80 ring-1 ring-slate-200">{children}</div>
      </div>
    </div>
  );
}

function MenuItem({ href, icon, title, text, onClick }) {
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.();
        event.currentTarget.blur(); // closes the dropdown after a click
      }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </a>
  );
}

/**
 * Top navigation bar of the first page.
 * Props come from Login.jsx so the search, chips and login card stay in sync.
 */
export default function LandingNavbar({ search, onSearch, onPickCategory, onOpenAuth }) {
  // Pressing Enter in the search box jumps down to the services
  const handleSearch = (event) => {
    event.preventDefault();
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-5">
        <a href="#home" className="shrink-0">
          <Logo />
        </a>

        {/* Menu links (hidden on small phones) */}
        <div className="ml-4 hidden items-center gap-1 md:flex">
          <Dropdown label="Services">
            {SERVICES.slice(0, 6).map((service) => (
              <MenuItem
                key={service.title}
                href="#services"
                icon={service.icon}
                title={service.title}
                text={service.category}
                onClick={() => onPickCategory(service.category)}
              />
            ))}
          </Dropdown>
          <a href="#vision" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            Vision
          </a>
          <a href="#how" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            How it works
          </a>
          <Dropdown label="Help">
            {HELP_LINKS.map((link) => (
              <MenuItem key={link.title} {...link} />
            ))}
          </Dropdown>
        </div>

        {/* Search option */}
        <form onSubmit={handleSearch} className="ml-auto hidden lg:block">
          <label className="flex w-64 items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-500 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-amber-300 xl:w-72">
            <Icon name="search" className="h-4 w-4 shrink-0" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="What are you looking for?"
              className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </label>
        </form>

        {/* Light / dark switch + Log in / Sign up
            (on very small phones "Log in" is hidden: the login card is right below) */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => onOpenAuth('customer', 'login')}
            className="hidden whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold text-slate-700 min-[380px]:block transition hover:bg-slate-100 sm:px-4"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('customer', 'signup')}
            className="whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 sm:px-4 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Sign up
          </button>
        </div>
      </nav>
    </header>
  );
}

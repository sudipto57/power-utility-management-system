import Logo from '../common/Logo';
import Icon from '../common/Icon';
import { CONTACT, SOCIALS } from './landingData';

const linkClass = 'text-sm text-slate-500 transition hover:text-slate-900';

export default function LandingFooter({ onOpenAuth }) {
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        {/* Brand + social media icons */}
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
            Customers, meters, bills and complaints — managed in one simple online system.
          </p>
          <div className="mt-5 flex gap-2">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-900 hover:text-white"
              >
                <Icon name={social.icon} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-slate-900">Explore</h4>
          <ul className="mt-4 space-y-2.5">
            <li><a href="#services" className={linkClass}>Services</a></li>
            <li><a href="#vision" className={linkClass}>Vision</a></li>
            <li><a href="#how" className={linkClass}>How it works</a></li>
            <li><a href="#faq" className={linkClass}>FAQ</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-slate-900">Account</h4>
          <ul className="mt-4 space-y-2.5">
            <li><button type="button" onClick={() => onOpenAuth('customer', 'login')} className={linkClass}>Customer log in</button></li>
            <li><button type="button" onClick={() => onOpenAuth('customer', 'signup')} className={linkClass}>Customer sign up</button></li>
            <li><button type="button" onClick={() => onOpenAuth('admin', 'login')} className={linkClass}>Admin log in</button></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-slate-900">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-500">
            <li className="flex items-center gap-2"><Icon name="mail" className="h-4 w-4 text-orange-500" />{CONTACT.email}</li>
            <li className="flex items-center gap-2"><Icon name="phone" className="h-4 w-4 text-orange-500" />{CONTACT.phone}</li>
            <li className="flex items-center gap-2"><Icon name="mapPin" className="h-4 w-4 text-orange-500" />{CONTACT.address}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <p className="mx-auto max-w-7xl px-5 py-5 text-center text-xs font-medium text-slate-500">© 2026 Power Utility Management System</p>
      </div>
    </footer>
  );
}

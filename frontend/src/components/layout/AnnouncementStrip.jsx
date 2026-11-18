import { useState } from 'react';
import Icon from '../common/Icon';
import { ANNOUNCEMENTS } from './announcements';

/** Thin strip with scrolling announcements. Stops when you point at it; the X hides it for this visit. */
export default function AnnouncementStrip() {
  const [hidden, setHidden] = useState(false);
  if (hidden || ANNOUNCEMENTS.length === 0) return null;

  // The list is written twice so the scrolling can loop without a jump
  const messages = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];

  return (
    <div className="relative flex h-9 items-center overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-xs font-bold text-white print:hidden">
      <span className="relative z-10 flex h-full shrink-0 items-center gap-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 font-extrabold uppercase tracking-wider">
        <Icon name="megaphone" className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">News</span>
      </span>
      <div className="group min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {messages.map((message, index) => (
            <span key={index} className="flex items-center gap-2 whitespace-nowrap px-8" aria-hidden={index >= ANNOUNCEMENTS.length}>
              <span>{message.icon}</span>
              {message.text}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="relative z-10 flex h-full shrink-0 items-center px-3 text-slate-400 transition hover:text-white"
        aria-label="Hide announcements"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

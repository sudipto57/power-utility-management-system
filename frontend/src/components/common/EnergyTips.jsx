import { useEffect, useState } from 'react';
import Icon from './Icon';

// Edit or add tips here
const TIPS = [
  { icon: 'bulb', title: 'Switch to LED bulbs', text: 'LED bulbs use up to 80% less electricity than old bulbs and last much longer.' },
  { icon: 'fridge', title: 'Keep the fridge closed', text: 'Every time the door opens, cold air escapes and the fridge works harder.' },
  { icon: 'plug', title: 'Unplug idle chargers', text: 'Chargers and TVs on standby still use power. Switch them off at the wall.' },
  { icon: 'fan', title: 'Fan before air-conditioner', text: 'A ceiling fan uses a small part of the power an air-conditioner needs.' },
  { icon: 'shirt', title: 'Iron clothes in one go', text: 'Heating the iron again and again wastes energy. Iron everything at once.' },
  { icon: 'sun', title: 'Use daylight', text: 'Open curtains during the day and keep the lights off when the room is bright.' },
];

/** Tips that slide in one after another every 6 seconds. Pointing at the card pauses it. */
export default function EnergyTips() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(timer);
  }, [paused]);

  const tip = TIPS[index];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* key = index, so each new tip plays the slide-in animation */}
      <div key={index} className="flex animate-slide-in items-start gap-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 p-5 ring-1 ring-emerald-100">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
          <Icon name={tip.icon} className="h-6 w-6" />
        </span>
        <div>
          <p className="font-display text-base font-extrabold text-sand-900">{tip.title}</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-sand-600">{tip.text}</p>
        </div>
      </div>

      {/* Dots: show which tip is open and jump to another one */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {TIPS.map((t, i) => (
            <button
              key={t.title}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-emerald-500' : 'w-2 bg-sand-200 hover:bg-sand-300'}`}
              aria-label={`Show tip ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
          className="flex items-center gap-1 text-xs font-extrabold text-emerald-600 hover:underline"
        >
          Next tip <Icon name="arrowRight" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

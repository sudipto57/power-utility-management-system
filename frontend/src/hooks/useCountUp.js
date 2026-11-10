import { useEffect, useState } from 'react';

/** Animates a number from 0 up to `target` (used by the stat cards). */
export default function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const end = Number(target) || 0;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animation = { frame: 0 };
    const start = performance.now();

    const tick = (now) => {
      const progress = reduceMotion || end === 0 ? 1 : Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out
      setValue(end * eased);
      if (progress < 1) animation.frame = requestAnimationFrame(tick);
    };

    animation.frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation.frame);
  }, [target, duration]);

  return value;
}

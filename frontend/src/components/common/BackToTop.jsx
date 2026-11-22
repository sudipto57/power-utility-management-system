import { useEffect, useState } from 'react';
import Icon from './Icon';

/** Round "back to top" button. It appears after you scroll down a long page. */
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-ember via-flame to-dusk text-white shadow-lg shadow-orange-300/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl print:hidden ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <Icon name="arrowLeft" className="h-5 w-5 rotate-90" strokeWidth={2.5} />
    </button>
  );
}

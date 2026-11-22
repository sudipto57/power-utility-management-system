import { useEffect } from 'react';

/**
 * First page: every element with the class "reveal" fades in and rises into place
 * the first time it scrolls into view (the CSS for .reveal is in index.css).
 * IntersectionObserver tells us when an element appears, without running code on every scroll.
 */
export default function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); // only once, it does not hide again
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px' } // start a little before the element is fully on screen
    );
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

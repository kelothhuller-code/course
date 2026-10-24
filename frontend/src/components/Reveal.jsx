import { useEffect } from 'react';

/**
 * Scroll-reveal: any element with className="reveal" fades/slides in once when it enters
 * the viewport. Content is visible by default; the hidden state only applies after this
 * hook adds `js-reveal` to <html>, and never when the user prefers reduced motion.
 * Mount once (in App). It re-scans on route changes and DOM updates.
 */
export function useScrollReveal(dep) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const root = document.documentElement;
    root.classList.add('js-reveal');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    // Track bound elements per effect run (not on the DOM), so a re-run after cleanup
    // (route change, React StrictMode) observes them again instead of leaving them hidden.
    const bound = new WeakSet();
    const scan = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        if (bound.has(el)) return;
        bound.add(el);
        // Anything already on screen at load shows immediately (no flash on the fold).
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-visible');
        else io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [dep]);
}

export default function ScrollReveal({ watch }) {
  useScrollReveal(watch);
  return null;
}

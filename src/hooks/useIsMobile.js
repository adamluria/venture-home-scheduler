import { useState, useEffect } from 'react';

/**
 * Returns `true` when the viewport is narrower than `breakpoint` px.
 * Updates on resize. Default breakpoint is 768 (covers phones + narrow tablets).
 *
 * Used to stack desktop grids into vertical mobile-friendly layouts.
 */
export default function useIsMobile(breakpoint = 768) {
  const getMatch = () =>
    typeof window !== 'undefined' && window.innerWidth < breakpoint;

  const [isMobile, setIsMobile] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);

    // Set initial value (covers SSR/hydration)
    setIsMobile(mql.matches);

    // addEventListener is standard; addListener for older browsers
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, [breakpoint]);

  return isMobile;
}

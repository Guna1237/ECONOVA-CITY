import { useEffect, useState } from 'react';

/**
 * The breakpoint at which the player surface stops being a phone game and
 * becomes a table with a standing side column. It matches the media query in
 * app.css, so layout and composition never disagree.
 */
const WIDE = '(min-width: 1000px) and (min-height: 640px)';

export const useWideLayout = (): boolean => {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(WIDE).matches
  );

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const onChange = (event: MediaQueryListEvent) => setWide(event.matches);
    query.addEventListener('change', onChange);
    setWide(query.matches);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return wide;
};

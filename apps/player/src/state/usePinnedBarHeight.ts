import { useCallback, useRef } from 'react';

const PROPERTY = '--player-bar-h';

/**
 * The phone's pinned control bar covers the bottom of the page, so the page
 * needs exactly that much room underneath its last element or the end of the
 * content hides behind the bar. The bar's height changes with the turn (four
 * actions, two, or none while someone else plays), so it is measured rather
 * than guessed, and published as a custom property the layout pads by.
 *
 * Returns a callback ref: attaching it starts observing, detaching (the bar
 * unmounts, or the layout goes wide) stops and clears the padding.
 */
export const usePinnedBarHeight = (): ((element: HTMLElement | null) => void) => {
  const observer = useRef<ResizeObserver | null>(null);

  return useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    const root = document.documentElement;

    if (element === null || typeof ResizeObserver === 'undefined') {
      root.style.removeProperty(PROPERTY);
      return;
    }

    const publish = (): void => {
      // Only a bar actually pinned to the viewport takes space from the page.
      const pinned = getComputedStyle(element).position === 'fixed';
      if (pinned) root.style.setProperty(PROPERTY, `${Math.ceil(element.offsetHeight)}px`);
      else root.style.removeProperty(PROPERTY);
    };

    publish();
    observer.current = new ResizeObserver(publish);
    observer.current.observe(element);
  }, []);
};

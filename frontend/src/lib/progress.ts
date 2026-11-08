import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface ReadingSpot {
  progress: number;
  /** Document offset of the first piece of text still on screen. */
  position: number | null;
}

/** How far the bottom of the viewport is through `container`, from 0 to 1. */
export function measureProgress(containerTop: number, height: number, viewport: number): number {
  if (height <= 0) return 1;
  const seen = viewport - containerTop;
  return Math.min(1, Math.max(0, seen / height));
}

/** The first text piece in `container` whose bottom edge is below the top of the screen. */
export function firstVisibleOffset(container: HTMLElement): number | null {
  for (const el of container.querySelectorAll<HTMLElement>('[data-offset]')) {
    if (el.getBoundingClientRect().bottom > 0) return Number(el.dataset.offset);
  }
  return null;
}

/** Scrolls to the piece of text containing `position`. */
export function scrollToOffset(container: HTMLElement, position: number) {
  let target: HTMLElement | null = null;
  for (const el of container.querySelectorAll<HTMLElement>('[data-offset]')) {
    if (Number(el.dataset.offset) > position) break;
    target = el;
  }
  target?.scrollIntoView?.({ block: 'start' });
}

export function readingSpot(container: HTMLElement): ReadingSpot {
  const rect = container.getBoundingClientRect();
  return {
    progress: Math.round(measureProgress(rect.top, rect.height, window.innerHeight) * 1000) / 1000,
    position: firstVisibleOffset(container),
  };
}

/**
 * Reports the reading position a second after opening and after scrolling
 * stops, and once more when the page is hidden (switching tabs, closing it).
 */
export function useReadingProgress(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onSave: (spot: ReadingSpot, leaving: boolean) => void,
  { saveOnOpen = true }: { saveOnOpen?: boolean } = {},
) {
  const latest = useRef(onSave);
  useEffect(() => {
    latest.current = onSave;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    let last = '';

    function save(leaving: boolean) {
      const container = containerRef.current;
      if (!container) return;
      const spot = readingSpot(container);
      const key = `${spot.progress}:${spot.position}`;
      if (key === last) return;
      last = key;
      latest.current(spot, leaving);
    }
    function onScroll() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => save(false), 1000);
    }
    function onHide() {
      if (document.visibilityState === 'hidden') save(true);
    }

    // A short document may never scroll at all, so also save once after opening.
    if (saveOnOpen) onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [containerRef, enabled, saveOnOpen]);
}

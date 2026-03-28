/** Smooth scrolling, unless the user asked the system for less motion. */
export function scrollBehavior(): ScrollBehavior {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 'auto' : 'smooth';
}

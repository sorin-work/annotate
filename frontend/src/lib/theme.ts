export type Theme = 'light' | 'dark';

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');

export function systemTheme(): Theme {
  return darkQuery()?.matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/** Follows the operating system's light/dark setting, including later changes. */
export function followSystemTheme(): () => void {
  applyTheme(systemTheme());
  const query = darkQuery();
  if (!query) return () => {};
  const onChange = () => applyTheme(systemTheme());
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

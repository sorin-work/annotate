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

export type ThemePreference = 'system' | Theme;

const STORAGE_KEY = 'annotate.theme';
let stopFollowing: (() => void) | null = null;

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Applies the saved preference; call once on startup. */
export function startTheme() {
  stopFollowing?.();
  stopFollowing = null;
  const preference = getThemePreference();
  if (preference === 'system') stopFollowing = followSystemTheme();
  else applyTheme(preference);
}

export function setThemePreference(preference: ThemePreference) {
  if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, preference);
  startTheme();
}

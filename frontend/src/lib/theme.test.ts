import { afterEach, describe, expect, it, vi } from 'vitest';
import { followSystemTheme, getThemePreference, setThemePreference } from './theme';

function mockSystem(dark: boolean) {
  const listeners: (() => void)[] = [];
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: () => void) => listeners.push(listener),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    change(nextDark: boolean) {
      query.matches = nextDark;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe('followSystemTheme', () => {
  it('applies the system theme and follows changes', () => {
    const system = mockSystem(true);
    followSystemTheme();
    expect(document.documentElement.dataset.theme).toBe('dark');

    system.change(false);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('defaults to light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    followSystemTheme();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('theme preference', () => {
  it('overrides the system theme until set back to system', () => {
    const system = mockSystem(false);
    setThemePreference('dark');
    expect(getThemePreference()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    // A fixed choice ignores later system changes.
    system.change(false);
    expect(document.documentElement.dataset.theme).toBe('dark');

    setThemePreference('system');
    expect(localStorage.getItem('annotate.theme')).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem('annotate.theme', 'sepia');
    expect(getThemePreference()).toBe('system');
  });
});

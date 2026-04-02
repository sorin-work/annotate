import { afterEach, describe, expect, it, vi } from 'vitest';
import { followSystemTheme } from './theme';

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

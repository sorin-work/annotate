import { describe, expect, it } from 'vitest';
import { parsePage } from './params';

describe('parsePage', () => {
  it('reads positive integers', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage(null)).toBe(1);
  });

  it('falls back to the first page for anything else', () => {
    for (const value of ['', 'abc', '0', '-2', '1.5', 'Infinity']) {
      expect(parsePage(value)).toBe(1);
    }
  });
});

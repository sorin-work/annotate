import { describe, expect, it } from 'vitest';
import { parseId, parsePage } from './params';

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

describe('parseId', () => {
  it('reads ids and ignores junk', () => {
    expect(parseId('12')).toBe(12);
    for (const value of [null, '', 'abc', '0', '2.5', '-1']) {
      expect(parseId(value)).toBeNull();
    }
  });
});

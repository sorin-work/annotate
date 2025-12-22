import { describe, expect, it } from 'vitest';
import { plural, readingTime, timeAgo } from './format';

describe('format helpers', () => {
  it('pluralises', () => {
    expect(plural(1, 'highlight')).toBe('1 highlight');
    expect(plural(3, 'highlight')).toBe('3 highlights');
    expect(plural(0, 'entry', 'entries')).toBe('0 entries');
  });

  it('estimates reading time', () => {
    expect(readingTime(0)).toBe('1 min read');
    expect(readingTime(2300)).toBe('10 min read');
  });

  it('formats relative times', () => {
    const now = new Date('2026-03-10T12:00:00Z');
    expect(timeAgo('2026-03-10T11:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-03-10T09:00:00Z', now)).toBe('3 hours ago');
    expect(timeAgo('2026-03-09T12:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('2026-02-01T12:00:00Z', now)).toBe('last month');
  });

  it('handles times in the future and rounds to the nearest unit', () => {
    const now = new Date('2026-03-10T12:00:00Z');
    expect(timeAgo('2026-03-10T12:30:00Z', now)).toBe('in 30 minutes');
    expect(timeAgo('2026-03-12T12:00:00Z', now)).toBe('in 2 days');
    expect(timeAgo('2026-03-10T10:20:00Z', now)).toBe('2 hours ago');
    expect(timeAgo('2025-03-01T12:00:00Z', now)).toBe('last year');
  });

  it('rounds reading time to whole minutes', () => {
    expect(readingTime(344)).toBe('1 min read');
    expect(readingTime(346)).toBe('2 min read');
  });
});

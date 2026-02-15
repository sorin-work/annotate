import { describe, expect, it } from 'vitest';
import { quoteAsMarkdown } from './quote';

describe('quoteAsMarkdown', () => {
  it('quotes every line', () => {
    expect(quoteAsMarkdown('  First line\n\nSecond line  ')).toBe('> First line\n>\n> Second line');
  });

  it('adds the source and the note', () => {
    expect(quoteAsMarkdown('Simplify.', { title: 'Walden', note: ' Still true. ' })).toBe(
      '> Simplify.\n>\n> — Walden\n\nStill true.',
    );
  });
});

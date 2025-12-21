import { describe, expect, it } from 'vitest';
import { toBlocks } from './blocks';

const visible = (content: string, kind: 'text' | 'markdown') =>
  toBlocks(content, kind).map((b) => [b.kind, content.slice(b.textStart, b.end)]);

describe('toBlocks', () => {
  it('splits plain text into paragraphs on blank lines', () => {
    const content = 'First line\nstill first\n\n\nSecond';
    expect(visible(content, 'text')).toEqual([
      ['paragraph', 'First line\nstill first'],
      ['paragraph', 'Second'],
    ]);
  });

  it('does not treat markdown syntax specially in plain text', () => {
    expect(visible('# Not a heading', 'text')).toEqual([['paragraph', '# Not a heading']]);
  });

  it('recognises markdown headings, quotes and list items', () => {
    const content = '# Title\n\nIntro text\n> quoted\n- one\n2. two\n\n## Next';
    const blocks = toBlocks(content, 'markdown');
    expect(blocks.map((b) => [b.kind, b.level, content.slice(b.textStart, b.end)])).toEqual([
      ['heading', 1, 'Title'],
      ['paragraph', undefined, 'Intro text'],
      ['quote', undefined, 'quoted'],
      ['list-item', undefined, 'one'],
      ['list-item', undefined, 'two'],
      ['heading', 2, 'Next'],
    ]);
  });

  it('keeps fenced code blocks together without the fences', () => {
    const content = 'Before\n```\nconst a = 1;\n\nconst b = 2;\n```\nAfter';
    expect(visible(content, 'markdown')).toEqual([
      ['paragraph', 'Before'],
      ['code', 'const a = 1;\n\nconst b = 2;'],
      ['paragraph', 'After'],
    ]);
  });

  it('keeps offsets pointing into the original text', () => {
    const content = 'Intro\n\n## Heading';
    const heading = toBlocks(content, 'markdown')[1]!;
    expect(heading.start).toBe(7);
    expect(heading.textStart).toBe(10);
    expect(content.slice(heading.textStart, heading.end)).toBe('Heading');
  });
});

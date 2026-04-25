import { describe, expect, it } from 'vitest';
import { layoutPieces, parseInline } from './inline';

function styled(text: string) {
  const { hidden, spans } = parseInline(text, 0, text.length);
  return {
    hidden: hidden.map((r) => text.slice(r.start, r.end)),
    spans: spans.map((s) => [s.style, text.slice(s.start, s.end)]),
  };
}

describe('parseInline', () => {
  it('finds bold, italic and code', () => {
    expect(styled('a **bold** and *soft* or _also_ with `x = 1`')).toEqual({
      hidden: ['**', '**', '*', '*', '_', '_', '`', '`'],
      spans: [
        ['strong', 'bold'],
        ['em', 'soft'],
        ['em', 'also'],
        ['code', 'x = 1'],
      ],
    });
  });

  it('leaves loose markers alone', () => {
    expect(styled('2 * 3 * 4, snake_case_name, a ** b').spans).toEqual([]);
    expect(styled('unclosed *emphasis').spans).toEqual([]);
  });

  it('does not style across paragraphs', () => {
    expect(styled('*one\n\ntwo*').spans).toEqual([]);
    expect(styled('*one\ntwo*').spans).toEqual([['em', 'one\ntwo']]);
  });

  it('keeps markers inside code as text', () => {
    expect(styled('`**not bold**`').spans).toEqual([['code', '**not bold**']]);
  });

  it('only looks inside the given range', () => {
    const text = '*a* *b*';
    const { spans } = parseInline(text, 4, text.length);
    expect(spans).toEqual([{ start: 5, end: 6, style: 'em' }]);
  });
});

describe('layoutPieces', () => {
  it('drops markers and keeps highlight segments', () => {
    const text = 'a **bold** b';
    const layout = parseInline(text, 0, text.length);
    // One highlight over "bol".
    const segments = [
      { start: 0, end: 4, highlightIds: [] },
      { start: 4, end: 7, highlightIds: [1] },
      { start: 7, end: 12, highlightIds: [] },
    ];
    const pieces = layoutPieces(segments, layout).map((p) => [
      text.slice(p.start, p.end),
      p.highlightIds.length > 0,
      p.style ?? null,
    ]);
    expect(pieces).toEqual([
      ['a ', false, null],
      ['bol', true, 'strong'],
      ['d', false, 'strong'],
      [' b', false, null],
    ]);
  });
});

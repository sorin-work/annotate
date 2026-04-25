import type { Range, Segment } from './segments';

export type InlineStyle = 'strong' | 'em' | 'code';

/** Visible text styled by inline Markdown, as offsets into the document. */
export interface InlineSpan extends Range {
  style: InlineStyle;
}

export interface InlineLayout {
  /** Marker characters (`**`, `` ` ``…) that are not rendered. */
  hidden: Range[];
  spans: InlineSpan[];
}

const WORD = /[\p{L}\p{N}]/u;

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD.test(char);
}

/**
 * Finds `**bold**`, `*italic*`, `_italic_` and `` `code` `` between `start`
 * and `end`. Emphasis must hug its text (`* not this *`), underscores inside
 * words (`snake_case`) are left alone and nothing spans a blank line.
 */
export function parseInline(content: string, start: number, end: number): InlineLayout {
  const hidden: Range[] = [];
  const spans: InlineSpan[] = [];

  function closing(marker: string, from: number): number {
    const index = content.indexOf(marker, from);
    if (index === -1 || index + marker.length > end) return -1;
    return content.slice(from, index).includes('\n\n') ? -1 : index;
  }

  let i = start;
  while (i < end) {
    const char = content[i]!;

    if (char === '`') {
      const close = closing('`', i + 1);
      if (close > i + 1) {
        hidden.push({ start: i, end: i + 1 }, { start: close, end: close + 1 });
        spans.push({ start: i + 1, end: close, style: 'code' });
        i = close + 1;
        continue;
      }
    }

    if (char === '*' || char === '_') {
      const marker = content.startsWith(char.repeat(2), i) ? char.repeat(2) : char;
      const textStart = i + marker.length;
      const close = closing(marker, textStart);
      const inner = close === -1 ? '' : content.slice(textStart, close);
      const hugs = inner.length > 0 && inner.trim() === inner;
      const wordSafe =
        char === '*' ||
        (!isWordChar(content[i - 1]) && !isWordChar(content[close + marker.length]));
      if (hugs && wordSafe) {
        hidden.push({ start: i, end: textStart }, { start: close, end: close + marker.length });
        spans.push({ start: textStart, end: close, style: marker.length === 2 ? 'strong' : 'em' });
        i = close + marker.length;
        continue;
      }
      i += marker.length;
      continue;
    }

    i++;
  }
  return { hidden, spans };
}

export interface Piece extends Segment {
  style?: InlineStyle;
  /** Index into `layout.spans`, so neighbouring pieces of one span can share a wrapper. */
  span?: number;
}

/**
 * Cuts highlight segments further at inline Markdown boundaries and drops the
 * hidden markers, keeping every piece's offsets into the document.
 */
export function layoutPieces(segments: Segment[], layout: InlineLayout): Piece[] {
  const cuts = new Set<number>();
  for (const r of [...layout.hidden, ...layout.spans]) {
    cuts.add(r.start);
    cuts.add(r.end);
  }
  const sortedCuts = [...cuts].sort((a, b) => a - b);

  const pieces: Piece[] = [];
  for (const segment of segments) {
    const points = [
      segment.start,
      ...sortedCuts.filter((p) => p > segment.start && p < segment.end),
      segment.end,
    ];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i]!;
      const end = points[i + 1]!;
      if (layout.hidden.some((h) => h.start <= start && h.end >= end)) continue;
      const span = layout.spans.findIndex((s) => s.start <= start && s.end >= end);
      pieces.push({
        start,
        end,
        highlightIds: segment.highlightIds,
        ...(span === -1 ? {} : { style: layout.spans[span]!.style, span }),
      });
    }
  }
  return pieces;
}

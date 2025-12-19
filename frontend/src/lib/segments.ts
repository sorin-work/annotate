export interface Range {
  start: number;
  end: number;
}

export interface Segment extends Range {
  /** Highlights covering this piece of text, oldest first. */
  highlightIds: number[];
}

/**
 * Splits `[start, end)` into consecutive pieces so that each piece is covered
 * by exactly the same set of highlights. Overlapping highlights are fine.
 */
export function segmentRange<T extends Range & { id: number }>(
  start: number,
  end: number,
  highlights: readonly T[],
): Segment[] {
  if (end <= start) return [];
  const relevant = highlights.filter((h) => h.end > start && h.start < end);
  const cuts = new Set<number>([start, end]);
  for (const h of relevant) {
    if (h.start > start) cuts.add(h.start);
    if (h.end < end) cuts.add(h.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]!;
    const to = points[i + 1]!;
    const ids = relevant.filter((h) => h.start <= from && h.end >= to).map((h) => h.id);
    const previous = segments[segments.length - 1];
    if (previous && sameIds(previous.highlightIds, ids)) {
      previous.end = to;
    } else {
      segments.push({ start: from, end: to, highlightIds: ids });
    }
  }
  return segments;
}

function sameIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

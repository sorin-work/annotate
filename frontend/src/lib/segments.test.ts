import { describe, expect, it } from 'vitest';
import { segmentRange } from './segments';

describe('segmentRange', () => {
  it('returns one plain segment without highlights', () => {
    expect(segmentRange(0, 10, [])).toEqual([{ start: 0, end: 10, highlightIds: [] }]);
  });

  it('splits around a highlight', () => {
    expect(segmentRange(0, 10, [{ id: 1, start: 3, end: 6 }])).toEqual([
      { start: 0, end: 3, highlightIds: [] },
      { start: 3, end: 6, highlightIds: [1] },
      { start: 6, end: 10, highlightIds: [] },
    ]);
  });

  it('handles overlapping highlights', () => {
    const segments = segmentRange(0, 10, [
      { id: 1, start: 2, end: 6 },
      { id: 2, start: 4, end: 8 },
    ]);
    expect(segments).toEqual([
      { start: 0, end: 2, highlightIds: [] },
      { start: 2, end: 4, highlightIds: [1] },
      { start: 4, end: 6, highlightIds: [1, 2] },
      { start: 6, end: 8, highlightIds: [2] },
      { start: 8, end: 10, highlightIds: [] },
    ]);
  });

  it('clips highlights that start or end outside the range', () => {
    expect(segmentRange(5, 10, [{ id: 1, start: 0, end: 7 }])).toEqual([
      { start: 5, end: 7, highlightIds: [1] },
      { start: 7, end: 10, highlightIds: [] },
    ]);
  });

  it('merges neighbouring pieces with the same highlights', () => {
    const segments = segmentRange(0, 10, [
      { id: 1, start: 0, end: 10 },
      { id: 2, start: 20, end: 30 },
    ]);
    expect(segments).toEqual([{ start: 0, end: 10, highlightIds: [1] }]);
  });

  it('returns nothing for an empty range', () => {
    expect(segmentRange(4, 4, [])).toEqual([]);
  });

  it('keeps touching highlights apart', () => {
    expect(
      segmentRange(0, 9, [
        { id: 1, start: 0, end: 3 },
        { id: 2, start: 3, end: 6 },
      ]),
    ).toEqual([
      { start: 0, end: 3, highlightIds: [1] },
      { start: 3, end: 6, highlightIds: [2] },
      { start: 6, end: 9, highlightIds: [] },
    ]);
  });

  it('lists every highlight covering a piece, in the order given', () => {
    expect(
      segmentRange(0, 4, [
        { id: 7, start: 0, end: 4 },
        { id: 3, start: 0, end: 4 },
      ]),
    ).toEqual([{ start: 0, end: 4, highlightIds: [7, 3] }]);
  });
});

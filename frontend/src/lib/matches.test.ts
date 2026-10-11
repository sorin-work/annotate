import { describe, expect, it } from 'vitest';
import { splitMatches } from './matches';

describe('splitMatches', () => {
  it('marks every case-insensitive match', () => {
    expect(splitMatches('Read slowly. READ again.', 'read')).toEqual([
      { text: 'Read', match: true },
      { text: ' slowly. ', match: false },
      { text: 'READ', match: true },
      { text: ' again.', match: false },
    ]);
  });

  it('leaves text alone without a query or a match', () => {
    expect(splitMatches('Walden', ' ')).toEqual([{ text: 'Walden', match: false }]);
    expect(splitMatches('Walden', 'pond')).toEqual([{ text: 'Walden', match: false }]);
  });
});

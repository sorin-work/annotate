import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Matched from './Matched';

describe('Matched', () => {
  it('wraps each match in a mark and keeps the rest as text', () => {
    const { container } = render(
      <p>
        <Matched text="Notes on notes, NOTES." query="notes" />
      </p>,
    );
    expect(container.textContent).toBe('Notes on notes, NOTES.');
    expect([...container.querySelectorAll('mark.match')].map((m) => m.textContent)).toEqual([
      'Notes',
      'notes',
      'NOTES',
    ]);
  });

  it('renders plain text without a query', () => {
    const { container } = render(<Matched text="Walden" />);
    expect(container.innerHTML).toBe('Walden');
  });
});

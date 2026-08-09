import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import HighlightCard from './HighlightCard';

const highlight = {
  id: 3,
  document_id: 9,
  document_title: 'Walden',
  start_offset: 0,
  end_offset: 10,
  quote: 'Simplicity, simplicity, simplicity!',
  color: 'pink' as const,
  note: 'Still true.',
  tags: ['simplicity'],
  comment_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('HighlightCard', () => {
  it('shows the quote, note, tags and a link back to the document', () => {
    render(
      <MemoryRouter>
        <HighlightCard highlight={highlight} />
      </MemoryRouter>,
    );
    expect(screen.getByText(highlight.quote)).toBeInTheDocument();
    expect(screen.getByText('Still true.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#simplicity' })).toHaveAttribute(
      'href',
      '/highlights?tag=simplicity',
    );
    expect(screen.getByRole('link', { name: 'Walden' })).toHaveAttribute(
      'href',
      '/documents/9?highlight=3',
    );
  });

  it('can hide the document link', () => {
    render(
      <MemoryRouter>
        <HighlightCard highlight={highlight} showDocument={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Walden' })).not.toBeInTheDocument();
  });

  it('copies the highlight as a markdown quote', async () => {
    const events = userEvent.setup();
    render(
      <MemoryRouter>
        <HighlightCard highlight={highlight} />
      </MemoryRouter>,
    );
    await events.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe(
      '> Simplicity, simplicity, simplicity!\n>\n> — Walden\n\nStill true.',
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Highlight } from '../api/types';
import Reader from './Reader';

const CONTENT = '# Title\n\nThe quick brown fox jumps.\n\n> A quote';

function makeHighlight(id: number, quote: string, extra: Partial<Highlight> = {}): Highlight {
  const start = CONTENT.indexOf(quote);
  return {
    id,
    document_id: 1,
    start_offset: start,
    end_offset: start + quote.length,
    quote,
    color: 'yellow',
    note: null,
    tags: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

describe('Reader', () => {
  it('renders markdown blocks without their markers', () => {
    render(
      <Reader
        content={CONTENT}
        sourceType="markdown"
        highlights={[]}
        onSelect={() => {}}
        onHighlightClick={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('A quote').closest('blockquote')).not.toBeNull();
    expect(screen.queryByText(/#/)).not.toBeInTheDocument();
  });

  it('marks highlights with their colour and reports clicks', () => {
    const onHighlightClick = vi.fn();
    render(
      <Reader
        content={CONTENT}
        sourceType="markdown"
        highlights={[makeHighlight(7, 'brown fox', { color: 'green', note: 'A note' })]}
        activeId={7}
        onSelect={() => {}}
        onHighlightClick={onHighlightClick}
      />,
    );
    const mark = screen.getByText('brown fox');
    expect(mark.tagName).toBe('MARK');
    expect(mark).toHaveClass('hl-green', 'hl-active');
    expect(mark).toHaveAttribute('title', 'A note');

    fireEvent.click(mark);
    expect(onHighlightClick).toHaveBeenCalledWith(7);
  });

  it('renders plain text as-is', () => {
    render(
      <Reader
        content={CONTENT}
        sourceType="text"
        highlights={[]}
        onSelect={() => {}}
        onHighlightClick={() => {}}
      />,
    );
    expect(screen.getByText('# Title')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

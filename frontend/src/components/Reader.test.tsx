import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('renders inline markdown and keeps it highlightable', () => {
    const content = 'Some **bold words** and `code`.';
    const start = content.indexOf('bold');
    render(
      <Reader
        content={content}
        sourceType="markdown"
        highlights={[
          { ...makeHighlight(3, 'x'), start_offset: start, end_offset: start + 4, quote: 'bold' },
        ]}
        onSelect={() => {}}
        onHighlightClick={() => {}}
      />,
    );
    const reader = screen.getByTestId('reader');
    expect(reader).toHaveTextContent('Some bold words and code.');
    expect(reader.querySelector('strong')).toHaveTextContent('bold words');
    expect(reader.querySelector('code')).toHaveTextContent('code');
    const mark = screen.getByText('bold');
    expect(mark.tagName).toBe('MARK');
    expect(mark).toHaveAttribute('data-offset', String(start));
  });

  it('renders markdown links that open in a new tab', () => {
    render(
      <Reader
        content="Read [the essay](https://example.com/essay) first."
        sourceType="markdown"
        highlights={[]}
        onSelect={() => {}}
        onHighlightClick={() => {}}
      />,
    );
    const link = screen.getByRole('link', { name: 'the essay' });
    expect(link).toHaveAttribute('href', 'https://example.com/essay');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('reader')).toHaveTextContent('Read the essay first.');
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

  it('reports selections made without the mouse', async () => {
    const onSelect = vi.fn();
    render(
      <Reader
        content={CONTENT}
        sourceType="markdown"
        highlights={[]}
        onSelect={onSelect}
        onHighlightClick={() => {}}
      />,
    );
    const text = screen.getByText('The quick brown fox jumps.').firstChild!;
    const range = document.createRange();
    range.setStart(text, 4);
    range.setEnd(text, 9);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    const start = CONTENT.indexOf('quick');
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ start, end: start + 5 })),
    );
  });
});

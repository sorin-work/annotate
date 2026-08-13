import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import ActivityPage from './ActivityPage';

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

const highlightItem = {
  type: 'highlight_added' as const,
  at: '2026-05-30T10:00:00Z',
  document: { id: 5, title: 'Walden' },
  highlight: { id: 11, quote: 'Simplify, simplify.', color: 'green' as const, note: 'Yes.' },
};
const documentItem = {
  type: 'document_added' as const,
  at: '2026-05-01T10:00:00Z',
  document: { id: 6, title: 'Self-Reliance' },
  highlight: null,
};

describe('ActivityPage', () => {
  it('lists highlights and documents and loads older items', async () => {
    const { fetchMock } = mockApi({
      'GET /auth/me': user,
      'GET /activity': ({ url }: { url: string }) =>
        url.includes('before=')
          ? { items: [documentItem], next_before: null }
          : { items: [highlightItem], next_before: '2026-05-30T10:00:00Z' },
    });
    renderApp(<ActivityPage />);

    expect(await screen.findByRole('link', { name: 'Simplify, simplify.' })).toHaveAttribute(
      'href',
      '/documents/5?highlight=11',
    );
    expect(screen.getByText('Yes.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Older' }));
    expect(await screen.findByRole('link', { name: 'Self-Reliance' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Older' })).not.toBeInTheDocument(),
    );
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('before=2026-05-30'))).toBe(true);
  });

  it('shows comments with the highlight they belong to', async () => {
    mockApi({
      'GET /auth/me': user,
      'GET /activity': {
        items: [{ ...highlightItem, type: 'comment_added', comment: { id: 3, body: 'Reread it' } }],
        next_before: null,
      },
    });
    renderApp(<ActivityPage />);
    expect(await screen.findByText(/Commented in/)).toBeInTheDocument();
    expect(screen.getByText('Reread it')).toBeInTheDocument();
    expect(screen.queryByText('Yes.')).not.toBeInTheDocument();
  });
});

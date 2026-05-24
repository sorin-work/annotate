import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import type { Stats } from '../api/types';
import { mockApi, renderApp, user } from '../test/utils';
import DashboardPage from './DashboardPage';

const stats: Stats = {
  documents: 6,
  highlights: 21,
  notes: 9,
  tags: 12,
  collections: 3,
  words: 14250,
  colors: { yellow: 10, green: 4, blue: 3, pink: 2, purple: 2 },
  top_tags: [{ name: 'attention', count: 5 }],
  weekly: [
    { week_start: '2026-05-11', highlights: 4 },
    { week_start: '2026-05-18', highlights: 17 },
  ],
  most_highlighted: [{ id: 5, title: 'Walden', highlight_count: 8 }],
};

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('DashboardPage', () => {
  it('shows totals, tags, documents and the weekly table', async () => {
    mockApi({ 'GET /auth/me': user, 'GET /stats': stats });
    renderApp(<DashboardPage />);

    expect(await screen.findByText('14,250')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#attention' })).toHaveAttribute(
      'href',
      '/highlights?tag=attention',
    );
    expect(screen.getByRole('link', { name: 'Walden' })).toHaveAttribute('href', '/documents/5');
    expect(screen.getByText('21 highlights in the last 2 weeks')).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Highlights per week' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('explains an empty dashboard', async () => {
    mockApi({
      'GET /auth/me': user,
      'GET /stats': { ...stats, highlights: 0, top_tags: [], most_highlighted: [] },
    });
    renderApp(<DashboardPage />);
    expect(await screen.findByText('Nothing to chart yet')).toBeInTheDocument();
  });
});

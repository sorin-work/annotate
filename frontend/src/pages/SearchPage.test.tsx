import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import SearchPage from './SearchPage';

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('SearchPage', () => {
  it('marks the search words in the results', async () => {
    mockApi({
      'GET /auth/me': user,
      'GET /search': {
        query: 'slow',
        documents: [{ id: 1, title: 'Slow Reading', author: null, snippet: 'Read slowly.' }],
        highlights: [],
      },
    });
    renderApp(<SearchPage />, { route: '/search?q=slow' });

    expect(await screen.findByRole('link', { name: 'Slow Reading' })).toBeInTheDocument();
    const marks = document.querySelectorAll('mark.match');
    expect([...marks].map((m) => m.textContent)).toEqual(['Slow', 'slow']);
  });

  it('says when nothing matched', async () => {
    mockApi({
      'GET /auth/me': user,
      'GET /search': { query: 'zebra', documents: [], highlights: [] },
    });
    renderApp(<SearchPage />, { route: '/search?q=zebra' });
    expect(await screen.findByText('Nothing found for “zebra”.')).toBeInTheDocument();
  });
});

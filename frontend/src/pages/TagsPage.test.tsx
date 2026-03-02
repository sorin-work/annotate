import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import TagsPage from './TagsPage';

const tags = [
  { id: 1, name: 'attention', highlight_count: 2 },
  { id: 2, name: 'habits', highlight_count: 7 },
  { id: 3, name: 'reading', highlight_count: 4 },
];

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

function names() {
  return within(screen.getByRole('list'))
    .getAllByRole('link')
    .map((link) => link.textContent);
}

describe('TagsPage', () => {
  it('orders and filters tags', async () => {
    mockApi({ 'GET /auth/me': user, 'GET /tags': tags });
    renderApp(<TagsPage />);

    await screen.findByRole('link', { name: '#habits' });
    expect(names()).toEqual(['#attention', '#habits', '#reading']);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Order' }), 'usage');
    expect(names()).toEqual(['#habits', '#reading', '#attention']);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Find a tag' }), '#rea');
    expect(names()).toEqual(['#reading']);
  });

  it('renames a tag', async () => {
    const { calls } = mockApi({
      'GET /auth/me': user,
      'GET /tags': tags,
      'PATCH /tags/2': { id: 2, name: 'routines', highlight_count: 7 },
    });
    renderApp(<TagsPage />);

    await screen.findByRole('link', { name: '#habits' });
    await userEvent.click(screen.getAllByRole('button', { name: 'Rename' })[1]!);
    const field = screen.getByRole('textbox', { name: 'New name for habits' });
    await userEvent.clear(field);
    await userEvent.type(field, 'routines{Enter}');

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')).toEqual({
        method: 'PATCH',
        path: '/tags/2',
        body: { name: 'routines' },
      }),
    );
  });
});

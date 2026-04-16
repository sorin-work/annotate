import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import Layout from './Layout';

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('Layout', () => {
  it('focuses the search box on /', async () => {
    mockApi({ 'GET /auth/me': user });
    renderApp(<Layout />);
    await screen.findByText('Reader');
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus();
  });

  it('lists the shortcuts on ?', async () => {
    mockApi({ 'GET /auth/me': user });
    renderApp(<Layout />);
    await screen.findByText('Reader');
    await userEvent.keyboard('?');
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toHaveTextContent('Next / previous highlight');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

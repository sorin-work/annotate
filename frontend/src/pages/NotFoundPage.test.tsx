import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import NotFoundPage from './NotFoundPage';

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('NotFoundPage', () => {
  it('names the missing path and links back', async () => {
    mockApi({ 'GET /auth/me': user });
    renderApp(<NotFoundPage />, { route: '/documents/nope/extra' });
    expect(await screen.findByText("This page doesn't exist")).toBeInTheDocument();
    expect(screen.getByText('/documents/nope/extra')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'library' })).toHaveAttribute('href', '/');
  });
});

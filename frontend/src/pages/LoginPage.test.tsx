import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import LoginPage from './LoginPage';

afterEach(() => vi.unstubAllGlobals());

describe('LoginPage', () => {
  it('signs in and stores the token', async () => {
    const { calls } = mockApi({
      'POST /auth/login': () =>
        new Response(JSON.stringify({ access_token: 'token-123', token_type: 'bearer', user }), {
          status: 200,
        }),
    });
    renderApp(<LoginPage />, { route: '/login', path: '/login' });

    await userEvent.type(screen.getByLabelText('Email'), 'reader@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('token-123');
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'reader@example.com', password: 'correct-horse' },
    });
  });

  it('shows the error from the API', async () => {
    mockApi({
      'POST /auth/login': () =>
        new Response(
          JSON.stringify({
            error: { code: 'invalid_credentials', message: 'Incorrect email or password' },
          }),
          { status: 401 },
        ),
    });
    renderApp(<LoginPage />, { route: '/login', path: '/login' });

    await userEvent.type(screen.getByLabelText('Email'), 'reader@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
    expect(tokenStore.get()).toBeNull();
  });
});

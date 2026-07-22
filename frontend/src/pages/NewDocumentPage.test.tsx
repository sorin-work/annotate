import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import NewDocumentPage from './NewDocumentPage';

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('NewDocumentPage', () => {
  it('imports a web page and opens it', async () => {
    const { calls } = mockApi({
      'GET /auth/me': user,
      'POST /documents/import': { id: 42 },
    });
    renderApp(<NewDocumentPage />, { route: '/documents/new', path: '/documents/new' });

    await userEvent.click(await screen.findByRole('tab', { name: 'From a web page' }));
    const submit = screen.getByRole('button', { name: 'Add document' });
    expect(submit).toBeDisabled();

    await userEvent.type(
      screen.getByRole('textbox', { name: /^Web address/ }),
      'https://example.com/essay',
    );
    await userEvent.click(submit);

    expect(await screen.findByText('Other page')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      url: 'https://example.com/essay',
      title: null,
    });
  });

  it('shows why an import failed', async () => {
    mockApi({
      'GET /auth/me': user,
      'POST /documents/import': () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'blocked_url',
              message: 'Importing from private network addresses is not allowed',
            },
          }),
          { status: 400 },
        ),
    });
    renderApp(<NewDocumentPage />, { route: '/documents/new', path: '/documents/new' });
    await userEvent.click(await screen.findByRole('tab', { name: 'From a web page' }));
    await userEvent.type(screen.getByRole('textbox', { name: /^Web address/ }), 'http://10.0.0.1/');
    await userEvent.click(screen.getByRole('button', { name: 'Add document' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('private network addresses'),
    );
  });
});

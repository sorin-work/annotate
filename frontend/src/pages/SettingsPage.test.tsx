import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import { mockApi, renderApp, user } from '../test/utils';
import SettingsPage from './SettingsPage';

beforeEach(() => tokenStore.set('token'));
afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe('SettingsPage', () => {
  it('switches the theme and remembers it', async () => {
    mockApi({ 'GET /auth/me': user });
    renderApp(<SettingsPage />);

    const dark = await screen.findByRole('radio', { name: 'Dark' });
    expect(screen.getByRole('radio', { name: 'Same as the system' })).toBeChecked();
    await userEvent.click(dark);

    expect(dark).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('annotate.theme')).toBe('dark');
  });

  it('saves the display name', async () => {
    const { calls } = mockApi({
      'GET /auth/me': user,
      'PATCH /auth/me': { ...user, display_name: 'Sorin' },
    });
    renderApp(<SettingsPage />);

    const name = await screen.findByLabelText('Display name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Sorin');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ display_name: 'Sorin' });
  });

  it('deletes the account after confirming and signs out', async () => {
    const { calls } = mockApi({
      'GET /auth/me': user,
      'POST /auth/delete-account': undefined,
    });
    renderApp(<SettingsPage />);

    const button = await screen.findByRole('button', { name: 'Delete my account' });
    const form = button.closest('form')!;
    await userEvent.type(within(form).getByLabelText('Password'), 'correct-horse');
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /everything will be deleted/ }));
    await userEvent.click(button);

    await waitFor(() => expect(tokenStore.get()).toBeNull());
    expect(calls.find((c) => c.path === '/auth/delete-account')?.body).toEqual({
      password: 'correct-horse',
    });
  });

  it('keeps the new token after changing the password', async () => {
    mockApi({
      'GET /auth/me': user,
      'POST /auth/change-password': { access_token: 'fresh-token', token_type: 'bearer', user },
    });
    renderApp(<SettingsPage />);

    await userEvent.type(await screen.findByLabelText('Current password'), 'old-password');
    await userEvent.type(screen.getByLabelText('New password'), 'new-password-123');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText(/Other devices have been signed out/)).toBeInTheDocument();
    expect(tokenStore.get()).toBe('fresh-token');
  });
});

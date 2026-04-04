import { screen } from '@testing-library/react';
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
});

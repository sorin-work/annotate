import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import { formatDate } from '../lib/format';
import { getThemePreference, setThemePreference } from '../lib/theme';
import type { ThemePreference } from '../lib/theme';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Same as the system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsPage() {
  const { user, setUser, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [theme, setTheme] = useState(getThemePreference);
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveProfile = useMutation({
    mutationFn: () => authApi.updateProfile(displayName.trim()),
    onSuccess: setUser,
  });
  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setPasswordChanged(true);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => authApi.deleteAccount(deletePassword),
    onSuccess: signOut,
  });

  function onDelete(event: FormEvent) {
    event.preventDefault();
    deleteAccount.mutate();
  }

  function onProfile(event: FormEvent) {
    event.preventDefault();
    saveProfile.mutate();
  }

  function onPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordChanged(false);
    changePassword.mutate();
  }

  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={`Signed in as ${user.email} since ${formatDate(user.created_at)}`}
      />
      <div className="settings-grid">
        <form className="panel form" onSubmit={onProfile}>
          <h2>Profile</h2>
          <label className="field">
            <span>Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
          </label>
          <ErrorMessage error={saveProfile.error} />
          {saveProfile.isSuccess && <p className="success small">Saved.</p>}
          <div className="form-actions">
            <button type="submit" className="button primary" disabled={saveProfile.isPending}>
              Save profile
            </button>
          </div>
        </form>

        <form className="panel form" onSubmit={onPassword}>
          <h2>Password</h2>
          <label className="field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <ErrorMessage error={changePassword.error} />
          {passwordChanged && <p className="success small">Password changed.</p>}
          <div className="form-actions">
            <button type="submit" className="button primary" disabled={changePassword.isPending}>
              Change password
            </button>
          </div>
        </form>

        <section className="panel form" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading">Appearance</h2>
          <fieldset className="field radio-group">
            <legend>Theme</legend>
            {THEMES.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="theme"
                  checked={theme === option.value}
                  onChange={() => {
                    setTheme(option.value);
                    setThemePreference(option.value);
                  }}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <p className="muted small">Saved in this browser.</p>
        </section>

        <form className="panel form danger-zone" onSubmit={onDelete}>
          <h2>Delete account</h2>
          <p className="muted small">
            This deletes your account with every document, highlight, note, tag and collection in
            it. Export anything you want to keep first; this cannot be undone.
          </p>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
            />
            I understand everything will be deleted
          </label>
          <ErrorMessage error={deleteAccount.error} />
          <div className="form-actions">
            <button
              type="submit"
              className="button danger"
              disabled={!confirmDelete || !deletePassword || deleteAccount.isPending}
            >
              Delete my account
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

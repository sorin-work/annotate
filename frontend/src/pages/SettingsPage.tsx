import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import { formatDate } from '../lib/format';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

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
      </div>
    </>
  );
}

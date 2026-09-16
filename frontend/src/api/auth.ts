import { api } from './client';
import type { TokenResponse, User } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),
  register: (email: string, password: string, displayName?: string) =>
    api.post<TokenResponse>('/auth/register', {
      email,
      password,
      display_name: displayName || null,
    }),
  me: () => api.get<User>('/auth/me'),
  updateProfile: (displayName: string) =>
    api.patch<User>('/auth/me', { display_name: displayName }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
  deleteAccount: (password: string) => api.post<void>('/auth/delete-account', { password }),
};

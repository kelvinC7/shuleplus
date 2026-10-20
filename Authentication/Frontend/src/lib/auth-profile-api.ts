import { api } from './api';
import type { AuthUser } from './auth';

export type AuthMeProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
};

export async function fetchAuthMe() {
  const { data } = await api.get('/auth/me');
  return data.data as AuthMeProfile;
}

export async function updateAuthProfile(body: { avatarUrl?: string | null }) {
  const { data } = await api.patch('/auth/profile', body);
  return data.data as AuthMeProfile;
}

export function mergeAuthUser(stored: AuthUser | null, profile: AuthMeProfile): AuthUser {
  const base = stored ?? {
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    roles: [],
    permissions: [],
  };
  return {
    ...base,
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
  };
}

export function persistAuthUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

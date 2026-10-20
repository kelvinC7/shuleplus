import { api } from '@/lib/api';

export async function fetchNesaDashboardUsersAdmin() {
  const { data } = await api.get('/super-admin/nesa-dashboard/users');
  return data.data as Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    department?: string | null;
    position?: string | null;
    status: string;
    lastLoginAt?: string | null;
  }>;
}

export async function createNesaDashboardUserAdmin(body: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password?: string;
  department?: string;
  position?: string;
  sendCredentialsEmail?: boolean;
  requirePasswordChange?: boolean;
}) {
  const { data } = await api.post('/super-admin/nesa-dashboard/users', body);
  return data.data as { userId: string; email: string; tempPassword?: string; passwordSent?: boolean };
}

export async function deletePlatformUserAdmin(id: string) {
  const { data } = await api.delete(`/super-admin/platform-users/${id}`);
  return data.data;
}

export async function resetPlatformUserPasswordAdmin(
  id: string,
  body: { password?: string; sendCredentialsEmail?: boolean; requirePasswordChange?: boolean }
) {
  const { data } = await api.post(`/super-admin/platform-users/${id}/reset-password`, body ?? {});
  return data.data as { tempPassword?: string };
}

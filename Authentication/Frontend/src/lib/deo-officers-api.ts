import { api } from './api';

export async function fetchDeoOfficersAdmin() {
  const { data } = await api.get('/super-admin/deo-officers');
  return data.data;
}

export async function createDeoOfficerAdmin(body: Record<string, unknown>) {
  const { data } = await api.post('/super-admin/deo-officers', body);
  return data.data;
}

export async function updateDeoOfficerAdmin(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/super-admin/deo-officers/${id}`, body);
  return data.data;
}

export async function deleteDeoOfficerAdmin(id: string) {
  const { data } = await api.delete(`/super-admin/deo-officers/${id}`);
  return data.data;
}

export async function resetDeoOfficerPasswordAdmin(
  id: string,
  body?: { password?: string; sendCredentialsEmail?: boolean; requirePasswordChange?: boolean }
) {
  const { data } = await api.post(`/super-admin/deo-officers/${id}/reset-password`, body ?? {});
  return data.data;
}

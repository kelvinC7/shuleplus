import { api } from './api';

export async function fetchSeiOfficersAdmin() {
  const { data } = await api.get('/super-admin/sei-officers');
  return data.data;
}

export async function createSeiOfficerAdmin(body: Record<string, unknown>) {
  const { data } = await api.post('/super-admin/sei-officers', body);
  return data.data;
}

export async function updateSeiOfficerAdmin(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/super-admin/sei-officers/${id}`, body);
  return data.data;
}

export async function deleteSeiOfficerAdmin(id: string) {
  const { data } = await api.delete(`/super-admin/sei-officers/${id}`);
  return data.data;
}

export async function resetSeiOfficerPasswordAdmin(
  id: string,
  body?: { password?: string; sendCredentialsEmail?: boolean; requirePasswordChange?: boolean }
) {
  const { data } = await api.post(`/super-admin/sei-officers/${id}/reset-password`, body ?? {});
  return data.data;
}

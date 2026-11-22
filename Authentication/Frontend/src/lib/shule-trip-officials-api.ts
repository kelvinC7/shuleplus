import { api } from './api';

export async function fetchShuleTripOfficialsAdmin() {
  const { data } = await api.get('/super-admin/shule-trip-officials');
  return data.data;
}

export async function createShuleTripOfficialAdmin(body: Record<string, unknown>) {
  const { data } = await api.post('/super-admin/shule-trip-officials', body);
  return data.data;
}

export async function updateShuleTripOfficialAdmin(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/super-admin/shule-trip-officials/${id}`, body);
  return data.data;
}

export async function deleteShuleTripOfficialAdmin(id: string) {
  const { data } = await api.delete(`/super-admin/shule-trip-officials/${id}`);
  return data.data;
}

export async function resetShuleTripOfficialPasswordAdmin(
  id: string,
  body?: { password?: string; sendCredentialsEmail?: boolean; requirePasswordChange?: boolean }
) {
  const { data } = await api.post(`/super-admin/shule-trip-officials/${id}/reset-password`, body ?? {});
  return data.data;
}

export const SHULE_TRIP_ROLE_OPTIONS = [
  { slug: 'intake_reviewer', label: 'Intake / administrative reviewer' },
  { slug: 'education_reviewer', label: 'Education / local authority reviewer' },
  { slug: 'transport_reviewer', label: 'Transport & road-safety reviewer' },
  { slug: 'checkpoint_inspector', label: 'Checkpoint / traffic inspector' },
  { slug: 'final_approval_officer', label: 'Final approval officer' },
  { slug: 'monitoring_officer', label: 'Monitoring officer' },
  { slug: 'national_administrator', label: 'National administrator' },
  { slug: 'district_education_officer', label: 'District education officer' },
  { slug: 'sector_education_inspector', label: 'Sector education inspector' },
] as const;

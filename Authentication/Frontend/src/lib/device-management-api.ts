import { api } from '@/lib/api';
import type { SmartAccessSchool, SmartAccessStaff } from '@/lib/smart-access-api';

export type StaffSchoolAssignment = {
  id: string;
  organizationId: string;
  staffKey: string;
  iamUserId?: string | null;
  email?: string | null;
  externalId?: string | null;
  source?: string | null;
  staffName?: string | null;
  homeOrganizationId?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | string;
  assignedAt?: string;
  notes?: string | null;
};

export type StaffIdentityPayload = {
  staffKey?: string;
  iamUserId?: string | null;
  email?: string | null;
  externalId?: string | null;
  source?: string | null;
  staffName?: string | null;
  homeOrganizationId?: string | null;
};

export async function fetchDeviceManagementSchools(params?: {
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  search?: string;
}) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessSchool[] }>(
    '/super-admin/device-management/schools',
    { params }
  );
  return data.data;
}

export async function fetchDeviceManagementStaff(organizationId: string, params?: { search?: string }) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessStaff[] }>(
    `/super-admin/device-management/schools/${organizationId}/staff`,
    { params }
  );
  return data.data;
}

export async function fetchSchoolStaffAssignments(organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: StaffSchoolAssignment[] }>(
    `/super-admin/device-management/schools/${organizationId}/staff-assignments`
  );
  return data.data;
}

export async function fetchStaffAssignments(staffKey: string) {
  const { data } = await api.get<{ success: boolean; data: StaffSchoolAssignment[] }>(
    `/super-admin/device-management/staff/${encodeURIComponent(staffKey)}/assignments`
  );
  return data.data;
}

export async function upsertStaffSchoolAssignments(body: {
  organizationId?: string;
  staff: StaffIdentityPayload & { staffName?: string | null; fullName?: string | null; employeeNumber?: string | null };
  targetOrganizationIds: string[];
  replace?: boolean;
  notes?: string | null;
}) {
  const { data } = await api.post<{ success: boolean; data: { staffKey: string; assignments: StaffSchoolAssignment[] } }>(
    '/super-admin/device-management/staff-assignments',
    body
  );
  return data.data;
}

export async function removeStaffSchoolAssignment(organizationId: string, staffKey: string) {
  const { data } = await api.delete<{ success: boolean; data: { removed: boolean } }>(
    `/super-admin/device-management/schools/${organizationId}/staff-assignments/${encodeURIComponent(staffKey)}`
  );
  return data.data;
}

export function deriveStaffKeyClient(staff: any): string {
  const iamUserId = staff?.iamUserId || (staff?.source === 'iam' ? staff?.id : null);
  if (iamUserId) return `iam:${iamUserId}`;
  const email = String(staff?.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  const source = String(staff?.source || 'staff').trim().toLowerCase();
  const externalId = String(staff?.employeeNumber || staff?.externalId || staff?.id || '').trim();
  if (externalId) return `${source}:${externalId}`;
  return String(staff?.id || '').trim();
}

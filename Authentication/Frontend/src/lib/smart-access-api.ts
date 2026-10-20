import { api } from '@/lib/api';
import type { StaffSource } from '@/lib/staff-source-label';

export type { StaffSource };

export type SmartAccessSchool = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  poBox?: string | null;
  website?: string | null;
  status: string;
  organizationCode?: string | null;
  logoUrl?: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  schoolCategory: string | null;
  schoolProgram: string | null;
  educationLevels?: string[];
  locationComplete?: boolean;
};

export type SmartAccessStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  className?: string | null;
  /** Class category from Student Management (NURSERY, PRIMARY, SECONDARY, TVET). */
  educationLevel?: string | null;
  academicYear?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  fingerprintId?: string | null;
  gender?: string | null;
  status?: string | null;
};

export type SmartAccessStaff = {
  id: string;
  source?: StaffSource;
  fullName: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  employeeNumber: string;
  position: string;
  email?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  fingerprintId?: string | null;
};

export type LocationOption = { id: string; name: string };

export async function fetchSmartAccessSchools(params?: {
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  search?: string;
}) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessSchool[] }>(
    '/super-admin/smart-access/schools',
    { params }
  );
  return data.data;
}

export type SmartAccessClass = {
  id: string;
  label: string;
  name: string;
  stream?: string | null;
};

export async function fetchSmartAccessClasses(organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessClass[] }>(
    `/super-admin/smart-access/schools/${organizationId}/classes`
  );
  return data.data;
}

export type SmartAccessParentStudent = {
  studentId: string | null;
  studentCode: string | null;
  studentName: string | null;
  className: string | null;
  role: string;
};

export type SmartAccessParent = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  nationalId?: string | null;
  occupation?: string | null;
  address?: string | null;
  smsEnabled: boolean;
  students: SmartAccessParentStudent[];
};

export async function fetchSmartAccessParents(
  organizationId: string,
  params?: { studentId?: string }
) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessParent[] }>(
    `/super-admin/smart-access/schools/${organizationId}/parents`,
    { params }
  );
  return data.data;
}

export async function toggleParentSms(
  organizationId: string,
  parentId: string,
  enabled: boolean
) {
  const { data } = await api.patch<{ success: boolean; data: { id: string; smsEnabled: boolean } }>(
    `/super-admin/smart-access/schools/${organizationId}/parents/${parentId}/sms-toggle`,
    { enabled }
  );
  return data.data;
}

export async function bulkParentSms(organizationId: string, enabled: boolean) {
  const { data } = await api.patch<{
    success: boolean;
    data: {
      updated: number;
      total: number;
      withPhone: number;
      enabledCount: number;
      enabled: boolean;
    };
  }>(`/super-admin/smart-access/schools/${organizationId}/parents/sms-bulk`, { enabled });
  return data.data;
}

export interface SmsProviderStatusLive {
  provider: string;
  senderId: string;
  fromNumber: string | null;
  directConfigured: boolean;
  apiKeyConfigured: boolean;
  notificationServiceConfigured: boolean;
  ready: boolean;
  route: string;
}

export async function fetchSmsProviderStatus() {
  const { data } = await api.get<{ success: boolean; data: SmsProviderStatusLive }>(
    '/super-admin/sms/status'
  );
  return data.data;
}

export async function sendSmsToParent(
  to: string,
  body: string,
  studentName?: string,
  parentName?: string
) {
  try {
    const { data } = await api.post<{
      success: boolean;
      message?: string;
      data: {
        sent: boolean;
        to: string;
        body?: string;
        channel?: string;
        providerCode?: string | null;
        timestamp: string;
      };
    }>('/super-admin/sms/send', { to, body, studentName, parentName });
    if (!data.success || !data.data?.sent) {
      throw new Error(data.message ?? 'SMS not delivered');
    }
    return data.data;
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string } } };
    throw new Error(ax.response?.data?.message ?? (err instanceof Error ? err.message : 'SMS failed'));
  }
}

export async function sendBulkSms(
  recipients: Array<{ parentId: string; phone: string; parentName: string; studentName: string }>,
  body: string,
  messageType?: string
) {
  const { data } = await api.post<{ success: boolean; data: { sent: number; failed: number; total: number } }>(
    '/super-admin/sms/send-bulk',
    { recipients, body, messageType }
  );
  return data.data;
}

export async function fetchSmartAccessStudents(
  organizationId: string,
  params?: { search?: string; academicYear?: string; classId?: string; className?: string }
) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessStudent[] }>(
    `/super-admin/smart-access/schools/${organizationId}/students`,
    { params }
  );
  return data.data;
}

export async function fetchSmartAccessStaff(organizationId: string, params?: { search?: string }) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessStaff[] }>(
    `/super-admin/smart-access/schools/${organizationId}/staff`,
    { params }
  );
  return data.data;
}

export async function saveStudentDigitalId(
  organizationId: string,
  studentId: string,
  body: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null }
) {
  const { data } = await api.put<{ success: boolean; data: unknown }>(
    `/super-admin/smart-access/schools/${organizationId}/students/${studentId}/identity`,
    body
  );
  return data.data;
}

export async function saveStaffDigitalId(
  organizationId: string,
  staffId: string,
  body: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null },
  source?: StaffSource
) {
  const { data } = await api.put<{ success: boolean; data: unknown }>(
    `/super-admin/smart-access/schools/${organizationId}/staff/${staffId}/identity`,
    body,
    { params: source ? { source } : undefined }
  );
  return data.data;
}

export async function fetchProvinces() {
  const { data } = await api.get<{ success: boolean; data: LocationOption[] }>(
    '/super-admin/locations/provinces'
  );
  return data.data;
}

export async function fetchDistricts(provinceId: string) {
  const { data } = await api.get<{ success: boolean; data: LocationOption[] }>(
    `/super-admin/locations/provinces/${provinceId}/districts`
  );
  return data.data;
}

export async function fetchSectors(districtId: string) {
  const { data } = await api.get<{ success: boolean; data: LocationOption[] }>(
    `/super-admin/locations/districts/${districtId}/sectors`
  );
  return data.data;
}

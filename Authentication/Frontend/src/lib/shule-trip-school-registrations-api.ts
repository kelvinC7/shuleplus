import { api } from './api';

export type ShuleTripSchoolRegistrationRow = {
  id: string;
  reference: string;
  status: string;
  schoolCode: string;
  officialName: string;
  accountEmail: string;
  username: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  organizationId: string | null;
  payload?: Record<string, unknown>;
};

export async function fetchShuleTripSchoolRegistrationsAdmin() {
  const { data } = await api.get<{ data: ShuleTripSchoolRegistrationRow[] }>(
    '/super-admin/shule-trip-school-registrations'
  );
  return data.data;
}

export async function reviewShuleTripSchoolRegistrationAdmin(
  id: string,
  body: { decision: string; reviewNote?: string }
) {
  const { data } = await api.patch<{ data: ShuleTripSchoolRegistrationRow }>(
    `/super-admin/shule-trip-school-registrations/${id}`,
    body
  );
  return data.data;
}

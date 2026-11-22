import axios from 'axios';
import type { SchoolRegisterForm } from '@/school-register/types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3076/api';

export const portalPublicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function loginShuleTripPortal(input: {
  portal: 'school' | 'government';
  username: string;
  password: string;
}) {
  const { data } = await portalPublicApi.post<{ data: { accessToken: string; portal: string } }>(
    '/public/auth/login',
    input
  );
  return data.data;
}

export async function submitSchoolRegistrationApi(input: {
  reference: string;
  form: SchoolRegisterForm;
}) {
  const { form } = input;
  const { data } = await portalPublicApi.post<{
    data: { reference: string; status: string; confirmationEmailSent?: boolean };
  }>(
    '/public/school-registrations',
    {
      reference: input.reference,
      schoolCode: form.step1.schoolCode,
      officialName: form.step1.officialName,
      accountEmail: form.step5.accountEmail || form.step1.email,
      username: form.step5.username,
      password: form.step5.password,
      payload: form,
    }
  );
  return data.data;
}

export type SchoolRegistrationRow = {
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
};

export async function fetchSchoolRegistrations(token: string) {
  const { data } = await axios.get<{ data: SchoolRegistrationRow[] }>(
    `${API_BASE_URL}/superadmin/school-registrations`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data.data;
}

export async function reviewSchoolRegistrationApi(
  token: string,
  id: string,
  body: { decision: string; reviewNote?: string }
) {
  const { data } = await axios.patch<{ data: SchoolRegistrationRow }>(
    `${API_BASE_URL}/superadmin/school-registrations/${id}`,
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data.data;
}

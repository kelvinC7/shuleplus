import axios from 'axios';
import { getToken } from '@/shared/auth-token';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export async function changePassword(currentPassword: string, newPassword: string) {
  const token = getToken();
  if (!token) throw new Error('Not signed in');
  const { data } = await axios.post(
    `${IAM_API_URL}/auth/change-password`,
    { currentPassword, newPassword },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

import axios from 'axios';
import { clearTokens, getToken } from '@/shared/auth-token';

export async function performProcurementSignOut() {
  const iamApiUrl =
    process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';
  const iamUrl = (process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  const token = getToken();

  try {
    if (token) {
      await axios.post(
        `${iamApiUrl}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    }
  } catch {
    /* still clear local session */
  }

  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = iamUrl;
  }
}

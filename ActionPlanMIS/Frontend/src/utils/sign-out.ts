import { clearToken, getToken } from '@/shared/auth-token';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export async function performModuleSignOut() {
 const iamUrl = (process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000').replace(/\/$/, '');
 const token = getToken();

 try {
 if (token) {
 await fetch(`${IAM_API_URL}/auth/logout`, {
 method: 'POST',
 headers: { Authorization: `Bearer ${token}` },
 });
 }
 } catch {
 // ignore
 }

 clearToken();
 if (typeof window !== 'undefined') {
 window.location.href = `${iamUrl}/login`;
 }
}

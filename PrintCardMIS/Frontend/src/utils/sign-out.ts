import { redirectToLogin } from '@/utils/auth-login';

export async function performPrintCardSignOut() {
  await redirectToLogin();
}

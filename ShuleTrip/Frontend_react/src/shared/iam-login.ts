const IAM_URL = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

/** Redirect to IAM login with return URL back into ShuleTrip. */
export function redirectToIamLogin(returnPath: string): void {
  const returnUrl = `${window.location.origin}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`;
  const loginUrl = `${IAM_URL}/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  window.location.href = loginUrl;
}

export function openOrganizationDashboard(): void {
  window.location.href = `${IAM_URL}/organization-admin`;
}

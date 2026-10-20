const STORAGE_KEY = 'print-card:selected-school-id';

export function getStoredSchoolId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setStoredSchoolId(organizationId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, organizationId);
}

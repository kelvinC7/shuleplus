/** Normalize scanned QR / card input to a lookup code (student code, permission code, etc.). */
export function parseScanCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const permissionDeepLink = trimmed.match(/shuleplus:\/\/permission\/([^/?#]+)/i);
  if (permissionDeepLink) return decodeURIComponent(permissionDeepLink[1]);

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const vMatch = url.pathname.match(/^\/v\/([^/]+)/i);
      if (vMatch) return decodeURIComponent(vMatch[1]);
      const staffMatch = url.pathname.match(/^\/staff\/([^/]+)/i);
      if (staffMatch) return decodeURIComponent(staffMatch[1]);
    }
  } catch {
    /* not a URL */
  }

  const pathMatch = trimmed.match(/\/(?:v|staff)\/([^/?#]+)/i);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  return trimmed;
}

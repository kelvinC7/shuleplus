/** URL encoded in the trip QR · opens the public verification page when scanned. */
export function tripVerifyUrl(reference: string): string {
  const base =
    import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3077');
  return `${base}/trip/${encodeURIComponent(reference.trim())}`;
}

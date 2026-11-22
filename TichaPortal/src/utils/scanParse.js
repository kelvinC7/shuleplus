/** Helpers to classify and parse whatever a teacher scans (class/room QR vs student card). */

const CLASS_QR_RE = /(\/v\/[^/?#\s]+)|BABYEYICLS:|QR-CLS-|QR-CLASS-|QR-MON-/i;

export function isClassQr(raw) {
  return CLASS_QR_RE.test(String(raw || ''));
}

/** Same normalisation the classroom scan sheet sends to /teacher-portal/class-room/scan. */
export function parseClassQr(raw) {
  const value = String(raw || '').trim();
  if (/\/v\/[^/?#\s]+/i.test(value)) return value;
  const babyeyi = value.match(/BABYEYICLS:([a-f0-9]+)/i);
  if (babyeyi) return babyeyi[1];
  const prefixed =
    value.match(/\b(\d{3,})-QR-CLS-(\d+)\b/i) ||
    value.match(/\b(\d{3,})-QR-CLASS-(\d+)\b/i) ||
    value.match(/\b([A-Z0-9]{3,})-QR-CLS-(\d+)\b/i);
  if (prefixed) return `${prefixed[1]}-QR-CLS-${prefixed[2]}`.toUpperCase();
  const bare = value.match(/QR-CLS-\d+/i) || value.match(/QR-CLASS-\d+/i);
  if (bare) return bare[0].toUpperCase().replace('QR-CLASS', 'QR-CLS');
  const monitorPrefix =
    value.match(/\b(\d{3,})-QR-MON-(\d+)\b/i) || value.match(/\b([A-Z0-9]{3,})-QR-MON-(\d+)\b/i);
  if (monitorPrefix) return `${monitorPrefix[1]}-QR-MON-${monitorPrefix[2]}`.toUpperCase();
  const monitorCode = value.match(/QR-MON-\d+/i);
  if (monitorCode) return monitorCode[0].toUpperCase();
  return value;
}

/** Same code extraction the exam room uses for pipe-delimited student cards. */
export function parseStudentCode(raw) {
  const trimmed = String(raw || '').trim();
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    return (parts[3] || parts[parts.length - 1] || trimmed).trim();
  }
  return trimmed;
}

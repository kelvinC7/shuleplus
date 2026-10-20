/** District alpha order → 2-digit code (aligned with Student Management). */
const DISTRICTS_ALPHA = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo', 'Gicumbi',
  'Gisagara', 'Huye', 'Kamonyi', 'Karongi', 'Kayonza', 'Kicukiro',
  'Kirehe', 'Muhanga', 'Musanze', 'Ngoma', 'Ngororero', 'Nyabihu',
  'Nyagatare', 'Nyamagabe', 'Nyamasheke', 'Nyanza', 'Nyarugenge',
  'Nyaruguru', 'Rubavu', 'Ruhango', 'Rulindo', 'Rusizi', 'Rutsiro',
  'Rwamagana',
];

const CODE_BY_DISTRICT = new Map(
  DISTRICTS_ALPHA.map((name, i) => [name.toLowerCase(), String(i + 1).padStart(2, '0')])
);

export function getDistrictCode(districtName: string | null | undefined): string {
  if (!districtName) return '01';
  return CODE_BY_DISTRICT.get(districtName.trim().toLowerCase()) || '01';
}

/** Extract 3-digit school/org serial from codes like "01/003", "04003", "003". */
export function parseSchoolCodeNumeric(schoolCode: string | null | undefined): string {
  const s = String(schoolCode || '').trim();
  const slash = s.match(/^\d{2}\/(\d{3})$/);
  if (slash) return slash[1];
  if (/^\d{1,3}$/.test(s)) return s.padStart(3, '0');
  const six = s.match(/^(\d{2})(\d{3,4})$/);
  if (six) return six[2].slice(-3).padStart(3, '0');
  const m = s.match(/(\d{1,3})$/);
  if (m) return m[1].padStart(3, '0');
  return '001';
}

/**
 * RFID device code: DD (district) + SSS (school) + DV + NNN (seq)
 * Example: 01 + 001 + DV + 001 → 01001DV001
 */
export function formatDeviceCode(
  districtCode: string,
  schoolCode3: string,
  seq: number
): string {
  const dd = String(districtCode || '01').padStart(2, '0').slice(-2);
  const ss = parseSchoolCodeNumeric(schoolCode3);
  const nn = String(Math.min(Math.max(seq || 1, 1), 999)).padStart(3, '0');
  return `${dd}${ss}DV${nn}`;
}

export function parseDeviceCodeSequence(deviceCode: string): number | null {
  const m = String(deviceCode).trim().toUpperCase().match(/^(\d{5})DV(\d{3})$/);
  if (!m) return null;
  return parseInt(m[2], 10);
}

export function deviceCodePrefix(districtCode: string, schoolCode3: string): string {
  const dd = String(districtCode || '01').padStart(2, '0').slice(-2);
  const ss = parseSchoolCodeNumeric(schoolCode3);
  return `${dd}${ss}DV`;
}

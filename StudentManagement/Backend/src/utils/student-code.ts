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
  // e.g. 040001 → last 3, or 01/001 already handled
  const six = s.match(/^(\d{2})(\d{3,4})$/);
  if (six) return six[2].slice(-3).padStart(3, '0');
  const m = s.match(/(\d{1,3})$/);
  if (m) return m[1].padStart(3, '0');
  return '001';
}

/** Last two digits of academic year end, e.g. "2025-2026" → "26". */
export function yearSuffix(academicYear?: string | null): string {
  if (academicYear) {
    const range = academicYear.match(/(20\d{2})\s*[-/]\s*(20\d{2})/);
    if (range) return range[2].slice(-2);
    const single = academicYear.match(/(20\d{2})/);
    if (single) return single[1].slice(-2);
    if (/^\d{2}$/.test(academicYear.trim())) return academicYear.trim();
  }
  return String(new Date().getFullYear()).slice(-2);
}

/**
 * Student code: DD (district) + SSS (org) + NNNN (seq) + YY (year)
 * Example: 01 + 001 + 0001 + 26 → 01001000126
 */
export function formatStudentUid(
  districtCode: string,
  schoolCode3: string,
  seq: number,
  academicYear?: string | null
): string {
  const dd = String(districtCode || '01').padStart(2, '0').slice(-2);
  const ss = parseSchoolCodeNumeric(schoolCode3);
  const nn = String(Math.min(Math.max(seq || 1, 1), 9999)).padStart(4, '0');
  const yy = yearSuffix(academicYear);
  return `${dd}${ss}${nn}${yy}`;
}

export function previewStudentCodeParts(input: {
  district?: string | null;
  schoolCode?: string | null;
  sequence: number;
  academicYear?: string | null;
}) {
  const districtCode = getDistrictCode(input.district);
  const orgCode = parseSchoolCodeNumeric(input.schoolCode);
  const seq = String(Math.min(Math.max(input.sequence || 1, 1), 9999)).padStart(4, '0');
  const year = yearSuffix(input.academicYear);
  const code = `${districtCode}${orgCode}${seq}${year}`;
  return { districtCode, orgCode, seq, year, code };
}

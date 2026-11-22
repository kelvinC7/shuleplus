import * as XLSX from 'xlsx';

export type ParsedManifestRow = {
  fullName: string;
  gender?: string;
  classLabel: string;
  guardianName?: string;
  guardianPhone: string;
  guardianEmail?: string;
};

function normHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[_-]/g, ' ');
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  const entries = Object.entries(row);
  for (const key of keys) {
    const hit = entries.find(([k]) => normHeader(k).includes(normHeader(key)));
    if (hit) {
      const v = hit[1];
      if (v != null && String(v).trim()) return String(v).trim();
    }
  }
  return '';
}

export function parseManifestWorkbook(file: ArrayBuffer, defaultClassName: string): ParsedManifestRow[] {
  const wb = XLSX.read(file, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const out: ParsedManifestRow[] = [];

  for (const row of rows) {
    const fullName = pick(row, ['student name', 'name', 'learner', 'full name']);
    const guardianPhone = pick(row, ['parent phone', 'guardian phone', 'phone', 'parent mobile', 'telephone']);
    if (!fullName || !guardianPhone) continue;
    const classLabel = pick(row, ['class', 'class name', 'grade']) || defaultClassName.trim();
    if (!classLabel) continue;
    const guardianEmail = pick(row, ['parent email', 'guardian email', 'email']) || undefined;
    out.push({
      fullName,
      gender: pick(row, ['gender', 'sex']) || undefined,
      classLabel,
      guardianName: pick(row, ['parent name', 'guardian name', 'parent', 'guardian']) || undefined,
      guardianPhone,
      guardianEmail: guardianEmail || undefined,
    });
  }
  return out;
}

export function manifestTemplateCsv(): string {
  return [
    'Student Name,Gender,Class,Parent Name,Parent Phone,Parent Email',
    'Jane Uwase,Female,S3A,Paul Uwase,+250788123456,parent@example.com',
    'John Habimana,Male,S3A,Marie Habimana,+250789654321',
  ].join('\n');
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export function defaultAcademicSettings(): AcademicSettings {
  const start = new Date().getFullYear();
  const year = `${start}-${start + 1}`;
  return {
    academicYears: [year],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: year,
    currentTerm: 'Term 1',
  };
}

const YEAR_PATTERN = /^\d{4}-\d{4}$/;

export function validateAcademicYear(value: string): boolean {
  if (!YEAR_PATTERN.test(value)) return false;
  const [a, b] = value.split('-').map(Number);
  return b === a + 1;
}

export function suggestNextYear(years: string[]): string {
  if (!years.length) {
    const start = new Date().getFullYear();
    return `${start}-${start + 1}`;
  }
  const sorted = [...years].sort();
  const end = Number(sorted[sorted.length - 1].split('-')[1]);
  return `${end}-${end + 1}`;
}

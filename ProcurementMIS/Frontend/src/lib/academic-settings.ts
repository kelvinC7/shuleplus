export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export const OTHER_DEPARTMENT_CODE = 'OTHER';

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

export interface EducationLevelConfig {
  id: string;
  label: string;
  grades: Array<{ id: string; label: string }>;
}

/** Single source of truth — served via API; extend via DB in a later phase if needed. */
export const EDUCATION_LEVELS: EducationLevelConfig[] = [
  {
    id: 'nursery',
    label: 'Nursery',
    grades: [
      { id: 'N1', label: 'N1' },
      { id: 'N2', label: 'N2' },
      { id: 'N3', label: 'N3' },
    ],
  },
  {
    id: 'primary',
    label: 'Primary',
    grades: [
      { id: 'P1', label: 'P1' },
      { id: 'P2', label: 'P2' },
      { id: 'P3', label: 'P3' },
      { id: 'P4', label: 'P4' },
      { id: 'P5', label: 'P5' },
      { id: 'P6', label: 'P6' },
    ],
  },
  {
    id: 'o_level',
    label: 'O-Level (Ordinary Level)',
    grades: [
      { id: 'S1', label: 'S1' },
      { id: 'S2', label: 'S2' },
      { id: 'S3', label: 'S3' },
    ],
  },
  {
    id: 'a_level',
    label: 'A-Level (Advanced Level)',
    grades: [
      { id: 'S4', label: 'S4' },
      { id: 'S5', label: 'S5' },
      { id: 'S6', label: 'S6' },
    ],
  },
];

export function validateEducationGrade(educationLevelId: string, gradeId: string): boolean {
  const level = EDUCATION_LEVELS.find((l) => l.id === educationLevelId);
  if (!level) return false;
  return level.grades.some((g) => g.id === gradeId);
}

export function educationLevelLabel(id: string): string {
  return EDUCATION_LEVELS.find((l) => l.id === id)?.label ?? id;
}

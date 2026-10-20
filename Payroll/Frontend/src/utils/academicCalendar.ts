export interface PayrollSettings {
  currentAcademicYear: string;
  currentTerm: string;
  termsJson?: string[];
  calendarJson?: Record<string, unknown>;
}

export function defaultAcademicYear() {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

export function termsFromSettings(settings: PayrollSettings | null): string[] {
  const terms = settings?.termsJson;
  if (Array.isArray(terms) && terms.length) return terms as string[];
  return ['Term 1', 'Term 2', 'Term 3'];
}

export function academicYearFromSettings(settings: PayrollSettings | null): string {
  return settings?.currentAcademicYear ?? defaultAcademicYear();
}

export function termFromSettings(settings: PayrollSettings | null): string {
  return settings?.currentTerm ?? 'Term 1';
}

/** Minimal school record for Babyeyi-style pay-fees / loan modals. */
export type School = {
  id: string;
  name: string;
  initials: string;
  desc: string;
  district: string;
  province: string;
  sector?: string | null;
  type: string;
  category: string;
  verified: boolean;
  organizationCode?: string | null;
  curricula: string[];
  levels: string[];
  mode: string;
  gender: 'Male' | 'Female' | 'Mixed';
  feesPerTerm: number | null;
  combinations: string[];
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
};

export type CircularOptions = {
  academicYears: string[];
  terms: string[];
  count: number;
  grouped?: Array<{ academicYear: string; terms: string[] }>;
  currentAcademicYear?: string | null;
  currentTerm?: string | null;
};

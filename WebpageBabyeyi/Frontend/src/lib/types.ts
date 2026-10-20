export type SchoolType = 'government' | 'government-aided' | 'private' | 'international';

export type ViewMode = 'grid' | 'list';

export type SortKey = 'relevant' | 'fees-asc' | 'name';

export interface School {
  id: string;
  name: string;
  initials: string;
  desc: string;
  district: string;
  province: string;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  postalAddress?: string | null;
  type: SchoolType | '';
  category: string;
  verified: boolean;
  website?: string | null;
  slug?: string | null;
  /** Published MiniWebsite path slug (may differ from IAM org slug). */
  miniWebsiteSlug?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  organizationCode?: string | null;
  establishedYear?: string | null;
  onboardedAt?: string;
  curricula: string[];
  levels: string[];
  mode: 'Day' | 'Boarding' | '';
  program?: string | null;
  gender: 'Male' | 'Female' | 'Mixed';
  feesPerTerm: number | null;
  combinations: string[];
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
  admissionsEnabled?: boolean;
}

export interface DirectoryFilters {
  name: string;
  province: string;
  district: string;
  sector: string;
  provinceId: string;
  districtId: string;
  sectorId: string;
  level: string;
  type: string;
  curriculum: string;
  combination: string;
  gender: string;
  mode: string;
  maxFeesPct: number;
}

export type IamRole = 'school' | 'teacher' | 'parent';

import type { DirectoryFilters, School } from './types';

export const LEVELS = [
  'Nursery / Pre-Primary',
  'Primary (P1–P6)',
  'O-Level (S1–S3)',
  'A-Level (S4–S6)',
  'TVET / IPRC',
  'Teacher Training College',
  'University',
] as const;

export const SCHOOL_TYPES = ['Government', 'Government-aided', 'Private', 'International'] as const;

export const COMBINATIONS = [
  { value: 'MPC', label: 'MPC — Math, Physics, Computer Science' },
  { value: 'PCB', label: 'PCB — Physics, Chemistry, Biology' },
  { value: 'MCB', label: 'MCB — Math, Chemistry, Biology' },
  { value: 'MEG', label: 'MEG — Math, Economics, Geography' },
  { value: 'HEG', label: 'HEG — History, Economics, Geography' },
  { value: 'HGL', label: 'HGL — History, Geography, Literature' },
  { value: 'PCM', label: 'PCM — Physics, Chemistry, Math' },
  { value: 'TVET', label: 'TVET — Technical & vocational trades' },
  { value: 'TTC', label: 'TTC — Teacher training (ECLPE/SME)' },
] as const;

export const DEFAULT_FILTERS: DirectoryFilters = {
  name: '',
  province: '',
  district: '',
  sector: '',
  provinceId: '',
  districtId: '',
  sectorId: '',
  level: '',
  type: '',
  curriculum: '',
  combination: '',
  gender: '',
  mode: '',
  maxFeesPct: 100,
};

/** Combination options that actually exist in the live dataset. */
export function getCombinations(schools: School[]): { value: string; label: string }[] {
  const present = new Set(schools.flatMap((s) => s.combinations));
  return COMBINATIONS.filter((c) => present.has(c.value));
}

/** Curriculum values from onboarded school profiles, alphabetically sorted. */
export function getCurricula(schools: School[]): string[] {
  return [...new Set(schools.flatMap((s) => s.curricula).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function filterSchools(schools: School[], f: DirectoryFilters): School[] {
  const maxFees =
    f.maxFeesPct >= 100 ? Infinity : Math.round((f.maxFeesPct / 100) * 2_000_000);
  return schools.filter((s) => {
    if (f.name && !s.name.toLowerCase().includes(f.name.toLowerCase())) return false;
    if (f.province && s.province !== f.province) return false;
    if (f.district && s.district !== f.district) return false;
    if (f.sector && s.sector !== f.sector) return false;
    if (f.level && !s.levels.includes(f.level)) return false;
    if (f.type) {
      if (f.type === 'International') {
        if (s.category !== 'International') return false;
      } else if (s.type !== f.type.toLowerCase()) return false;
    }
    if (f.curriculum && !s.curricula.includes(f.curriculum)) return false;
    if (f.combination && !s.combinations.includes(f.combination)) return false;
    if (f.gender && s.gender !== f.gender) return false;
    if (f.mode && s.mode !== f.mode) return false;
    if (maxFees !== Infinity && s.feesPerTerm !== null && s.feesPerTerm > maxFees) return false;
    return true;
  });
}

export function sortSchools(schools: School[], sort: string): School[] {
  const list = [...schools];
  switch (sort) {
    case 'fees-asc':
      return list.sort((a, b) => {
        const fa = a.feesPerTerm ?? Number.POSITIVE_INFINITY;
        const fb = b.feesPerTerm ?? Number.POSITIVE_INFINITY;
        return fa - fb || a.name.localeCompare(b.name);
      });
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return list.sort(
        (a, b) => (b.onboardedAt ?? '').localeCompare(a.onboardedAt ?? '') || a.name.localeCompare(b.name),
      );
  }
}

export function curriculumTagClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ib')) return 'bg-sky-100 text-sky-700';
  if (n.includes('cambridge') || n.includes('btec')) return 'bg-amber-100 text-[#8A5A00]';
  if (n.includes('reb') || n.includes('rwanda')) return 'bg-teal-100 text-teal-700';
  if (n.includes('french')) return 'bg-magenta-100 text-magenta-600';
  if (n.includes('american')) return 'bg-violet-100 text-violet-700';
  if (n.includes('tvet')) return 'bg-violet-100 text-violet-700';
  return 'bg-ink-100 text-ink-700';
}

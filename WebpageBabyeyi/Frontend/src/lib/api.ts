import type { School } from './types';
import { initialsFromName } from './utils';
import { BABYEYI_API_BASE } from './babyeyi-api-base';

const IAM_ORIGIN = (
  process.env.NEXT_PUBLIC_AUTH_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ??
  'http://localhost:3001'
).replace(/\/$/, '');

/** Extract `/uploads/...` path from any stored URL (fixes localhost URLs saved during dev onboarding). */
function uploadsPathFromUrl(url: string): string | null {
  const m = url.match(/\/uploads\/[^\s?#]+/i);
  return m ? m[0] : null;
}

/**
 * Browser-loadable asset URL.
 * Production babyeyi.rw nginx proxies `/uploads/` → IAM (:4001).
 */
export function resolveAssetUrl(url?: string | null): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  const uploadPath = uploadsPathFromUrl(trimmed);
  if (uploadPath) return uploadPath;

  if (trimmed.startsWith('/uploads/')) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `${IAM_ORIGIN}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export interface OnboardedSchoolDto {
  id: string;
  organizationCode: string | null;
  name: string;
  slug: string;
  miniWebsiteSlug?: string | null;
  logoUrl: string | null;
  category: string | null;
  schoolCategory: string | null;
  program: string | null;
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
  curriculum: string | null;
  motto: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  provinceName: string | null;
  districtName: string | null;
  sectorName: string | null;
  cellName: string | null;
  villageName: string | null;
  postalAddress: string | null;
  establishedDate: string | null;
  onboardedAt: string;
  admissionsEnabled?: boolean;
}

const LEVEL_DISPLAY: Record<string, string> = {
  Nursery: 'Nursery / Pre-Primary',
  Primary: 'Primary (P1–P6)',
  'O-Level': 'O-Level (S1–S3)',
  'A-Level': 'A-Level (S4–S6)',
  TVET: 'TVET / IPRC',
};

function mapType(schoolCategory: string | null): School['type'] {
  const c = (schoolCategory ?? '').toLowerCase();
  if (c.includes('aided')) return 'government-aided';
  if (c.includes('public') || c.includes('gov')) return 'government';
  if (c.includes('private')) return 'private';
  return '';
}

function normalizeSchoolProgram(program: string | null): string | null {
  const value = (program ?? '').trim();
  if (value === 'Boarding' || value === 'Day') return value;
  return null;
}

function buildCurricula(dto: OnboardedSchoolDto): string[] {
  const curriculum = dto.curriculum?.trim();
  return curriculum ? [curriculum] : [];
}

function buildDescription(dto: OnboardedSchoolDto): string {
  if (dto.description && dto.description.trim().length > 40) {
    return dto.description.trim().replace(/\s+$/, '');
  }
  const bits = [
    dto.schoolCategory,
    dto.program ? `${dto.program.toLowerCase()}` : null,
    'school',
  ].filter(Boolean);
  const where = [dto.districtName, dto.provinceName].filter(Boolean).join(', ');
  const levels = dto.educationLevels.join(', ');
  return `A ${bits.join(' ')}${where ? ` in ${where}` : ''}${
    levels ? ` offering ${levels}` : ''
  } education.${dto.motto ? ` “${dto.motto}”` : ''}`;
}

export function mapOnboardedSchool(dto: OnboardedSchoolDto): School {
  const levels = dto.educationLevels
    .map((l) => LEVEL_DISPLAY[l] ?? l)
    .filter((l, i, arr) => arr.indexOf(l) === i);

  const combinations = [...dto.aLevelCombinations];
  if (dto.tvetTrades.length > 0 || levels.includes('TVET / IPRC')) {
    combinations.push('TVET');
  }

  const program = normalizeSchoolProgram(dto.program);

  return {
    id: dto.id,
    name: dto.name,
    initials: initialsFromName(dto.name),
    desc: buildDescription(dto),
    district: dto.districtName ?? '—',
    province: dto.provinceName ?? '—',
    sector: dto.sectorName ?? null,
    cell: dto.cellName ?? null,
    village: dto.villageName ?? null,
    postalAddress: dto.postalAddress ?? null,
    type: mapType(dto.schoolCategory ?? dto.category),
    category: dto.schoolCategory ?? dto.category ?? '',
    verified: true,
  website: dto.website,
  slug: dto.slug,
  miniWebsiteSlug: dto.miniWebsiteSlug ?? null,
  logoUrl: resolveAssetUrl(dto.logoUrl),
  phone: dto.phone,
  email: dto.email,
  organizationCode: dto.organizationCode,
    establishedYear: dto.establishedDate ? dto.establishedDate.slice(0, 4) : null,
    onboardedAt: dto.onboardedAt,
    curricula: buildCurricula(dto),
    levels,
    educationLevels: [...dto.educationLevels],
    mode: program === 'Boarding' ? 'Boarding' : program === 'Day' ? 'Day' : '',
    program,
    gender: 'Mixed',
    feesPerTerm: null,
    combinations: [...new Set(combinations)],
    aLevelCombinations: [...dto.aLevelCombinations],
    tvetTrades: [...dto.tvetTrades],
    admissionsEnabled: dto.admissionsEnabled ?? false,
  };
}

/** Fetch schools registered through the Authentication onboarding module. */
export async function fetchOnboardedSchools(): Promise<School[]> {
  const res = await fetch(`${BABYEYI_API_BASE}/school-registrations`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`API responded with ${res.status}`);
  const json = (await res.json()) as { success?: boolean; data?: OnboardedSchoolDto[] };
  const list = Array.isArray(json.data) ? json.data : [];
  return list.map(mapOnboardedSchool);
}

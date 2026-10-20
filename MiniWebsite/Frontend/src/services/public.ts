const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3055/api';

export interface PublicSchoolProgram {
  name: string;
  description: string;
}

export interface PublicSchoolStat {
  label: string;
  value: string;
}

export interface PublicSchoolSite {
  id: string;
  slug: string;
  title: string;
  organizationName: string;
  tagline: string | null;
  district: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  about: string | null;
  programs: PublicSchoolProgram[] | null;
  stats: PublicSchoolStat[] | null;
  publishedAt: string | null;
  publicUrl: string;
}

/**
 * Public school website directory. No auth/token required — mirrors the
 * legacy "All Schools" lookup page.
 */
export async function listPublishedSchools(): Promise<PublicSchoolSite[]> {
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/public/schools`);
  if (!res.ok) {
    throw new Error(`Failed to load schools (${res.status})`);
  }
  const json: { success?: boolean; data?: unknown } = await res.json();
  return Array.isArray(json.data) ? (json.data as PublicSchoolSite[]) : [];
}

export { resolveAssetUrl } from '@/lib/asset-url';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { School } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRwf(amount: number): string {
  return new Intl.NumberFormat('en-RW').format(amount);
}

export function initialsFromName(name: string): string {
  const words = name
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w));
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return (letters.join('') || 'S').slice(0, 2);
}

/** Base URL of the MiniWebsite host, where each school site lives at /<slug>. */
export const MINI_WEBSITE_URL =
  process.env.NEXT_PUBLIC_MINI_WEBSITE_URL ?? 'http://localhost:3055';

/**
 * Resolve the school's public MiniWebsite link. Prefers the published
 * MiniWebsite slug (from the website editor), then IAM org slug, then website.
 */
export function schoolSiteUrl(
  school: Pick<School, 'miniWebsiteSlug' | 'slug' | 'website'>,
): string | null {
  const slug = school.miniWebsiteSlug ?? school.slug;
  if (slug) return `${MINI_WEBSITE_URL}/${encodeURIComponent(slug)}`;
  return school.website || null;
}

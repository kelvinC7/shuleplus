import { fetchIamUser } from '../clients/iam.client';
import { formatPersonName, fullNameFromParts } from './person-name';

const CACHE_TTL_MS = 5 * 60 * 1000;
const displayNameCache = new Map<string, { value: string; expiresAt: number }>();
const inflightLookups = new Map<string, Promise<string>>();

async function lookupDisplayName(userId: string, fallback: string): Promise<string> {
  const profile = await fetchIamUser(userId);
  const fullName = fullNameFromParts(profile?.firstName, profile?.lastName);
  return fullName || fallback;
}

/**
 * Resolve a user's display name from Authentication (Users & Access).
 * Falls back to a readable version of the supplied value when IAM is unreachable.
 */
export async function resolveUserDisplayName(
  userId?: string | null,
  fallback?: string | null,
): Promise<string> {
  const fallbackName = formatPersonName(fallback);
  if (!userId) return fallbackName;

  const now = Date.now();
  const cached = displayNameCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.value || fallbackName;
  }

  const pending = inflightLookups.get(userId);
  if (pending) {
    return (await pending) || fallbackName;
  }

  const lookup = lookupDisplayName(userId, fallbackName);
  inflightLookups.set(userId, lookup);

  try {
    const value = await lookup;
    if (value) {
      displayNameCache.set(userId, { value, expiresAt: now + CACHE_TTL_MS });
    }
    return value || fallbackName;
  } finally {
    inflightLookups.delete(userId);
  }
}

/** Resolve display names for several users in one pass. */
export async function resolveUserDisplayNames(
  userIds: Iterable<string | null | undefined>,
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set([...userIds].filter((id): id is string => Boolean(id)))];
  const resolved = await Promise.all(
    uniqueIds.map(async (id) => [id, await resolveUserDisplayName(id)] as const),
  );

  return new Map(resolved.filter(([, name]) => Boolean(name)));
}

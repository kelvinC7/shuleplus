import { uniformApi } from "@/services/uniform-api";
import { iamApi } from "@/services/iam-api";

export interface OrgSchoolProfile {
  organizationId: string;
  organizationCode?: string | null;
  schoolName: string;
  email?: string | null;
  phone?: string | null;
  poBox?: string | null;
  website?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
}

export async function fetchOrgSchoolProfile(): Promise<OrgSchoolProfile | null> {
  try {
    const data = await uniformApi.orgProfile.get();
    return data;
  } catch {
    return null;
  }
}

export interface OrgUserBrief {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

let usersCache: OrgUserBrief[] | null = null;
let usersCacheAt = 0;

export async function fetchOrgUsers(): Promise<OrgUserBrief[]> {
  if (usersCache && Date.now() - usersCacheAt < 60_000) return usersCache;
  try {
    const { data } = await iamApi.get<{ success: boolean; data: OrgUserBrief[] }>(
      "/iam/org/users",
    );
    usersCache = data.data ?? [];
    usersCacheAt = Date.now();
    return usersCache;
  } catch {
    return [];
  }
}

export async function resolveUserDisplayName(
  userRef?: string | null,
): Promise<string> {
  const ref = (userRef ?? "").trim();
  if (!ref) return "";
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return ref;
  const users = await fetchOrgUsers();
  const user = users.find((u) => u.id === ref);
  if (!user) return "";
  return `${user.firstName} ${user.lastName}`.trim();
}

export interface SchoolLeader {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
}

export function normalizeLeaders(
  raw: unknown,
  options?: { forEditor?: boolean }
): SchoolLeader[] {
  if (!Array.isArray(raw)) return [];

  const items: SchoolLeader[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const row = item as SchoolLeader;
    const name = String(row.name ?? '').trim();
    const role = String(row.role ?? '').trim();
    if (!options?.forEditor && (!name || !role)) return;
    items.push({
      id: row.id?.trim() || `leader-${index}`,
      name,
      role: role || 'Head Teacher',
      phone: row.phone?.trim() || '',
      email: row.email?.trim() || '',
      photoUrl: row.photoUrl?.trim() || '',
    });
  });

  return items;
}

export function createLeader(partial?: Partial<SchoolLeader>): SchoolLeader {
  return {
    id: `leader-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: partial?.name ?? '',
    role: partial?.role ?? 'Head Teacher',
    phone: partial?.phone ?? '',
    email: partial?.email ?? '',
    photoUrl: partial?.photoUrl ?? '',
  };
}

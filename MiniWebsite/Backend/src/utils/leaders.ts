export interface SchoolLeader {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
}

export function normalizeLeaders(raw: unknown): SchoolLeader[] {
  if (!Array.isArray(raw)) return [];

  const items: SchoolLeader[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const row = item as {
      id?: string;
      name?: string;
      role?: string;
      phone?: string;
      email?: string;
      photoUrl?: string;
    };
    const name = String(row.name ?? '').trim();
    const role = String(row.role ?? '').trim();
    if (!name || !role) return;
    items.push({
      id: row.id?.trim() || `leader-${index}`,
      name,
      role,
      phone: row.phone?.trim() || '',
      email: row.email?.trim() || '',
      photoUrl: row.photoUrl?.trim() || '',
    });
  });

  return items;
}

export function leaderInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export type LocationOption = { id: string; name: string };

const IAM =
  import.meta.env.VITE_IAM_API_URL?.replace(/\/$/, '') ??
  import.meta.env.VITE_BABYEYI_API_URL?.replace(/\/$/, '');

async function fetchList(path: string): Promise<LocationOption[]> {
  if (!IAM) return [];
  const res = await fetch(`${IAM}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: LocationOption[] };
  return Array.isArray(json.data) ? json.data : [];
}

/** Fallback when Babyeyi BFF is unavailable in local dev. */
const FALLBACK_PROVINCES: LocationOption[] = [
  { id: 'kigali', name: 'Kigali City' },
  { id: 'east', name: 'Eastern Province' },
  { id: 'west', name: 'Western Province' },
  { id: 'north', name: 'Northern Province' },
  { id: 'south', name: 'Southern Province' },
];

const FALLBACK_DISTRICTS: Record<string, LocationOption[]> = {
  kigali: [
    { id: 'gasabo', name: 'Gasabo' },
    { id: 'kicukiro', name: 'Kicukiro' },
    { id: 'nyarugenge', name: 'Nyarugenge' },
  ],
  east: [{ id: 'bugesera', name: 'Bugesera' }, { id: 'rwamagana', name: 'Rwamagana' }],
  west: [{ id: 'rubavu', name: 'Rubavu' }, { id: 'rusizi', name: 'Rusizi' }],
  north: [{ id: 'musanze', name: 'Musanze' }, { id: 'gakenke', name: 'Gakenke' }],
  south: [{ id: 'huye', name: 'Huye' }, { id: 'nyamagabe', name: 'Nyamagabe' }],
};

export async function loadProvinces(): Promise<LocationOption[]> {
  const remote = await fetchList('/public/locations/provinces');
  return remote.length ? remote : FALLBACK_PROVINCES;
}

export async function loadDistricts(provinceId: string): Promise<LocationOption[]> {
  if (!provinceId) return [];
  const remote = await fetchList(`/public/locations/provinces/${provinceId}/districts`);
  if (remote.length) return remote;
  return FALLBACK_DISTRICTS[provinceId] ?? [];
}

export async function loadSectors(districtId: string): Promise<LocationOption[]> {
  if (!districtId) return [];
  const remote = await fetchList(`/public/locations/districts/${districtId}/sectors`);
  if (remote.length) return remote;
  return [{ id: 'sector-1', name: 'Sector (select when online)' }];
}

export async function loadCells(sectorId: string): Promise<LocationOption[]> {
  if (!sectorId) return [];
  const remote = await fetchList(`/public/locations/sectors/${sectorId}/cells`);
  if (remote.length) return remote;
  return [{ id: 'cell-1', name: 'Cell (select when online)' }];
}

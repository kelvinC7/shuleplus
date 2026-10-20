import { BABYEYI_API_BASE } from './babyeyi-api-base';

export interface LocationOption {
  id: string;
  name: string;
  code?: string;
}

async function fetchLocationList(path: string): Promise<LocationOption[]> {
  const res = await fetch(`${BABYEYI_API_BASE}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Locations API responded with ${res.status}`);
  const json = (await res.json()) as { data?: LocationOption[] };
  const list = Array.isArray(json.data) ? json.data : [];
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function fetchProvinces(): Promise<LocationOption[]> {
  return fetchLocationList('/locations/provinces');
}

export function fetchDistricts(provinceId: string): Promise<LocationOption[]> {
  return fetchLocationList(`/locations/provinces/${provinceId}/districts`);
}

export function fetchSectors(districtId: string): Promise<LocationOption[]> {
  return fetchLocationList(`/locations/districts/${districtId}/sectors`);
}

export function fetchCells(sectorId: string): Promise<LocationOption[]> {
  return fetchLocationList(`/locations/sectors/${sectorId}/cells`);
}

export function fetchVillages(cellId: string): Promise<LocationOption[]> {
  return fetchLocationList(`/locations/cells/${cellId}/villages`);
}

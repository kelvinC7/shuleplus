import { api, type ApiEnvelope } from '@/services/api';

export type LatLng = { lat: number; lng: number };

export type RoadLeg = {
  distanceKm: number;
  durationMinutes: number;
};

export type RoadPathResult = {
  coordinates: LatLng[];
  distanceKm: number;
  durationMinutes: number;
  legs: RoadLeg[];
};

/** Road geometry via Transport API → OSRM (no browser API keys). */
export async function fetchRoadPath(stops: LatLng[]): Promise<RoadPathResult | null> {
  const valid = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (valid.length < 2) return null;

  try {
    const { data } = await api.post<ApiEnvelope<RoadPathResult>>('/map/route', { stops: valid });
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function searchPlaces(query: string): Promise<
  { displayName: string; lat: number; lng: number }[]
> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const { data } = await api.get<
      ApiEnvelope<{ displayName: string; lat: number; lng: number }[]>
    >('/map/places/search', { params: { q, limit: 8 } });
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{
  displayName: string;
  shortName: string;
} | null> {
  try {
    const { data } = await api.get<
      ApiEnvelope<{ displayName: string; shortName: string } | null>
    >('/map/places/reverse', { params: { lat, lng } });
    return data.data ?? null;
  } catch {
    return null;
  }
}

export { MAP_TILES, MAP_STACK } from '@/config/map-stack';

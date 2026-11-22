import { env } from "../config/env";
import { AppError } from "../middleware/error.middleware";

export type LatLng = { lat: number; lng: number };

export type RoadLeg = { distanceKm: number; durationMinutes: number };

export type RoadPathResult = {
  coordinates: LatLng[];
  distanceKm: number;
  durationMinutes: number;
  legs: RoadLeg[];
};

const nominatimHeaders = (): Record<string, string> => ({
  Accept: "application/json",
  "Accept-Language": "en",
  "User-Agent": env.MAP_HTTP_USER_AGENT,
});

async function fetchJson<T>(url: string, init: RequestInit, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch {
      throw new AppError(502, "Map service temporarily unavailable");
    }
    if (!response.ok) {
      throw new AppError(502, "Map service returned an error");
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function osrmRoute(stops: LatLng[]): Promise<RoadPathResult | null> {
  const valid = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (valid.length < 2) return null;

  const base = env.OSRM_URL.replace(/\/$/, "");
  const coordPath = valid.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `${base}/route/v1/driving/${coordPath}?overview=full&geometries=geojson&steps=false`;

  const json = await fetchJson<{
    routes?: {
      distance?: number;
      duration?: number;
      geometry?: { coordinates?: [number, number][] };
      legs?: { distance?: number; duration?: number }[];
    }[];
  }>(url, { method: "GET" });

  const route = json.routes?.[0];
  if (!route?.geometry?.coordinates?.length) return null;

  const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  const legs =
    route.legs?.map((leg) => ({
      distanceKm: Number(((leg.distance ?? 0) / 1000).toFixed(2)),
      durationMinutes: Math.max(1, Math.ceil((leg.duration ?? 0) / 60)),
    })) ?? [];

  return {
    coordinates,
    distanceKm: Number(((route.distance ?? 0) / 1000).toFixed(2)),
    durationMinutes: Math.max(1, Math.round((route.duration ?? 0) / 60)),
    legs,
  };
}

export async function nominatimSearch(
  query: string,
  limit: number,
  countryCodes: string
): Promise<{ displayName: string; lat: number; lng: number }[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const base = env.NOMINATIM_URL.replace(/\/$/, "");
  const url = `${base}/search?format=json&limit=${limit}&countrycodes=${encodeURIComponent(countryCodes)}&q=${encodeURIComponent(q)}`;

  const rows = await fetchJson<{ display_name: string; lat: string; lon: string }[]>(url, {
    method: "GET",
    headers: nominatimHeaders(),
  });

  return rows.map((r) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

export async function nominatimReverse(
  lat: number,
  lng: number
): Promise<{ displayName: string; shortName: string } | null> {
  const base = env.NOMINATIM_URL.replace(/\/$/, "");
  const url = `${base}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

  const row = await fetchJson<{
    display_name?: string;
    address?: {
      road?: string;
      neighbourhood?: string;
      suburb?: string;
      village?: string;
      town?: string;
      city?: string;
    };
  }>(url, { method: "GET", headers: nominatimHeaders() });

  if (!row.display_name) return null;
  const a = row.address ?? {};
  const shortName =
    a.road ??
    a.neighbourhood ??
    a.suburb ??
    a.village ??
    a.town ??
    a.city ??
    row.display_name.split(",")[0];

  return { displayName: row.display_name, shortName };
}

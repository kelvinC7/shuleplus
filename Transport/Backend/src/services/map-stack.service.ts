import { AppError } from "../middleware/error.middleware";
import * as openMap from "../clients/open-map.client";

const WINDOW_MS = 60_000;
const limits = new Map<string, { count: number; windowStart: number }>();

function rateLimit(bucket: string, maxPerMinute: number) {
  const now = Date.now();
  const row = limits.get(bucket);
  if (!row || now - row.windowStart > WINDOW_MS) {
    limits.set(bucket, { count: 1, windowStart: now });
    return;
  }
  row.count += 1;
  if (row.count > maxPerMinute) {
    throw new AppError(429, "Too many map requests — try again in a moment");
  }
}

function assertLatLng(lat: unknown, lng: unknown) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
    throw new AppError(400, "Invalid coordinates");
  }
  return { lat: la, lng: ln };
}

export function mapStackMeta() {
  return {
    stack: "leaflet-osm",
    routing: "osrm",
    geocoding: "nominatim",
    tiles: "openstreetmap",
    apiKeyRequired: false,
  };
}

export function searchPlaces(orgId: string, query: string, limit = 8) {
  rateLimit(`map:search:${orgId}`, 40);
  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const country = process.env.MAP_GEOCODING_COUNTRY ?? "rw";
  return openMap.nominatimSearch(query, safeLimit, country);
}

export function reversePlace(orgId: string, lat: number, lng: number) {
  rateLimit(`map:reverse:${orgId}`, 60);
  const coords = assertLatLng(lat, lng);
  return openMap.nominatimReverse(coords.lat, coords.lng);
}

export async function roadRoute(orgId: string, stops: openMap.LatLng[]) {
  rateLimit(`map:route:${orgId}`, 25);
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new AppError(400, "At least two stops are required for routing");
  }
  if (stops.length > 25) {
    throw new AppError(400, "Too many stops for one route calculation");
  }
  const parsed = stops.map((s, i) => {
    try {
      return assertLatLng(s.lat, s.lng);
    } catch {
      throw new AppError(400, `Invalid coordinates at stop ${i + 1}`);
    }
  });
  const result = await openMap.osrmRoute(parsed);
  if (!result) throw new AppError(502, "Could not compute road route for these stops");
  return result;
}

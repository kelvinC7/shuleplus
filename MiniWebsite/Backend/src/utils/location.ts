export interface LocationParts {
  village?: string | null;
  cell?: string | null;
  sector?: string | null;
  district?: string | null;
  province?: string | null;
  address?: string | null;
  country?: string | null;
}

/** Builds a human-readable Rwanda address from admin divisions. */
export function formatLocationAddress(parts: LocationParts): string {
  const segments = [
    parts.village?.trim(),
    parts.cell?.trim(),
    parts.sector?.trim(),
    parts.district?.trim(),
    parts.province?.trim(),
    parts.country?.trim() || 'Rwanda',
  ].filter(Boolean) as string[];

  if (segments.length <= 1 && parts.address?.trim()) {
    return parts.address.trim();
  }

  return segments.join(', ');
}

/**
 * Map geocoding query — pins at cell level when available
 * (cell → sector → district → province → Rwanda).
 */
export function buildMapQuery(parts: LocationParts): string {
  if (parts.address?.trim() && !parts.cell?.trim() && !parts.sector?.trim()) {
    return parts.address.trim();
  }

  const segments = [
    parts.cell?.trim(),
    parts.sector?.trim(),
    parts.district?.trim(),
    parts.province?.trim(),
    parts.country?.trim() || 'Rwanda',
  ].filter(Boolean);

  if (segments.length > 1) return segments.join(', ');

  return parts.address?.trim() || parts.district?.trim() || parts.province?.trim() || 'Kigali, Rwanda';
}

/** Zoom level tuned to admin granularity (cell ≈ street-level). */
export function mapZoomLevel(parts: LocationParts): number {
  if (parts.cell?.trim()) return 17;
  if (parts.sector?.trim()) return 15;
  if (parts.district?.trim()) return 14;
  return 13;
}

export function buildMapEmbedUrl(parts: LocationParts): string {
  const query = buildMapQuery(parts);
  const zoom = mapZoomLevel(parts);
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=${zoom}`;
}

export function locationSummary(parts: LocationParts): string {
  return [parts.cell, parts.sector, parts.district, parts.province].filter(Boolean).join(' · ');
}

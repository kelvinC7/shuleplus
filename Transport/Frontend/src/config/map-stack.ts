/**
 * Open map stack  -  no vendor API keys.
 * Tiles: Leaflet + public OpenStreetMap tile servers.
 * Geocoding & routing: Transport API → OSRM + Nominatim (server-side).
 *
 * Note: CARTO basemaps (cartocdn.com) now require a CARTO API key and show
 * "API KEY REQUIRED" without one  -  not used here.
 */

export const MAP_STACK = {
  name: 'Leaflet + OpenStreetMap ecosystem',
  routing: 'OSRM',
  geocoding: 'Nominatim (OSM)',
  tiles: 'OpenStreetMap (public tile servers)',
  apiKeyRequired: false,
} as const;

export type MapTilePreset = keyof typeof MAP_TILE_PRESETS;

/**
 * Keyless raster presets. Respect each provider's usage policy; for heavy
 * production traffic, proxy tiles or self-host (see Transport README).
 */
export const MAP_TILE_PRESETS = {
  osm: {
    base: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc',
    },
    labels: null,
  },
  hot: {
    base: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">HOT</a>',
      maxZoom: 19,
      subdomains: 'abc',
    },
    labels: null,
  },
  opentopo: {
    base: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
      subdomains: 'abc',
    },
    labels: null,
  },
} as const;

const presetKey = (process.env.NEXT_PUBLIC_MAP_TILE_PRESET ?? 'osm') as MapTilePreset;
const preset = MAP_TILE_PRESETS[presetKey] ?? MAP_TILE_PRESETS.osm;

export const MAP_TILES = {
  base: preset.base,
  labelOverlay: preset.labels ?? { url: '', maxZoom: 19, subdomains: 'abc' as const },
} as const;

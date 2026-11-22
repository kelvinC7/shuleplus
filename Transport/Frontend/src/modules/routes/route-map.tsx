'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { MAP_TILES } from '@/config/map-stack';
import type { LatLng } from '@/utils/routing';
import 'leaflet/dist/leaflet.css';

const defaultCenter: LatLng = { lat: -1.9403, lng: 29.8739 };

function markerLabel(kind: string | undefined, sequence: number, pickupIndex: number) {
  if (kind === 'ORIGIN') return 'S';
  if (kind === 'DESTINATION' || kind === 'SCHOOL') return 'E';
  if (kind === 'PICKUP') return `P${pickupIndex || sequence}`;
  if (kind === 'DROPOFF') return `D${pickupIndex || sequence}`;
  return String(sequence);
}

function stopMarkerIcon(n: number, color: string, kind?: string, pickupIndex = 0) {
  let bg = color;
  let fg = '#000435';
  if (kind === 'ORIGIN') {
    bg = '#000435';
    fg = '#FCB038';
  } else if (kind === 'DESTINATION' || kind === 'SCHOOL') {
    bg = '#10b981';
    fg = '#fff';
  } else if (kind === 'PICKUP') {
    bg = '#2563EB';
    fg = '#fff';
  } else if (kind === 'DROPOFF') {
    bg = '#F97316';
    fg = '#fff';
  }
  const label = markerLabel(kind, n, pickupIndex);
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;height:36px;width:36px;align-items:center;justify-content:center;border-radius:9999px;background:${bg};color:${fg};font-size:10px;font-weight:800;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,4,53,.3)">${label}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function DraggableStop({
  stop,
  color,
  pickupIndex,
  onDragEnd,
}: {
  stop: RouteMapStop;
  color: string;
  pickupIndex: number;
  onDragEnd: (id: string, lat: number, lng: number) => void;
}) {
  const ref = useRef<L.Marker>(null);
  if (stop.lat == null || stop.lng == null) return null;
  const tip = [stop.name, stop.subtitle].filter(Boolean).join(' · ');
  return (
    <Marker
      draggable
      ref={ref}
      position={[stop.lat, stop.lng]}
      icon={stopMarkerIcon(stop.sequence, color, stop.kind, pickupIndex)}
      eventHandlers={{
        dragend: () => {
          const ll = ref.current?.getLatLng();
          if (ll) onDragEnd(stop.id, ll.lat, ll.lng);
        },
      }}
    >
      <Tooltip permanent direction="top" offset={[0, -18]} className="route-stop-tooltip">
        {tip || 'Stop'}
      </Tooltip>
    </Marker>
  );
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 16);
      return;
    }
    const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }, [map, points]);
  return null;
}

function FocusHandler({ focus }: { focus?: { lat: number; lng: number; zoom?: number; key?: string | number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (!Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [map, focus?.key, focus?.lat, focus?.lng, focus?.zoom]);
  return null;
}

function MapClickHandler({ enabled, onClick }: { enabled?: boolean; onClick?: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (!enabled || !onClick) return;
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export interface RouteMapStop {
  id: string;
  name: string;
  sequence: number;
  lat?: number | null;
  lng?: number | null;
  kind?: string;
  subtitle?: string;
}

export interface RouteMapLayer {
  id: string;
  color: string;
  path?: LatLng[];
  stops?: RouteMapStop[];
  selected?: boolean;
}

interface RouteMapProps {
  heightClass?: string;
  stops?: RouteMapStop[];
  path?: LatLng[];
  routeColor?: string;
  lineWeight?: number;
  lineOpacity?: number;
  layers?: RouteMapLayer[];
  clickToAdd?: boolean;
  onMapClick?: (p: LatLng) => void;
  onStopDrag?: (stopId: string, lat: number, lng: number) => void;
  draggableStops?: boolean;
  school?: LatLng | null;
  focus?: { lat: number; lng: number; zoom?: number; key?: string | number } | null;
}

export function RouteMap({
  heightClass = 'h-[320px] sm:h-[420px]',
  stops = [],
  path = [],
  routeColor = '#FCB038',
  lineWeight = 7,
  lineOpacity = 1,
  layers = [],
  clickToAdd,
  onMapClick,
  onStopDrag,
  draggableStops,
  school,
  focus,
}: RouteMapProps) {
  const sortedStops = useMemo(
    () =>
      [...stops]
        .filter((s) => s.lat != null && s.lng != null)
        .sort((a, b) => a.sequence - b.sequence),
    [stops]
  );

  const pickupCounts = useMemo(() => {
    const m = new Map<string, number>();
    let p = 0;
    let d = 0;
    for (const s of sortedStops) {
      if (s.kind === 'PICKUP') {
        p += 1;
        m.set(s.id, p);
      } else if (s.kind === 'DROPOFF') {
        d += 1;
        m.set(s.id, d);
      }
    }
    return m;
  }, [sortedStops]);

  const stopPoints = sortedStops.map((s) => ({ lat: s.lat!, lng: s.lng! }));

  const allPoints = useMemo(() => {
    const pts = [...stopPoints, ...path];
    if (school) pts.push(school);
    for (const layer of layers) {
      if (layer.path) pts.push(...layer.path);
    }
    return pts;
  }, [stopPoints, path, school, layers]);

  const center = stopPoints[0] ?? school ?? defaultCenter;
  const tiles = MAP_TILES.base;

  return (
    <div className={`route-map-shell relative overflow-hidden rounded-2xl border border-border shadow-inner ${heightClass}`}>
      <MapContainer center={[center.lat, center.lng]} zoom={14} className="z-0 h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          maxZoom={tiles.maxZoom}
          subdomains={tiles.subdomains}
        />
        {MAP_TILES.labelOverlay.url ? (
          <TileLayer
            url={MAP_TILES.labelOverlay.url}
            maxZoom={MAP_TILES.labelOverlay.maxZoom}
            subdomains={MAP_TILES.labelOverlay.subdomains}
            pane="overlayPane"
            opacity={0.95}
          />
        ) : null}
        <FitBounds points={allPoints.length ? allPoints : [defaultCenter]} />
        <FocusHandler focus={focus ?? null} />
        <MapClickHandler enabled={clickToAdd} onClick={onMapClick} />

        {layers.map((layer) =>
          layer.path && layer.path.length > 1 ? (
            <Polyline
              key={layer.id}
              positions={layer.path.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: layer.color,
                weight: layer.selected ? 6 : 3,
                opacity: layer.selected ? 0.95 : 0.45,
              }}
            />
          ) : null
        )}

        {path.length > 1 ? (
          <>
            <Polyline
              positions={path.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#ffffff', weight: lineWeight + 5, opacity: 0.9 }}
            />
            <Polyline
              positions={path.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: routeColor, weight: lineWeight, opacity: lineOpacity }}
            />
          </>
        ) : null}

        {sortedStops.map((s) =>
          draggableStops && onStopDrag ? (
            <DraggableStop
              key={s.id}
              stop={s}
              color={routeColor}
              pickupIndex={pickupCounts.get(s.id) ?? 0}
              onDragEnd={onStopDrag}
            />
          ) : (
            <Marker
              key={s.id}
              position={[s.lat!, s.lng!]}
              icon={stopMarkerIcon(s.sequence, routeColor, s.kind, pickupCounts.get(s.id) ?? 0)}
            >
              <Tooltip permanent direction="top" offset={[0, -18]}>
                {[s.name, s.subtitle].filter(Boolean).join(' · ')}
              </Tooltip>
            </Marker>
          )
        )}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 z-[3] flex flex-wrap gap-2 rounded-lg bg-white/90 px-2 py-1 text-[9px] font-bold uppercase text-navy shadow">
        <span>S Start</span>
        <span className="text-blue-600">P Pickup</span>
        <span className="text-orange-600">D Drop-off</span>
        <span className="text-emerald-600">E End</span>
      </div>
      {clickToAdd ? (
        <div className="pointer-events-none absolute right-2 top-2 z-[3] rounded-lg bg-[#000435]/90 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow">
          Click map to set selected stop
        </div>
      ) : null}
    </div>
  );
}

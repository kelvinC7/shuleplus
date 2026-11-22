'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { TransportStop } from '@/types/parent-transport';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [-1.9403, 29.8739];

function stopIcon(sequence: number, color: string, highlight: boolean) {
  const bg = highlight ? '#FCB038' : color || '#2563EB';
  const fg = highlight ? '#000435' : '#fff';
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;height:32px;width:32px;align-items:center;justify-content:center;border-radius:9999px;background:${bg};color:${fg};font-size:11px;font-weight:800;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,4,53,.25)">${sequence}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function busIcon(live: boolean) {
  const ring = live ? '#22c55e' : '#94a3b8';
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;height:40px;width:40px;align-items:center;justify-content:center;border-radius:9999px;background:#000435;color:#FCB038;font-size:18px;border:3px solid ${ring};box-shadow:0 2px 12px rgba(0,4,53,.35)">🚌</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0]!, 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export function TransportRouteMap({
  stops,
  routeColor = '#2563EB',
  liveTracking,
}: {
  stops: TransportStop[];
  routeColor?: string;
  liveTracking?: { latitude: number; longitude: number; isLive: boolean; stale: boolean } | null;
}) {
  const mapped = useMemo(
    () => stops.filter((s) => s.latitude != null && s.longitude != null),
    [stops]
  );
  const line: [number, number][] = useMemo(
    () => mapped.map((s) => [s.latitude!, s.longitude!]),
    [mapped]
  );
  const fitPoints = useMemo(() => {
    const pts = [...line];
    if (liveTracking) pts.push([liveTracking.latitude, liveTracking.longitude]);
    return pts;
  }, [line, liveTracking]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        className="h-[min(420px,55vh)] w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitPoints} />
        {line.length >= 2 ? (
          <Polyline positions={line} pathOptions={{ color: routeColor, weight: 4, opacity: 0.85 }} />
        ) : null}
        {mapped.map((s) => (
          <Marker
            key={s.id}
            position={[s.latitude!, s.longitude!]}
            icon={stopIcon(s.sequence, routeColor, s.isChildStop)}
          >
            <Tooltip direction="top" offset={[0, -14]}>
              {s.name}
              {s.landmark ? ` · ${s.landmark}` : ''}
            </Tooltip>
          </Marker>
        ))}
        {liveTracking ? (
          <Marker
            position={[liveTracking.latitude, liveTracking.longitude]}
            icon={busIcon(liveTracking.isLive && !liveTracking.stale)}
          >
            <Tooltip direction="top">Bus</Tooltip>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}

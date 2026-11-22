'use client';

import { useEffect, useState } from 'react';
import { Crosshair, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { rwandaLocations, type RwandaLocationNode } from '@/services/rwanda-locations';
import { searchPlaces } from '@/utils/routing';

export interface RwandaLocationValue {
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  cellId?: string;
  villageId?: string;
  provinceName?: string;
  districtName?: string;
  sectorName?: string;
  cellName?: string;
  villageName?: string;
  placeName?: string;
  adminLabel?: string;
  latitude?: number;
  longitude?: number;
}

type PickMode = 'admin' | 'search' | 'map' | 'coordinates';

interface RwandaLocationPickerProps {
  value: RwandaLocationValue;
  onChange: (v: RwandaLocationValue) => void;
  mapPickActive?: boolean;
  onRequestMapPick?: () => void;
  label?: string;
}

function SelectField({
  label,
  disabled,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  disabled?: boolean;
  value: string;
  onChange: (id: string) => void;
  options: RwandaLocationNode[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase text-muted">{label}</span>
      <select
        className="input bg-white text-sm"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RwandaLocationPicker({
  value,
  onChange,
  mapPickActive,
  onRequestMapPick,
  label = 'Location',
}: RwandaLocationPickerProps) {
  const [mode, setMode] = useState<PickMode>('admin');
  const [provinces, setProvinces] = useState<RwandaLocationNode[]>([]);
  const [districts, setDistricts] = useState<RwandaLocationNode[]>([]);
  const [sectors, setSectors] = useState<RwandaLocationNode[]>([]);
  const [cells, setCells] = useState<RwandaLocationNode[]>([]);
  const [villages, setVillages] = useState<RwandaLocationNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<{ displayName: string; lat: number; lng: number }[]>([]);

  useEffect(() => {
    void rwandaLocations.provinces().then(({ data }) => setProvinces(data.data ?? []));
  }, []);

  useEffect(() => {
    if (!value.provinceId) {
      setDistricts([]);
      return;
    }
    void rwandaLocations.districts(value.provinceId).then(({ data }) => setDistricts(data.data ?? []));
  }, [value.provinceId]);

  useEffect(() => {
    if (!value.districtId) {
      setSectors([]);
      return;
    }
    void rwandaLocations.sectors(value.districtId).then(({ data }) => setSectors(data.data ?? []));
  }, [value.districtId]);

  useEffect(() => {
    if (!value.sectorId) {
      setCells([]);
      return;
    }
    void rwandaLocations.cells(value.sectorId).then(({ data }) => setCells(data.data ?? []));
  }, [value.sectorId]);

  useEffect(() => {
    if (!value.cellId) {
      setVillages([]);
      return;
    }
    void rwandaLocations.villages(value.cellId).then(({ data }) => setVillages(data.data ?? []));
  }, [value.cellId]);

  useEffect(() => {
    if (mode !== 'search' || searchQ.trim().length < 3) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(() => void searchPlaces(searchQ).then(setSearchHits), 350);
    return () => clearTimeout(t);
  }, [mode, searchQ]);

  function patch(p: Partial<RwandaLocationValue>) {
    onChange({ ...value, ...p });
  }

  function nameOf(list: RwandaLocationNode[], id?: string) {
    return list.find((x) => x.id === id)?.name;
  }

  function buildAdminLabel(v: RwandaLocationValue) {
    return [v.districtName, v.sectorName, v.cellName, v.villageName].filter(Boolean).join(' Â· ');
  }

  async function geocodeVillage(v: RwandaLocationValue) {
    const q = [v.villageName, v.cellName, v.sectorName, v.districtName, 'Rwanda'].filter(Boolean).join(', ');
    if (!q) return;
    setLoading(true);
    try {
      const hits = await searchPlaces(q);
      const hit = hits[0];
      if (hit) {
        onChange({
          ...v,
          latitude: hit.lat,
          longitude: hit.lng,
          adminLabel: buildAdminLabel(v),
          placeName: v.placeName || hit.displayName.split(',')[0],
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-slate-50/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase text-navy">{label}</p>
        {loading ? <Loader2 size={14} className="animate-spin text-muted" /> : null}
      </div>
      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-white p-1">
        {(
          [
            ['admin', 'Administrative'],
            ['search', 'Search'],
            ['coordinates', 'Coordinates'],
            ['map', 'On map'],
          ] as const
        ).map(([m, t]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase ${mode === m ? 'bg-navy text-primary' : 'text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {mode === 'admin' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <SelectField
            label="Province / City"
            value={value.provinceId ?? ''}
            placeholder="Select province"
            options={provinces}
            onChange={(id) =>
              patch({
                provinceId: id,
                provinceName: nameOf(provinces, id),
                districtId: undefined,
                sectorId: undefined,
                cellId: undefined,
                villageId: undefined,
              })
            }
          />
          <SelectField
            label="District"
            disabled={!value.provinceId}
            value={value.districtId ?? ''}
            placeholder="Select district"
            options={districts}
            onChange={(id) =>
              patch({
                districtId: id,
                districtName: nameOf(districts, id),
                sectorId: undefined,
                cellId: undefined,
                villageId: undefined,
              })
            }
          />
          <SelectField
            label="Sector"
            disabled={!value.districtId}
            value={value.sectorId ?? ''}
            placeholder="Select sector"
            options={sectors}
            onChange={(id) =>
              patch({
                sectorId: id,
                sectorName: nameOf(sectors, id),
                cellId: undefined,
                villageId: undefined,
              })
            }
          />
          <SelectField
            label="Cell"
            disabled={!value.sectorId}
            value={value.cellId ?? ''}
            placeholder="Select cell"
            options={cells}
            onChange={(id) =>
              patch({
                cellId: id,
                cellName: nameOf(cells, id),
                villageId: undefined,
              })
            }
          />
          <SelectField
            label="Village (Umudugudu)"
            disabled={!value.cellId}
            value={value.villageId ?? ''}
            placeholder="Select village"
            options={villages}
            onChange={(id) => {
              const next = {
                ...value,
                villageId: id,
                villageName: nameOf(villages, id),
              };
              void geocodeVillage(next);
            }}
          />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Known place / landmark</span>
            <input
              className="input bg-white text-sm"
              placeholder="e.g. bus stop, market, junction"
              value={value.placeName ?? ''}
              onChange={(e) => patch({ placeName: e.target.value, adminLabel: buildAdminLabel({ ...value, placeName: e.target.value }) })}
            />
          </label>
        </div>
      ) : null}

      {mode === 'search' ? (
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input bg-white pl-8 text-sm"
              placeholder="Search address or place in Rwandaâ€¦"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </div>
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {searchHits.map((h) => (
              <li key={`${h.lat}-${h.lng}`}>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white"
                  onClick={() =>
                    patch({
                      latitude: h.lat,
                      longitude: h.lng,
                      placeName: h.displayName.split(',')[0],
                      adminLabel: h.displayName,
                    })
                  }
                >
                  {h.displayName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mode === 'coordinates' ? (
        <CoordinatesMode value={value} onChange={onChange} onRequestMapPick={onRequestMapPick} />
      ) : null}

      {mode === 'map' ? (
        <button
          type="button"
          onClick={onRequestMapPick}
          className={`btn-secondary w-full text-xs ${mapPickActive ? 'ring-2 ring-primary' : ''}`}
        >
          <MapPin size={14} /> {mapPickActive ? 'Click the map to set this pointâ€¦' : 'Choose on map'}
        </button>
      ) : null}

      {value.latitude != null && value.longitude != null ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2 text-[10px] text-emerald-900">
          <span className="min-w-0 flex-1">
            <strong>Placed:</strong> {value.adminLabel || value.placeName || 'Coordinates'} Â· {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          </span>
          {onRequestMapPick ? (
            <button type="button" className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-navy shadow-sm ring-1 ring-emerald-200 hover:bg-emerald-50" onClick={onRequestMapPick}>
              <Crosshair size={12} /> Pick on map
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CoordinatesMode({
  value,
  onChange,
  onRequestMapPick,
}: {
  value: RwandaLocationValue;
  onChange: (v: RwandaLocationValue) => void;
  onRequestMapPick?: () => void;
}) {
  const [lat, setLat] = useState(value.latitude != null ? String(value.latitude) : '');
  const [lng, setLng] = useState(value.longitude != null ? String(value.longitude) : '');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLat(value.latitude != null ? String(value.latitude) : '');
    setLng(value.longitude != null ? String(value.longitude) : '');
  }, [value.latitude, value.longitude]);

  function apply() {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      setErr('Enter valid numeric latitude and longitude.');
      return;
    }
    if (la < -90 || la > 90 || ln < -180 || ln > 180) {
      setErr('Latitude must be -90..90 and longitude -180..180.');
      return;
    }
    setErr(null);
    onChange({
      ...value,
      latitude: la,
      longitude: ln,
      placeName: value.placeName || 'Pinned coordinates',
      adminLabel: value.adminLabel || `${la.toFixed(5)}, ${ln.toFixed(5)}`,
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Latitude</span>
          <input className="input bg-white text-sm" inputMode="decimal" placeholder="-1.9441" value={lat} onChange={(e) => setLat(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Longitude</span>
          <input className="input bg-white text-sm" inputMode="decimal" placeholder="30.0619" value={lng} onChange={(e) => setLng(e.target.value)} />
        </label>
      </div>
      {err ? <p className="text-[11px] font-medium text-danger">{err}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary !py-2 text-xs" onClick={apply}>
          <Navigation size={14} /> Set coordinates
        </button>
        {onRequestMapPick ? (
          <button type="button" className="btn-secondary !py-2 text-xs" onClick={onRequestMapPick}>
            <Crosshair size={14} /> Pick on map
          </button>
        ) : null}
      </div>
      <p className="text-[10px] text-muted">Paste GPS coordinates and click â€œSet coordinatesâ€ â€” the stop is placed and the map moves to that location.</p>
    </div>
  );
}

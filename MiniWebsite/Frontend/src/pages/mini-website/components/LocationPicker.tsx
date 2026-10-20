import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Box, MenuItem, TextField } from '@mui/material';

const IAM_API =
  import.meta.env.VITE_IAM_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/api/v1';

type Loc = { id: string; name: string };

export interface LocationValue {
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}

const fieldSx = {
  '& .MuiInputBase-root': { fontSize: '0.75rem', minHeight: '32px' },
  '& .MuiInputLabel-root': { fontSize: '0.7rem' },
};

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [provinces, setProvinces] = useState<Loc[]>([]);
  const [districts, setDistricts] = useState<Loc[]>([]);
  const [sectors, setSectors] = useState<Loc[]>([]);
  const [cells, setCells] = useState<Loc[]>([]);
  const [villages, setVillages] = useState<Loc[]>([]);
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [cellId, setCellId] = useState('');

  const sortLocs = useCallback(
    (list: Loc[]) => [...list].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  useEffect(() => {
    axios
      .get(`${IAM_API}/public/locations/provinces`)
      .then((r) => setProvinces(sortLocs((r.data.data ?? []) as Loc[])))
      .catch(() => setProvinces([]));
  }, [sortLocs]);

  useEffect(() => {
    if (!value.province || provinces.length === 0) return;
    const match = provinces.find((p) => p.name === value.province);
    if (match) setProvinceId(match.id);
  }, [value.province, provinces]);

  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    axios
      .get(`${IAM_API}/public/locations/provinces/${provinceId}/districts`)
      .then((r) => setDistricts(sortLocs((r.data.data ?? []) as Loc[])))
      .catch(() => setDistricts([]));
  }, [provinceId, sortLocs]);

  useEffect(() => {
    if (!value.district || districts.length === 0) return;
    const match = districts.find((d) => d.name === value.district);
    if (match) setDistrictId(match.id);
  }, [value.district, districts]);

  useEffect(() => {
    if (!districtId) {
      setSectors([]);
      return;
    }
    axios
      .get(`${IAM_API}/public/locations/districts/${districtId}/sectors`)
      .then((r) => setSectors(sortLocs((r.data.data ?? []) as Loc[])))
      .catch(() => setSectors([]));
  }, [districtId, sortLocs]);

  useEffect(() => {
    if (!value.sector || sectors.length === 0) return;
    const match = sectors.find((s) => s.name === value.sector);
    if (match) setSectorId(match.id);
  }, [value.sector, sectors]);

  useEffect(() => {
    if (!sectorId) {
      setCells([]);
      return;
    }
    axios
      .get(`${IAM_API}/public/locations/sectors/${sectorId}/cells`)
      .then((r) => setCells(sortLocs((r.data.data ?? []) as Loc[])))
      .catch(() => setCells([]));
  }, [sectorId, sortLocs]);

  useEffect(() => {
    if (!value.cell || cells.length === 0) return;
    const match = cells.find((c) => c.name === value.cell);
    if (match) setCellId(match.id);
  }, [value.cell, cells]);

  useEffect(() => {
    if (!cellId) {
      setVillages([]);
      return;
    }
    axios
      .get(`${IAM_API}/public/locations/cells/${cellId}/villages`)
      .then((r) => setVillages(sortLocs((r.data.data ?? []) as Loc[])))
      .catch(() => setVillages([]));
  }, [cellId, sortLocs]);

  function patch(partial: Partial<LocationValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <TextField
        select
        size="small"
        label="Province"
        value={provinceId}
        onChange={(e) => {
          const id = e.target.value;
          const selected = provinces.find((p) => p.id === id);
          setProvinceId(id);
          setDistrictId('');
          setSectorId('');
          setCellId('');
          patch({
            province: selected?.name ?? '',
            district: '',
            sector: '',
            cell: '',
            village: '',
          });
        }}
        sx={fieldSx}
        fullWidth
      >
        <MenuItem value="">Select province</MenuItem>
        {provinces.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="District"
        value={districtId}
        disabled={!provinceId}
        onChange={(e) => {
          const id = e.target.value;
          const selected = districts.find((d) => d.id === id);
          setDistrictId(id);
          setSectorId('');
          setCellId('');
          patch({ district: selected?.name ?? '', sector: '', cell: '', village: '' });
        }}
        sx={fieldSx}
        fullWidth
      >
        <MenuItem value="">{provinceId ? 'Select district' : 'Select province first'}</MenuItem>
        {districts.map((d) => (
          <MenuItem key={d.id} value={d.id}>
            {d.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Sector"
        value={sectorId}
        disabled={!districtId}
        onChange={(e) => {
          const id = e.target.value;
          const selected = sectors.find((s) => s.id === id);
          setSectorId(id);
          setCellId('');
          patch({ sector: selected?.name ?? '', cell: '', village: '' });
        }}
        sx={fieldSx}
        fullWidth
      >
        <MenuItem value="">{districtId ? 'Select sector' : 'Select district first'}</MenuItem>
        {sectors.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Cell"
        value={cellId}
        disabled={!sectorId}
        onChange={(e) => {
          const id = e.target.value;
          const selected = cells.find((c) => c.id === id);
          setCellId(id);
          patch({ cell: selected?.name ?? '', village: '' });
        }}
        sx={fieldSx}
        fullWidth
      >
        <MenuItem value="">{sectorId ? 'Select cell' : 'Select sector first'}</MenuItem>
        {cells.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Village (optional)"
        value={villages.find((v) => v.name === value.village)?.id ?? ''}
        disabled={!cellId || villages.length === 0}
        onChange={(e) => {
          const selected = villages.find((v) => v.id === e.target.value);
          patch({ village: selected?.name ?? '' });
        }}
        sx={{ ...fieldSx, gridColumn: { sm: '1 / -1' } }}
        fullWidth
      >
        <MenuItem value="">
          {!cellId ? 'Select cell first' : villages.length === 0 ? 'Not available' : 'Select village'}
        </MenuItem>
        {villages.map((v) => (
          <MenuItem key={v.id} value={v.id}>
            {v.name}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}

export function buildAddressFromLocation(value: LocationValue, postalAddress?: string): string {
  const parts = [value.village, value.cell, value.sector, value.district, value.province, 'Rwanda'].filter(
    Boolean
  );
  if (postalAddress?.trim()) return postalAddress.trim();
  return parts.join(', ');
}

export function buildMapEmbedUrl(value: LocationValue, postalAddress?: string): string {
  if (postalAddress?.trim() && !value.cell && !value.sector) {
    return `https://www.google.com/maps?q=${encodeURIComponent(postalAddress.trim())}&output=embed&z=15`;
  }

  const segments = [value.cell, value.sector, value.district, value.province, 'Rwanda'].filter(Boolean);
  const query = segments.join(', ') || 'Kigali, Rwanda';
  const zoom = value.cell ? 17 : value.sector ? 15 : value.district ? 14 : 13;

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=${zoom}`;
}

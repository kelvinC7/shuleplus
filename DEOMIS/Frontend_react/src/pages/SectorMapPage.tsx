import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { fetchDistrictMap } from '@/services/deo-api';
import { StatusChip } from '@/components/status-chip';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';
import type { SchoolMapPoint } from '@/types';

export default function SectorMapPage() {
  const [points, setPoints] = useState<SchoolMapPoint[]>([]);
  const [selected, setSelected] = useState<SchoolMapPoint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistrictMap()
      .then(setPoints)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  const minLat = Math.min(...points.map((p) => p.lat));
  const maxLat = Math.max(...points.map((p) => p.lat));
  const minLng = Math.min(...points.map((p) => p.lng));
  const maxLng = Math.max(...points.map((p) => p.lng));

  function project(lat: number, lng: number) {
    const x = maxLng === minLng ? 50 : ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = maxLat === minLat ? 50 : (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return { x, y };
  }

  const dotColor = (status: string) => {
    if (status === 'normal') return '#22c55e';
    if (status === 'monitoring') return '#eab308';
    if (status === 'offline') return '#6b7280';
    return '#ef4444';
  };

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' } }}>
      <SectionCard
        title="Sector attendance map"
        subtitle="Normal · Monitoring · Attention · Offline · GPS from IAM when registered"
      >
        <Box
          sx={{
            position: 'relative',
            height: { xs: 320, md: 420 },
            borderRadius: 2,
            bgcolor: 'linear-gradient(180deg,#e8eef9,#f4f6fb)',
            background: 'linear-gradient(180deg,#dce6f5 0%,#f4f6fb 100%)',
            border: '1px solid rgba(0,4,53,0.08)',
            overflow: 'hidden',
          }}
        >
          {points.map((p) => {
            const { x, y } = project(p.lat, p.lng);
            return (
              <Box
                key={p.id}
                onClick={() => setSelected(p)}
                role="button"
                tabIndex={0}
                sx={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: dotColor(p.status),
                  border: '2px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,4,53,0.25)',
                  cursor: 'pointer',
                }}
                aria-label={p.name}
              />
            );
          })}
        </Box>
      </SectionCard>

      <SectionCard title={selected?.name ?? 'Select a school'} subtitle="School detail">
        {selected ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <StatusChip status={selected.status} />
            <Typography sx={{ fontSize: '0.875rem' }}>Student attendance: {selected.studentAttendancePct}%</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Staff attendance: {selected.staffAttendancePct}%</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Device: {selected.deviceOnline ? 'Online' : 'Offline'}</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Last sync: {selected.lastSync ?? '-'}</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Alerts: {selected.alerts}</Typography>
          </Box>
        ) : (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Tap a marker on the map.</Typography>
        )}
      </SectionCard>
    </Box>
  );
}

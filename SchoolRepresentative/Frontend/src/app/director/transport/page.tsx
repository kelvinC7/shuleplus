'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import LinearProgress from '@mui/material/LinearProgress';
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatNumber } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { TransportData } from '@/types';

type BusRow = TransportData['buses'][number];

export default function TransportPage() {
  const { refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<TransportData>(() => consoleApi.transport(), [refreshKey]);
  const [selected, setSelected] = useState<BusRow | null>(null);

  if (loading && !data) return <PageLoading label="Loading fleet status…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No transport data" />;

  const onRoute = data.buses.filter((b) => b.status === 'on-route' || b.status === 'enroute').length;
  const delayed = data.buses.filter((b) => b.status === 'late' || b.status === 'delayed').length;
  const parked = data.buses.filter((b) => b.status === 'parked').length;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Smart Transport"
        description="Buses, routes, live progress and delays. GPS updates arrive from the Smart Transport module."
/>

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={5} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Buses registered" value={formatNumber(data.buses.length)} icon={<DirectionsBusOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="On route" value={onRoute} icon={<PlaceOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Delayed" value={delayed} icon={<AccessTimeIcon sx={{ fontSize: 20 }} />} valueSx={delayed ? { color: brand.danger } : undefined} />
          <KpiCard label="Parked" value={parked} icon={<BuildOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Students on board" value={formatNumber(data.summary?.studentsOnBoard ?? data.buses.reduce((s, b) => s + (b.studentsOnBoard ?? 0), 0))} icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' } }}>
        <PanelCard title="Live map" subtitle="Approximate positions">
          <Box
            sx={{
              position: 'relative',
              height: 320,
              borderRadius: 1.25,
              bgcolor: '#0b1b3a',
              backgroundImage:
                'radial-gradient(circle at 30% 40%, rgba(252,176,56,0.15), transparent 50%), radial-gradient(circle at 70% 60%, rgba(62,123,250,0.12), transparent 45%)',
              overflow: 'hidden',
            }}
          >
            {data.buses.map((bus, i) => (
              <Button
                key={bus.id}
                onClick={() => setSelected(bus)}
                sx={{
                  position: 'absolute',
                  left: `${12 + ((i * 17) % 70)}%`,
                  top: `${18 + ((i * 23) % 55)}%`,
                  minWidth: 0,
                  p: 0.5,
                  flexDirection: 'column',
                  color: '#fff',
                  '&:hover': { bgcolor: 'transparent' },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: bus.status === 'late' || bus.status === 'delayed' ? brand.danger : brand.primary,
                    color: brand.navy,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DirectionsBusOutlinedIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography sx={{ mt: 0.5, fontSize: 9, fontWeight: 700, bgcolor: 'rgba(0,4,53,0.8)', px: 0.75, py: 0.25, borderRadius: 1 }}>
                  {bus.name}
                </Typography>
              </Button>
            ))}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ position: 'absolute', bottom: 12, left: 12, bgcolor: 'rgba(0,0,0,0.35)', px: 1.25, py: 0.75, borderRadius: 2 }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: brand.success }} />
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>GPS live · updated moments ago</Typography>
            </Stack>
          </Box>
        </PanelCard>

        <PanelCard title="Fleet" subtitle="Tap a bus for details" bodySx={{ px: 0, pt: 0 }}>
          <List disablePadding>
            {data.buses.map((bus) => (
              <ListItemButton
                key={bus.id}
                onClick={() => setSelected(bus)}
                sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 0.5, px: 2, py: 1.5, borderBottom: `1px solid ${brand.border}` }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{bus.name}</Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <StatusBadge value={bus.status} />
                  </Box>
                </Stack>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{bus.route}</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress
                    variant="determinate"
                    value={bus.progress ?? 0}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 999,
                      bgcolor: 'rgba(0,4,53,0.06)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        bgcolor: bus.status === 'late' || bus.status === 'delayed' ? brand.danger : brand.primary,
                      },
                    }}
                  />
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', minWidth: 48, textAlign: 'right' }}>
                    {bus.status === 'parked' ? 'parked' : `${bus.etaMin ?? '—'} min`}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                  {bus.studentsOnBoard ?? 0} on board · driver {bus.driver}
                </Typography>
              </ListItemButton>
            ))}
          </List>
        </PanelCard>
      </Box>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? 'Bus'}
        subtitle={selected?.route}
        status={selected ? <StatusBadge value={selected.status} /> : undefined}
        width="md"
      >
        {selected ? (
          <DrawerSection title="Details">
            <FieldList
              items={[
                { label: 'Driver', value: selected.driver },
                { label: 'Status', value: <StatusBadge value={selected.status} /> },
                { label: 'Students on board', value: selected.studentsOnBoard ?? 0 },
                { label: 'Progress', value: `${selected.progress ?? 0}%` },
                { label: 'ETA', value: selected.status === 'parked' ? 'Parked' : `${selected.etaMin ?? '—'} min` },
                { label: 'Route', value: selected.route },
              ]}
            />
          </DrawerSection>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, FilterBar, PageLoading, SearchInput } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { LiveCampusData } from '@/types';

export default function LiveCampusPage() {
  const { scope, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<LiveCampusData>(
    () => consoleApi.liveCampus(scope),
    [scope.organizationId, refreshKey]
  );

  const [search, setSearch] = useState('');
  const [zone, setZone] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentNote, setIncidentNote] = useState('');
  const [busy, setBusy] = useState(false);

  const cameras = useMemo(() => {
    let rows = data?.cameras ?? [];
    if (zone) rows = rows.filter((c: any) => c.zone === zone);
    if (search.trim()) {
      const n = search.trim().toLowerCase();
      rows = rows.filter((c: any) => `${c.name} ${c.zone} ${c.branch}`.toLowerCase().includes(n));
    }
    return rows;
  }, [data, zone, search]);

  const reportIncident = async () => {
    if (!incidentNote.trim()) return;
    setBusy(true);
    try {
      const api = consoleApi as typeof consoleApi & {
        reportIncident?: (body: Record<string, unknown>) => Promise<unknown>;
      };
      if (api.reportIncident) {
        await api.reportIncident({ note: incidentNote, cameraId: selected?.id, organizationId: scope.organizationId });
      }
      toast.success('Incident logged');
      setIncidentOpen(false);
      setIncidentNote('');
      void reload();
    } catch {
      toast.error('Could not log incident');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <PageLoading label="Loading campus cameras…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No camera data" />;

  const online = cameras.filter((c: any) => c.status === 'online' || c.status === 'active').length;
  const offline = cameras.length - online;
  const zones = [...new Set((data.cameras ?? []).map((c: any) => c.zone).filter(Boolean))];

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Live Campus"
        description="CCTV cameras, zones and security (authorized access — every view is audited)."
        actions={
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setIncidentOpen(true)} sx={{ fontWeight: 700, borderColor: brand.border }}>
            Log incident
          </Button>
        }
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Cameras" value={cameras.length} icon={<VideocamOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Online" value={online} icon={<VideocamOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Offline" value={offline} icon={<VideocamOffOutlinedIcon sx={{ fontSize: 20 }} />} valueSx={offline ? { color: brand.danger } : undefined} />
          <KpiCard label="Open incidents" value={(data.incidents ?? []).length} icon={<GppMaybeOutlinedIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <FilterBar sx={{ alignItems: 'flex-end' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search cameras…"
          variant="standard"
          sx={{ minWidth: { xs: 0, sm: 220 }, flex: 1 }}
        />
        <Divider
          orientation="vertical"
          sx={{ alignSelf: 'flex-end', height: 24, mb: 0.5, borderColor: brand.border }}
        />
        <TextField
          select
          variant="standard"
          size="small"
          label="Zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          sx={{ minWidth: { xs: 96, sm: 140 } }}
        >
          <MenuItem value="">All zones</MenuItem>
          {zones.map((z) => (
            <MenuItem key={z} value={z}>{z}</MenuItem>
          ))}
        </TextField>
      </FilterBar>

      {!cameras.length ? (
        <EmptyState title="No cameras match" />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
          }}
        >
          {cameras.map((cam: any) => {
            const live = cam.status === 'online' || cam.status === 'active';
            return (
              <PanelCard key={cam.id} sx={{ cursor: 'pointer' }}>
                <Box onClick={() => setSelected(cam)}>
                  <Box
                    sx={{
                      height: 140,
                      borderRadius: 2,
                      bgcolor: '#0b1b3a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                      position: 'relative',
                    }}
                  >
                    {live ? (
                      <VideocamOutlinedIcon sx={{ fontSize: 36, color: brand.primary }} />
                    ) : (
                      <VideocamOffOutlinedIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.3)' }} />
                    )}
                    <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                      <StatusBadge value={cam.status} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{cam.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {cam.zone} · {cam.branch ?? cam.schoolName}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                    <LockOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Audited access</Typography>
                  </Stack>
                </Box>
              </PanelCard>
            );
          })}
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <PanelCard title="Incidents" subtitle={`${(data.incidents ?? []).length} open`}>
          {!(data.incidents ?? []).length ? (
            <EmptyState title="No open incidents" hint="Record an incident to start a tracked investigation." icon={<GppMaybeOutlinedIcon />} />
          ) : (
            <Stack spacing={1}>
              {(data.incidents ?? []).map((inc: any) => (
                <Stack key={inc.id} direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${brand.border}` }}>
                  <GppMaybeOutlinedIcon sx={{ fontSize: 18, color: brand.warning, mt: 0.25 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{inc.title ?? inc.note}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{inc.cameraName ?? inc.zone} · {inc.createdAt}</Typography>
                  </Box>
                  <StatusBadge value={inc.status ?? 'open'} />
                </Stack>
              ))}
            </Stack>
          )}
        </PanelCard>
      </Box>

      <DetailDrawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name ?? 'Camera'} width="md">
        {selected ? (
          <DrawerSection title="Camera">
            <FieldList
              items={[
                { label: 'Zone', value: selected.zone },
                { label: 'Branch', value: selected.branch ?? selected.schoolName },
                { label: 'Status', value: <StatusBadge value={selected.status} /> },
                { label: 'Stream', value: selected.streamUrl ? 'Available' : 'Not available in console' },
              ]}
            />
            <Button fullWidth variant="contained" color="secondary" sx={{ mt: 2 }} onClick={() => toast.info('Stream opens in the secure viewer')}>
              Open stream
            </Button>
          </DrawerSection>
        ) : null}
      </DetailDrawer>

      <DetailDrawer open={incidentOpen} onClose={() => setIncidentOpen(false)} title="Log incident" width="sm">
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="What happened?" fullWidth multiline minRows={3} value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)} />
          <Button variant="contained" color="primary" disabled={busy || !incidentNote.trim()} onClick={() => void reportIncident()}>
            Submit incident
          </Button>
        </Stack>
      </DetailDrawer>
    </Box>
  );
}

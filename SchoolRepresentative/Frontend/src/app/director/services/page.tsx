'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LinearProgress from '@mui/material/LinearProgress';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatFrw, formatNumber } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { ServicesData } from '@/types';

export default function ServicesPage() {
  const { scope, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<ServicesData>(
    () => consoleApi.services(),
    [scope.organizationId, refreshKey]
  );
  const [tab, setTab] = useState(0);

  if (loading && !data) return <PageLoading label="Loading service subscriptions…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No services data" />;

  const s: Record<string, any> = data.summary ?? {};

  const sections = [
    { key: 'kit', label: 'ShuleKit', icon: <Inventory2OutlinedIcon />, rows: (data.kit ?? []) as any[] },
    { key: 'mart', label: 'ShuleMart', icon: <ShoppingBagOutlinedIcon />, rows: (data.mart ?? []) as any[] },
    { key: 'uniform', label: 'Uniforms', icon: <CheckroomOutlinedIcon />, rows: ((data.uniforms as unknown) as any[] | undefined) ?? [] },
    { key: 'dining', label: 'Dining', icon: <RestaurantOutlinedIcon />, rows: ((data.dining as unknown) as any[] | undefined) ?? [] },
    { key: 'trips', label: 'ShuleTrip', icon: <DirectionsBusOutlinedIcon />, rows: (data.trips ?? []) as any[] },
  ];

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="School Services"
        description="ShuleKit, ShuleMart, Uniforms, Dining and ShuleTrip — enrolment and fulfilment at a glance."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={5} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="ShuleKit enrolled" value={formatNumber(s.kitEnrolled ?? s.shuleKit ?? 0)} icon={<Inventory2OutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="ShuleMart credit" value={formatFrw(s.martCredit ?? 0, { compact: true })} icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Uniform orders" value={formatNumber(s.uniformOrders ?? 0)} icon={<CheckroomOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Meals today" value={formatNumber(s.mealsToday ?? 0)} icon={<RestaurantOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Trips pending" value={formatNumber(s.tripsPending ?? 0)} icon={<DirectionsBusOutlinedIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <PanelCard title="Service modules" bodySx={{ px: 0, pt: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 1, borderBottom: `1px solid ${brand.border}` }}>
          {sections.map((sec) => (
            <Tab key={sec.key} label={sec.label} icon={sec.icon} iconPosition="start" sx={{ minHeight: 48, textTransform: 'none', fontWeight: 700 }} />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          {!sections[tab].rows.length ? (
            <EmptyState title={`No ${sections[tab].label} records`} />
          ) : (
            <Stack spacing={1.25}>
              {sections[tab].rows.map((row: any, i: number) => (
                <Stack
                  key={row.id ?? row.name ?? i}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ p: 1.5, borderRadius: 1.25, border: `1px solid ${brand.border}` }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{row.name ?? row.title ?? row.label}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {row.branch ?? row.schoolName ?? row.detail ?? ''}
                    </Typography>
                    {row.progress != null ? (
                      <LinearProgress
                        variant="determinate"
                        value={row.progress}
                        sx={{ mt: 1, height: 6, borderRadius: 999, bgcolor: 'rgba(0,4,53,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: brand.primary } }}
                      />
                    ) : null}
                  </Box>
                  {row.status ? <StatusBadge value={row.status} /> : null}
                  {row.amount != null ? (
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatFrw(row.amount, { compact: true })}</Typography>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </PanelCard>
    </Box>
  );
}

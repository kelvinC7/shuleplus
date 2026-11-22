'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { ParentsData } from '@/types';

export default function ParentsPage() {
  const { refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<ParentsData>(() => consoleApi.parents(), [refreshKey]);

  const [filter, setFilter] = useState('all');

  const enquiries = useMemo(() => {
    const rows = data?.enquiries ?? [];
    if (filter === 'all') return rows;
    return rows.filter((e) => e.status.toLowerCase() === filter);
  }, [data, filter]);

  if (loading && !data) return <PageLoading label="Loading parent accounts…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No parent data" />;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Parent MIS"
        description="Parent MIS accounts, verification and engagement — plus enquiries escalated to the Director."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard
            label="Parent accounts"
            value={formatNumber(data.summary.total)}
            hint={`${formatNumber(data.summary.linkedStudents)} linked students`}
            icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Verified"
            value={formatPct(data.summary.verifiedPct)}
            hint={`${formatNumber(data.summary.verified)} accounts`}
            icon={<HowToRegOutlinedIcon sx={{ fontSize: 20 }} />}
            valueSx={{ color: data.summary.verifiedPct >= 80 ? brand.success : brand.warning }}
          />
          <KpiCard
            label="App installed"
            value={formatPct(data.summary.appPct ?? data.summary.verifiedPct)}
            icon={<PhoneIphoneOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Active this week"
            value={formatNumber(data.summary.activeThisWeek)}
            icon={<ChatOutlinedIcon sx={{ fontSize: 20 }} />}
          />
        </StatsGrid>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' },
        }}
      >
        <PanelCard title="Account snapshot" subtitle="Verification mix">
          <Stack spacing={1}>
            {[
              { label: 'Total accounts', value: formatNumber(data.summary.total) },
              { label: 'Verified', value: formatNumber(data.summary.verified) },
              { label: 'Active this week', value: formatNumber(data.summary.activeThisWeek) },
            ].map((row) => (
              <Stack
                key={row.label}
                direction="row"
                justifyContent="space-between"
                sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(248,249,252,0.9)' }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>{row.label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{row.value}</Typography>
              </Stack>
            ))}
          </Stack>
        </PanelCard>

        <PanelCard title="Parent enquiries" subtitle="Escalated conversations" bodySx={{ px: 0, pt: 0 }}>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${brand.border}` }}>
            {['all', 'open', 'in progress', 'resolved'].map((tab) => (
              <Button
                key={tab}
                size="small"
                variant={filter === tab ? 'contained' : 'outlined'}
                color={filter === tab ? 'secondary' : 'inherit'}
                onClick={() => setFilter(tab)}
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  borderColor: brand.border,
                  ...(filter !== tab && { color: 'text.secondary' }),
                }}
              >
                {tab === 'all' ? 'All' : tab.replace(/\b\w/g, (c) => c.toUpperCase())}
              </Button>
            ))}
          </Stack>
          {!enquiries.length ? (
            <EmptyState title="No enquiries" hint="Parent enquiries appear here when escalated." />
          ) : (
            <List disablePadding>
              {enquiries.map((enquiry) => (
                <ListItem
                  key={enquiry.id}
                  divider
                  secondaryAction={<StatusBadge value={enquiry.status} />}
                  sx={{ px: 2, py: 1.5, alignItems: 'flex-start' }}
                >
                  <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: 'rgba(0,4,53,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: brand.muted,
                      }}
                    >
                      <ChatOutlinedIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{enquiry.topic}</Typography>
                    }
                    secondary={
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {enquiry.parent} · {enquiry.received}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </PanelCard>
      </Box>
    </Box>
  );
}

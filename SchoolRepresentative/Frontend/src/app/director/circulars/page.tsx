'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import SendIcon from '@mui/icons-material/Send';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading, SearchInput } from '@/components/list-ui';
import { SegmentedTabs } from '@/components/form-kit';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatDate, formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { BroadcastRow, BroadcastsData, CircularItem, CircularsData } from '@/types';
import { ComposeSheet, type ComposeMode } from './compose-sheet';

type TabKey = 'broadcasts' | 'circulars';

const EMPTY_BROADCASTS: BroadcastsData = {
  history: [],
  templates: [],
  audiences: [],
  stats: { sentThisWeek: 0, recipientsThisWeek: 0, avgReadRate: 0 },
};

function Row({ onClick, icon, title, meta, trailing }: { onClick: () => void; icon: React.ReactNode; title: string; meta: string; trailing: React.ReactNode }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        py: 1.5,
        borderTop: `1px solid ${brand.border}`,
        cursor: 'pointer',
        '&:hover': { bgcolor: '#F6F7FB' },
      }}
    >
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#F2F4F8', color: brand.navy, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: brand.navy }}>{title}</Typography>
        <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>{meta}</Typography>
      </Box>
      {trailing}
    </Box>
  );
}

export default function CircularsPage() {
  const router = useRouter();
  const { scope, refreshKey, refresh } = useConsole();

  const broadcastsFetch = useConsoleFetch<BroadcastsData>(() => consoleApi.broadcasts(), [refreshKey]);
  const circularsFetch = useConsoleFetch<CircularsData>(
    () => consoleApi.circulars({ organizationId: scope.organizationId }),
    [scope.organizationId, refreshKey]
  );

  const [tab, setTab] = useState<TabKey>('broadcasts');
  const [composing, setComposing] = useState<ComposeMode | null>(null);
  const [search, setSearch] = useState('');
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastRow | null>(null);
  const [selectedCircular, setSelectedCircular] = useState<CircularItem | null>(null);

  useEffect(() => {
    const create = new URLSearchParams(window.location.search).get('create');
    if (create === 'broadcast' || create === 'circular') {
      setComposing(create);
      setTab(create === 'circular' ? 'circulars' : 'broadcasts');
      router.replace('/director/circulars', { scroll: false });
    }
  }, [router]);

  const broadcasts = broadcastsFetch.data ?? EMPTY_BROADCASTS;
  const circulars = circularsFetch.data;

  const broadcastRows = useMemo(() => {
    const n = search.trim().toLowerCase();
    return broadcasts.history.filter((b) => !n || `${b.subject} ${b.message} ${b.audience}`.toLowerCase().includes(n));
  }, [broadcasts.history, search]);

  const circularRows = useMemo(() => {
    const n = search.trim().toLowerCase();
    return (circulars?.items ?? []).filter((c) => !n || `${c.title} ${c.audience} ${c.submittedBy}`.toLowerCase().includes(n));
  }, [circulars, search]);

  const onSent = (mode: ComposeMode) => {
    setComposing(null);
    setTab(mode === 'circular' ? 'circulars' : 'broadcasts');
    refresh();
    if (mode === 'circular') void circularsFetch.reload();
    else void broadcastsFetch.reload();
  };

  const activeFetch = tab === 'broadcasts' ? broadcastsFetch : circularsFetch;
  if (activeFetch.loading && !activeFetch.data) return <PageLoading label="Loading communications…" />;
  if (activeFetch.error && !activeFetch.data) return <ErrorState message={activeFetch.error} onRetry={activeFetch.reload} />;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Circulars & Broadcasts"
        description="Announcements, broadcasts and delivery results."
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={tab === 'broadcasts' ? <SendIcon /> : <AddIcon />}
            onClick={() => setComposing(tab === 'broadcasts' ? 'broadcast' : 'circular')}
            sx={{ fontWeight: 700 }}
          >
            {tab === 'broadcasts' ? 'New broadcast' : 'New circular'}
          </Button>
        }
      />

      <Box sx={{ maxWidth: 340, mb: 2.5 }}>
        <SegmentedTabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            setSearch('');
          }}
          options={[
            { value: 'broadcasts', label: 'Broadcasts' },
            { value: 'circulars', label: 'Circulars' },
          ]}
        />
      </Box>

      {tab === 'broadcasts' ? (
        <>
          <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
            <StatsGrid columns={3} sx={{ gap: { xs: 0, sm: 2 } }}>
              <KpiCard label="Sent this week" value={formatNumber(broadcasts.stats.sentThisWeek)} icon={<CampaignOutlinedIcon sx={{ fontSize: 20 }} />} />
              <KpiCard label="Recipients" value={formatNumber(broadcasts.stats.recipientsThisWeek)} icon={<GroupsOutlinedIcon sx={{ fontSize: 20 }} />} />
              <KpiCard label="Avg read rate" value={formatPct(broadcasts.stats.avgReadRate, 0)} icon={<DraftsOutlinedIcon sx={{ fontSize: 20 }} />} />
            </StatsGrid>
          </Box>
          <PanelCard title="Broadcast history" subtitle={`${broadcastRows.length} of ${broadcasts.history.length}`} bodySx={{ px: 0, pt: 0 }}>
            <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Search broadcasts…" variant="standard" sx={{ width: '100%' }} />
            </Box>
            {!broadcastRows.length ? (
              <EmptyState title="No broadcasts yet" hint="Send a message to parents or staff in a few taps." />
            ) : (
              broadcastRows.map((b) => (
                <Row
                  key={b.id}
                  onClick={() => setSelectedBroadcast(b)}
                  icon={<CampaignOutlinedIcon sx={{ fontSize: 20 }} />}
                  title={b.subject}
                  meta={`${b.audience} · ${formatNumber(b.recipientCount)} recipients · ${b.channels.join(', ')} · ${formatDate(b.scheduledFor ?? b.createdAt)}`}
                  trailing={<StatusBadge value={b.status} />}
                />
              ))
            )}
          </PanelCard>
        </>
      ) : (
        <>
          <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
            <StatsGrid columns={3} sx={{ gap: { xs: 0, sm: 2 } }}>
              <KpiCard label="Awaiting you" value={circulars?.summary.awaitingDirector ?? 0} icon={<HourglassEmptyIcon sx={{ fontSize: 20 }} />} valueSx={circulars?.summary.awaitingDirector ? { color: '#b5771a' } : undefined} />
              <KpiCard label="Published" value={circulars?.summary.published ?? 0} icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />} />
              <KpiCard label="Total" value={circulars?.items.length ?? 0} icon={<DescriptionOutlinedIcon sx={{ fontSize: 20 }} />} />
            </StatsGrid>
          </Box>
          <PanelCard title="Circulars" subtitle={`${circularRows.length} of ${circulars?.items.length ?? 0}`} bodySx={{ px: 0, pt: 0 }}>
            <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Search circulars…" variant="standard" sx={{ width: '100%' }} />
            </Box>
            {!circularRows.length ? (
              <EmptyState title="No circulars yet" hint="Write the first circular for parents, staff or students." />
            ) : (
              circularRows.map((c) => (
                <Row
                  key={c.id}
                  onClick={() => setSelectedCircular(c)}
                  icon={<DescriptionOutlinedIcon sx={{ fontSize: 20 }} />}
                  title={c.title}
                  meta={`${c.audience || 'All'} · ${c.submittedBy || 'Director'} · ${formatDate(c.publishedAt ?? c.submittedAt)}`}
                  trailing={<StatusBadge value={c.status} />}
                />
              ))
            )}
          </PanelCard>
        </>
      )}

      <DetailDrawer
        open={Boolean(selectedBroadcast)}
        onClose={() => setSelectedBroadcast(null)}
        title={selectedBroadcast?.subject ?? 'Broadcast'}
        status={selectedBroadcast ? <StatusBadge value={selectedBroadcast.status} /> : undefined}
        width="md"
      >
        {selectedBroadcast ? (
          <>
            <DrawerSection title="Message">
              <Typography sx={{ fontSize: 13.5, lineHeight: 1.7, color: brand.navy, whiteSpace: 'pre-wrap' }}>{selectedBroadcast.message}</Typography>
            </DrawerSection>
            <DrawerSection title="Delivery">
              <FieldList
                items={[
                  { label: 'Audience', value: selectedBroadcast.audience },
                  { label: 'Recipients', value: formatNumber(selectedBroadcast.recipientCount) },
                  { label: 'Channels', value: selectedBroadcast.channels.join(', ') || '—' },
                  { label: selectedBroadcast.scheduledFor ? 'Scheduled for' : 'Sent', value: formatDate(selectedBroadcast.scheduledFor ?? selectedBroadcast.createdAt) },
                  { label: 'Sent by', value: selectedBroadcast.sentByName || '—' },
                ]}
              />
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(selectedCircular)}
        onClose={() => setSelectedCircular(null)}
        title={selectedCircular?.title ?? 'Circular'}
        status={selectedCircular ? <StatusBadge value={selectedCircular.status} /> : undefined}
        width="md"
      >
        {selectedCircular ? (
          <>
            {selectedCircular.body ? (
              <DrawerSection title="Circular">
                <Typography sx={{ fontSize: 13.5, lineHeight: 1.7, color: brand.navy, whiteSpace: 'pre-wrap' }}>{selectedCircular.body}</Typography>
              </DrawerSection>
            ) : null}
            <DrawerSection title="Details">
              <FieldList
                items={[
                  { label: 'Audience', value: selectedCircular.audience || 'All' },
                  { label: 'Submitted by', value: selectedCircular.submittedBy || '—' },
                  { label: 'Submitted', value: formatDate(selectedCircular.submittedAt) },
                  ...(selectedCircular.publishedAt ? [{ label: 'Published', value: formatDate(selectedCircular.publishedAt) }] : []),
                ]}
              />
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <ComposeSheet
        open={composing !== null}
        mode={composing ?? 'broadcast'}
        onMode={setComposing}
        onClose={() => setComposing(null)}
        organizationId={scope.organizationId}
        audiences={broadcasts.audiences}
        templates={broadcasts.templates}
        onSent={onSent}
      />
    </Box>
  );
}

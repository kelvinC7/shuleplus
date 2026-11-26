'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
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
import { formatDate, formatFrw } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { RequestsData } from '@/types';

type RequestRow = RequestsData['items'][number];

export default function RequestsPage() {
  const { scope, refreshKey, refresh } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<RequestsData>(
    () => consoleApi.requests({ ...scope }),
    [scope.organizationId, refreshKey]
  );

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => {
    let rows = data?.items ?? [];
    if (status) rows = rows.filter((r) => r.status === status);
    if (search.trim()) {
      const n = search.trim().toLowerCase();
      rows = rows.filter((r) => `${r.id} ${r.title} ${r.type} ${r.requester}`.toLowerCase().includes(n));
    }
    return rows;
  }, [data, status, search]);

  const decide = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    setBusy(true);
    try {
      await consoleApi.decideRequest(selected.id, { action });
      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected');
      setSelected(null);
      refresh();
      void reload();
    } catch {
      toast.error('Decision failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <PageLoading label="Loading requests…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No requests" />;

  const pending = data.items.filter((r) => r.status === 'pending').length;
  const transport = data.items.filter((r) => r.type?.toLowerCase().includes('transport')).length;
  const procurement = data.items.filter((r) => r.type?.toLowerCase().includes('procurement')).length;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Requests"
        description="Transport and procurement requests — review, approve or reject with a recorded decision."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Total requests" value={data.items.length} icon={<AssignmentOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Pending action" value={pending} icon={<AccessTimeIcon sx={{ fontSize: 20 }} />} valueSx={pending ? { color: '#b5771a' } : undefined} />
          <KpiCard label="Transport" value={transport} icon={<DirectionsBusOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Procurement" value={procurement} icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <PanelCard title="Request queue" subtitle={`${items.length} matching`} bodySx={{ px: 0, pt: 0 }}>
        <Box sx={{ px: 2.5, pt: 1 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search requests…"
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
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: { xs: 96, sm: 140 } }}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
          </FilterBar>
        </Box>

        {!items.length ? (
          <EmptyState title="No requests match" />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Request</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Requester</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(row)}>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{row.title}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{row.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{row.type}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{row.requester}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{row.amount != null ? formatFrw(row.amount) : '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={row.status} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{formatDate(row.date)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PanelCard>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Request'}
        subtitle={selected?.id}
        status={selected ? <StatusBadge value={selected.status} /> : undefined}
        width="md"
        footer={
          selected?.status === 'pending' ? (
            <Stack direction="row" spacing={1}>
              <Button fullWidth variant="contained" color="secondary" disabled={busy} onClick={() => void decide('approve')}>
                Approve
              </Button>
              <Button fullWidth variant="outlined" color="error" disabled={busy} onClick={() => void decide('reject')}>
                Reject
              </Button>
            </Stack>
          ) : undefined
        }
      >
        {selected ? (
          <DrawerSection title="Details">
            <FieldList
              items={[
                { label: 'Type', value: selected.type },
                { label: 'Requester', value: selected.requester },
                { label: 'Amount', value: selected.amount != null ? formatFrw(selected.amount) : '—' },
                { label: 'Status', value: <StatusBadge value={selected.status} /> },
                { label: 'Submitted', value: formatDate(selected.date) },
                { label: 'Notes', value: selected.description ?? '—' },
              ]}
            />
          </DrawerSection>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}

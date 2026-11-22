'use client';

import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageLoading,
  SearchInput,
  TablePagination,
  useServerPagination,
} from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatFrw, formatDate, formatDateTime, relativeTime } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { ApprovalList, ApprovalItem } from '@/types';

export default function ApprovalsPage() {
  const { scope, refreshKey, refresh } = useConsole();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const { page, pageSize, setPage, setPageSize } = useServerPagination(`${search}|${status}|${priority}`);
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useConsoleFetch<ApprovalList>(
    () =>
      consoleApi.approvals({
        ...scope,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        page,
        pageSize,
      }),
    [scope.organizationId, scope.academicYear, scope.term, search, status, priority, page, pageSize, refreshKey]
  );

  useEffect(() => setPage(1), [search, status, priority, scope.organizationId]);

  const items = data?.items ?? [];
  const pendingCount = data?.summary?.pending ?? items.filter((i) => i.status === 'pending').length;
  const urgentCount = data?.summary?.urgent ?? items.filter((i) => i.priority === 'urgent' || i.priority === 'high').length;

  const decide = async () => {
    if (!selected || !decision) return;
    setBusy(true);
    try {
      await consoleApi.decide(selected.id, { action: decision, comment: comment || undefined });
      toast.success('Decision recorded');
      setSelected(null);
      setDecision(null);
      setComment('');
      refresh();
      void reload();
    } catch (e) {
      toast.error('Could not record decision');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <PageLoading label="Loading approvals…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No approvals" />;

  const total = data.pagination?.total ?? items.length;
  const totalPages = data.pagination?.totalPages ?? 1;
  const rangeStart = total ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Approvals"
        description="Requests that require the Director’s decision."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Pending" value={pendingCount} icon={<AccessTimeIcon sx={{ fontSize: 20 }} />} valueSx={pendingCount ? { color: '#b5771a' } : undefined} />
          <KpiCard label="Urgent" value={urgentCount} icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />} valueSx={urgentCount ? { color: brand.danger } : undefined} />
          <KpiCard label="In queue" value={total} icon={<AssignmentOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Decided today" value={data.summary?.decidedToday ?? 0} icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <PanelCard
        title="Approval queue"
        action={
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
            {total} items
          </Typography>
        }
        bodySx={{ px: 0, pt: 0 }}
      >
        <Box sx={{ px: 2.5, pt: 0.5 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search title, requester…"
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
              sx={{ minWidth: { xs: 80, sm: 130 } }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
            <TextField
              select
              variant="standard"
              size="small"
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              sx={{ minWidth: { xs: 80, sm: 130 } }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
            </TextField>
          </FilterBar>
        </Box>

        {!items.length ? (
          <EmptyState title="Nothing in the queue" />
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Request</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Requester</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(item)}>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{item.title}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{item.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{item.type ?? item.category}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={item.priority} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{item.requester ?? item.requestedBy}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{item.amount != null ? formatFrw(item.amount) : '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={item.status} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{relativeTime(item.createdAt)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s as typeof pageSize);
                setPage(1);
              }}
            />
          </>
        )}
      </PanelCard>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setDecision(null);
          setComment('');
        }}
        title={selected?.title ?? 'Approval'}
        subtitle={selected ? `${selected.id} · ${formatDateTime(selected.createdAt)}` : ''}
        status={selected ? <StatusBadge value={selected.status} /> : undefined}
        width="md"
        footer={
          selected?.status === 'pending' ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1}>
                {(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const).map((d) => (
                  <Button
                    key={d}
                    size="small"
                    variant={decision === d ? 'contained' : 'outlined'}
                    color={d === 'APPROVED' ? 'secondary' : d === 'REJECTED' ? 'error' : 'inherit'}
                    onClick={() => setDecision(d)}
                    sx={{ flex: 1, fontSize: 11, fontWeight: 700 }}
                  >
                    {d === 'APPROVED' ? 'Approve' : d === 'REJECTED' ? 'Reject' : 'Request changes'}
                  </Button>
                ))}
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={2}
                placeholder="Decision comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button fullWidth variant="contained" color="primary" disabled={!decision || busy} onClick={() => void decide()} sx={{ fontWeight: 700 }}>
                {busy ? 'Saving…' : 'Record decision'}
              </Button>
            </Stack>
          ) : undefined
        }
      >
        {selected ? (
          <DrawerSection title="Details">
            <FieldList
              items={[
                { label: 'Type', value: selected.type ?? selected.category },
                { label: 'Priority', value: <StatusBadge value={selected.priority} /> },
                { label: 'Requester', value: selected.requester ?? selected.requestedBy },
                { label: 'Branch', value: selected.branch ?? selected.organizationName },
                { label: 'Amount', value: selected.amount != null ? formatFrw(selected.amount) : '—' },
                { label: 'Submitted', value: formatDateTime(selected.createdAt) },
                { label: 'Summary', value: selected.summary ?? selected.description ?? '—' },
              ]}
            />
          </DrawerSection>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}

'use client';

import { useState } from 'react';
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
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
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
import { formatDateTime, relativeTime } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { AuditData, AuditEvent } from '@/types';

export default function AuditPage() {
  const { refreshKey } = useConsole();
  const [module, setModule] = useState('');
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const { page, pageSize, setPage, setPageSize } = useServerPagination(`${module}|${actor}|${action}`);

  const { data, loading, error, reload } = useConsoleFetch<AuditData>(
    () =>
      consoleApi.audit({
        module: module || undefined,
        actor: actor || undefined,
        action: action || undefined,
        page,
        pageSize,
      }),
    [module, actor, action, page, pageSize, refreshKey]
  );

  if (loading && !data) return <PageLoading label="Loading the audit trail…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No audit events" />;

  const { pagination, modules } = data;
  const rangeStart = pagination.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, pagination.total);

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Audit Trail"
        description="Who decided what, when. Every approval, broadcast, task and incident change is recorded immutably."
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<HistoryEduOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => toast.success('Audit extract queued — the full log will be emailed to you')}
            sx={{
              borderColor: brand.border,
              color: brand.navy,
              fontWeight: 700,
              fontSize: 12,
              bgcolor: 'background.paper',
            }}
          >
            Export log
          </Button>
        }
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={3} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Events in scope" value={pagination.total} icon={<HistoryEduOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Modules" value={modules.length} icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />} />
          <KpiCard
            label="Retention"
            value="Immutable"
            icon={<VerifiedUserOutlinedIcon sx={{ fontSize: 20 }} />}
            valueSx={{ color: brand.success }}
          />
        </StatsGrid>
      </Box>

      <PanelCard title="Audit events" subtitle={`${pagination.total} recorded events`} bodySx={{ px: 0, pt: 0 }}>
        <Box sx={{ px: 2.5, pt: 1 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={actor}
              onChange={setActor}
              placeholder="Filter by actor or summary…"
              variant="standard"
              sx={{ minWidth: { xs: 0, sm: 220 }, flex: 1 }}
            />
            <Divider
              orientation="vertical"
              sx={{ alignSelf: 'flex-end', height: 24, mb: 0.5, borderColor: brand.border }}
            />
            <TextField
              variant="standard"
              size="small"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Action contains… (e.g. APPROVAL)"
              sx={{ minWidth: { xs: 0, sm: 200 }, flex: 1 }}
            />
            <TextField
              select
              variant="standard"
              size="small"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              label="Module"
              sx={{ minWidth: { xs: 0, sm: 160 } }}
            >
              <MenuItem value="">All modules</MenuItem>
              {modules.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            {module || actor || action ? (
              <Button
                size="small"
                onClick={() => {
                  setModule('');
                  setActor('');
                  setAction('');
                }}
                sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}
              >
                Clear filters
              </Button>
            ) : null}
          </FilterBar>
        </Box>

        {!data.items.length ? (
          <EmptyState
            title="No audit events match"
            hint="Try a different module, actor or action."
            icon={<HistoryEduOutlinedIcon sx={{ fontSize: 24 }} />}
          />
        ) : (
          <>
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Module</TableCell>
                    <TableCell>Summary</TableCell>
                    <TableCell width={40} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((event) => (
                    <TableRow key={event.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(event)}>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: brand.navy }}>
                          {formatDateTime(event.createdAt)}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{relativeTime(event.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: brand.navy }}>{event.actorName}</Typography>
                        <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'text.secondary' }}>
                          {event.actorId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.action}
                          size="small"
                          sx={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, height: 22 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{event.module}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 320 }}>
                          {event.summary}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <VisibilityOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Mobile cards */}
            <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, px: 2, pb: 1 }}>
              {data.items.map((event) => (
                <Box
                  key={event.id}
                  onClick={() => setSelected(event)}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.25,
                    border: `1px solid ${brand.border}`,
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(248,249,252,0.9)' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{event.actorName}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{event.summary}</Typography>
                    </Box>
                    <Chip label={event.action} size="small" sx={{ fontFamily: 'monospace', fontSize: 10, height: 22 }} />
                  </Stack>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 1 }}>
                    {event.module} · {relativeTime(event.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <TablePagination
              page={page}
              pageSize={pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size as typeof pageSize);
                setPage(1);
              }}
            />
          </>
        )}
      </PanelCard>

      <Alert
        icon={<LockOutlinedIcon fontSize="small" />}
        severity="info"
        sx={{ mt: 2, borderRadius: 1.25, bgcolor: 'rgba(248,249,252,0.9)', color: 'text.secondary', '& .MuiAlert-icon': { color: brand.muted } }}
      >
        Audit events are append-only: they cannot be edited or deleted from the console. Each event captures the actor,
        module, target and a before/after summary where applicable.
      </Alert>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.action ?? 'Audit event'}
        subtitle={selected ? `${selected.module} · ${formatDateTime(selected.createdAt)}` : ''}
        width="md"
      >
        {selected ? (
          <>
            <DrawerSection title="Event">
              <FieldList
                items={[
                  {
                    label: 'Event ID',
                    value: (
                      <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {selected.id}
                      </Typography>
                    ),
                  },
                  { label: 'Actor', value: selected.actorName },
                  {
                    label: 'Actor ID',
                    value: (
                      <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {selected.actorId}
                      </Typography>
                    ),
                  },
                  {
                    label: 'Action',
                    value: (
                      <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {selected.action}
                      </Typography>
                    ),
                  },
                  { label: 'Module', value: selected.module },
                  { label: 'Target', value: `${selected.targetType} · ${selected.targetId}` },
                  { label: 'Branch', value: selected.organizationId ?? 'Group-wide' },
                  { label: 'Recorded', value: formatDateTime(selected.createdAt) },
                ]}
              />
            </DrawerSection>

            <DrawerSection title="Summary">
              <Box
                sx={{
                  borderRadius: 1.25,
                  border: `1px solid ${brand.border}`,
                  bgcolor: 'rgba(248,249,252,0.6)',
                  p: 2,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: 'text.secondary',
                }}
              >
                {selected.summary}
              </Box>
            </DrawerSection>

            <DrawerSection title="Metadata">
              <Box
                component="pre"
                sx={{
                  overflowX: 'auto',
                  borderRadius: 1.25,
                  border: '1px solid #0b1b3a',
                  bgcolor: '#0b1b3a',
                  p: 2,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: '#e2e8f0',
                  m: 0,
                }}
              >
                {JSON.stringify(selected.meta, null, 2)}
              </Box>
            </DrawerSection>

            <Alert
              icon={<VerifiedUserOutlinedIcon fontSize="small" />}
              severity="success"
              sx={{ borderRadius: 1.25, fontSize: 11, fontWeight: 600 }}
            >
              Verified immutable record
            </Alert>
          </>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}

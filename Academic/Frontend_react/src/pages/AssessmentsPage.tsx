import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewListIcon from '@mui/icons-material/ViewList';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { approveAssessment, listAssessments, rejectAssessment, smListClasses } from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { AcademicFilterDrawer, FilterSection, FilterSelect } from '@/components/academic-filter-drawer';
import { toast } from '@/lib/toast';
import type { ApiAssessment, ApiClass } from '@/types';
import { isTeacherScheduledAssessment } from '@/lib/assessment-records';

const NAVY = '#000435';
const AMBER = '#FCB038';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#fef3c7', color: '#b45309' },
  OPEN: { bg: '#dbeafe', color: '#2563eb' },
  MARK_ENTRY: { bg: '#e0e7ff', color: '#4f46e5' },
  SUBMITTED: { bg: '#ffedd5', color: '#c2410c' },
  REVIEWED: { bg: '#f3e8ff', color: '#7c3aed' },
  APPROVED: { bg: '#d1fae5', color: '#059669' },
  LOCKED: { bg: '#f1f5f9', color: '#475569' },
};

const LIFECYCLE = ['DRAFT', 'OPEN', 'MARK_ENTRY', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'];

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function classLabel(a: ApiAssessment) {
  const c = a.class;
  if (!c) return '';
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

function classOptionLabel(c: ApiClass) {
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

/** Put the org's current value first, then sort the rest alphabetically. */
function withCurrentFirst<T>(items: T[], current: string | undefined, id: (item: T) => string): T[] {
  const rest = items.filter((item) => id(item) !== current);
  rest.sort((a, b) => id(a).localeCompare(id(b)));
  const head = current ? items.filter((item) => id(item) === current) : [];
  return [...head, ...rest];
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const { settings } = useAcademicSettings();
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState(settings?.currentAcademicYear || '');
  const [filterTerm, setFilterTerm] = useState(settings?.currentTerm || '');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detailAssessment, setDetailAssessment] = useState<ApiAssessment | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings?.currentAcademicYear && !filterYear) setFilterYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !filterTerm) setFilterTerm(settings.currentTerm);
  }, [settings, filterYear, filterTerm]);

  useEffect(() => {
    smListClasses()
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAssessments({
        academicYear: filterYear || undefined,
        term: filterTerm || undefined,
        status: filterStatus || undefined,
        classId: filterClassId || undefined,
      });
      setAssessments((data ?? []).filter(isTeacherScheduledAssessment));
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterTerm, filterStatus, filterClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [filterYear, filterTerm, filterStatus, filterClassId]);

  const activeFilterCount = [
    filterStatus,
    filterClassId,
    filterYear !== settings?.currentAcademicYear ? filterYear : null,
    filterTerm !== settings?.currentTerm ? filterTerm : null,
  ].filter(Boolean).length;

  const yearOptions = useMemo(() => {
    const fromSettings = settings?.academicYears?.length ? settings.academicYears : [];
    const merged = filterYear && !fromSettings.includes(filterYear) ? [filterYear, ...fromSettings] : fromSettings;
    const list = merged.length ? merged : filterYear ? [filterYear] : [];
    const current = settings?.currentAcademicYear || undefined;
    return withCurrentFirst(list, current, (y) => y).map((y) => ({
      id: y,
      label: y,
    }));
  }, [settings, filterYear]);

  const termOptions = useMemo(() => {
    const fromSettings = settings?.terms?.length ? settings.terms : ['Term 1', 'Term 2', 'Term 3'];
    const current = settings?.currentTerm || undefined;
    return withCurrentFirst(fromSettings, current, (t) => t).map((t) => ({
      id: t,
      label: t,
    }));
  }, [settings]);

  const classFilterOptions = useMemo(() => {
    const sorted = [...classes].sort((a, b) => classOptionLabel(a).localeCompare(classOptionLabel(b)));
    return [{ id: '', label: 'All classes' }, ...sorted.map((c) => ({ id: c.id, label: classOptionLabel(c) }))];
  }, [classes]);

  const statusFilterOptions = useMemo(
    () => [
      { id: '', label: 'All statuses' },
      ...LIFECYCLE.map((s) => ({
        id: s,
        label: s === 'OPEN' ? 'Scheduled · Approved' : s.replace(/_/g, ' '),
      })),
    ],
    [],
  );

  const paginatedAssessments = useMemo(() => {
    const start = page * rowsPerPage;
    return assessments.slice(start, start + rowsPerPage);
  }, [assessments, page, rowsPerPage]);

  const viewingCurrentPeriod =
    (!filterYear || filterYear === settings?.currentAcademicYear) &&
    (!filterTerm || filterTerm === settings?.currentTerm);

  const byDay = useMemo(() => {
    const map = new Map<string, ApiAssessment[]>();
    for (const a of assessments) {
      if (!a.assessmentDate) continue;
      const key = dateKey(new Date(a.assessmentDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [assessments]);

  const calendarCells = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      cells.push({ date, key: dateKey(date) });
    }
    return cells;
  }, [calendarMonth]);

  const dayAssessments = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  async function runApprove() {
    if (!detailAssessment) return;
    setBusy(true);
    setConfirmAction(null);
    try {
      await approveAssessment(detailAssessment.id);
      toast.success('Assessment approved for mark entry');
      setDetailAssessment(null);
      fetchData();
    } catch {
      toast.error('Could not approve assessment');
    } finally {
      setBusy(false);
    }
  }

  async function runReject() {
    if (!detailAssessment) return;
    setBusy(true);
    setConfirmAction(null);
    try {
      await rejectAssessment(detailAssessment.id, rejectReason.trim() || undefined);
      toast.success('Assessment rejected. Teacher can reschedule.');
      setDetailAssessment(null);
      setRejectReason('');
      fetchData();
    } catch {
      toast.error('Could not reject assessment');
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = assessments.filter((a) => a.status === 'DRAFT' || a.status === 'OPEN').length;

  return (
    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: '#f8fafc' }}>
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }}>Assessments</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5, maxWidth: 560 }}>
              Teacher-scheduled assessments from TichaPortal only. Review timing and reject any that should not run.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterOpen(true)}
              sx={{ fontWeight: 700, borderColor: 'rgba(0,4,53,0.15)', color: NAVY }}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button
              variant={view === 'list' ? 'contained' : 'outlined'}
              startIcon={<ViewListIcon />}
              onClick={() => setView('list')}
              sx={{ fontWeight: 700, bgcolor: view === 'list' ? NAVY : undefined, color: view === 'list' ? '#fff' : NAVY }}
            >
              List
            </Button>
            <Button
              variant={view === 'calendar' ? 'contained' : 'outlined'}
              startIcon={<CalendarMonthIcon />}
              onClick={() => setView('calendar')}
              sx={{ fontWeight: 700, bgcolor: view === 'calendar' ? NAVY : undefined, color: view === 'calendar' ? '#fff' : NAVY }}
            >
              Calendar
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          <MiniStat label="Scheduled" value={assessments.length} />
          <MiniStat label="Pending approval" value={pendingCount} accent="#b45309" />
          <MiniStat
            label={viewingCurrentPeriod ? 'Current period' : 'Selected period'}
            value={filterTerm || ''}
            sub={filterYear}
            accent={viewingCurrentPeriod ? '#059669' : undefined}
          />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : view === 'list' ? (
        <Box sx={{ bgcolor: '#fff' }}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Code', 'Title', 'Class', 'Course', 'Date', 'Status', ''].map((h) => (
                    <TableCell key={h || 'actions'} sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAssessments.map((a) => {
                  const sc = STATUS_COLORS[a.status] ?? STATUS_COLORS.DRAFT;
                  return (
                    <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetailAssessment(a)}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{(a as ApiAssessment & { assessmentCode?: string }).assessmentCode ?? ''}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: NAVY }}>{a.title}</TableCell>
                      <TableCell>{classLabel(a)}</TableCell>
                      <TableCell>{a.subject?.name ?? ''}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {a.assessmentDate
                          ? new Date(a.assessmentDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                          : ''}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={a.status === 'OPEN' ? 'Scheduled · Approved' : a.status}
                          size="small"
                          sx={{ height: 22, fontWeight: 800, fontSize: '0.65rem', bgcolor: sc.bg, color: sc.color }}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button size="small" onClick={() => navigate(`/assessments/${a.id}`)} sx={{ fontWeight: 700 }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {assessments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
                      No assessments for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {assessments.length > 0 ? (
            <TablePagination
              component="div"
              count={assessments.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              labelRowsPerPage="Rows"
              sx={{
                borderTop: '1px solid rgba(0,4,53,0.06)',
                '.MuiTablePagination-toolbar': { flexWrap: 'wrap', gap: 1, px: { xs: 1, sm: 2 } },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' },
              }}
            />
          ) : null}
        </Box>
      ) : (
        <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>
              {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Typography>
            <IconButton onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <Typography key={d} sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', py: 0.5 }}>
                {d}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
            {calendarCells.map((cell) => {
              if (!cell.date) return <Box key={cell.key} sx={{ minHeight: { xs: 52, sm: 72 } }} />;
              const key = cell.key;
              const count = byDay.get(key)?.length ?? 0;
              const selected = selectedDay === key;
              return (
                <Box
                  key={cell.key}
                  onClick={() => setSelectedDay(key)}
                  sx={{
                    minHeight: { xs: 52, sm: 72 },
                    p: 0.75,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: selected ? AMBER : 'rgba(0,4,53,0.08)',
                    bgcolor: selected ? 'rgba(252,176,56,0.12)' : count ? '#f8fafc' : '#fff',
                    cursor: 'pointer',
                    '&:hover': { borderColor: AMBER },
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY }}>{cell.date.getDate()}</Typography>
                  {count > 0 ? (
                    <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#059669', mt: 0.5 }}>
                      {count} exam{count > 1 ? 's' : ''}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Box>
          {selectedDay ? (
            <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)', bgcolor: '#f8fafc' }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1.5 }}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </Typography>
              {dayAssessments.length === 0 ? (
                <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8' }}>No assessments this day</Typography>
              ) : (
                dayAssessments.map((a) => (
                  <Box
                    key={a.id}
                    onClick={() => setDetailAssessment(a)}
                    sx={{
                      p: 1.25,
                      mb: 1,
                      borderRadius: 1.5,
                      bgcolor: '#fff',
                      border: '1px solid rgba(0,4,53,0.06)',
                      cursor: 'pointer',
                      '&:hover': { borderColor: AMBER },
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.875rem' }}>{a.title}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {classLabel(a)} · {a.subject?.name} · {a.status}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          ) : null}
        </Box>
      )}

      <AcademicFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter assessments"
        activeFilterCount={activeFilterCount}
        onClear={() => {
          setFilterStatus(null);
          setFilterClassId(null);
          setFilterYear(settings?.currentAcademicYear || '');
          setFilterTerm(settings?.currentTerm || '');
        }}
      >
        {settings?.currentAcademicYear && settings?.currentTerm ? (
          <Box
            sx={{
              mb: 2.5,
              p: 1.5,
              borderRadius: 2,
              border: '1px solid rgba(252,176,56,0.45)',
              bgcolor: 'rgba(252,176,56,0.1)',
            }}
          >
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>
              School active period
            </Typography>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 800, color: NAVY, mt: 0.35 }}>
              {settings.currentAcademicYear} · {settings.currentTerm}
            </Typography>
          </Box>
        ) : null}

        <FilterSection label="Academic year">
          <FilterSelect
            value={filterYear}
            onChange={(v) => setFilterYear(v || settings?.currentAcademicYear || '')}
            options={yearOptions.length ? yearOptions : [{ id: filterYear, label: filterYear || 'Year' }]}
          />
        </FilterSection>

        <FilterSection label="Term">
          <FilterSelect
            value={filterTerm}
            onChange={(v) => setFilterTerm(v || settings?.currentTerm || '')}
            options={termOptions}
          />
        </FilterSection>

        <FilterSection label="Class">
          <FilterSelect value={filterClassId} onChange={setFilterClassId} options={classFilterOptions} />
        </FilterSection>

        <FilterSection label="Status">
          <FilterSelect value={filterStatus} onChange={setFilterStatus} options={statusFilterOptions} />
        </FilterSection>
      </AcademicFilterDrawer>

      <Dialog open={!!detailAssessment} onClose={() => setDetailAssessment(null)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 2, mx: { xs: 1, sm: 0 } } } }}>
        {detailAssessment ? (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: NAVY, pr: 6 }}>{detailAssessment.title}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pt: 1 }}>
              <DetailRow label="Code" value={(detailAssessment as ApiAssessment & { assessmentCode?: string }).assessmentCode ?? ''} />
              <DetailRow label="Class" value={classLabel(detailAssessment)} />
              <DetailRow label="Course" value={detailAssessment.subject?.name ?? ''} />
              <DetailRow label="Component" value={detailAssessment.component?.name ?? ''} />
              <DetailRow
                label="Teacher"
                value={
                  detailAssessment.createdByName?.trim() ||
                  detailAssessment.createdBy ||
                  ''
                }
              />
              <DetailRow
                label="Scheduled"
                value={
                  detailAssessment.assessmentDate
                    ? new Date(detailAssessment.assessmentDate).toLocaleString()
                    : 'Not set'
                }
              />
              <DetailRow label="Status" value={detailAssessment.status} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
              {detailAssessment.status === 'DRAFT' ? (
                <Button fullWidth variant="contained" startIcon={<CheckCircleOutlinedIcon />} onClick={() => setConfirmAction('approve')} sx={{ bgcolor: '#059669', fontWeight: 700 }}>
                  Approve for mark entry
                </Button>
              ) : null}
              {detailAssessment.status === 'DRAFT' || detailAssessment.status === 'OPEN' ? (
                <Button fullWidth variant="outlined" color="error" startIcon={<CancelOutlinedIcon />} onClick={() => setConfirmAction('reject')} sx={{ fontWeight: 700 }}>
                  Reject
                </Button>
              ) : null}
              <Button fullWidth onClick={() => navigate(`/assessments/${detailAssessment.id}`)} sx={{ fontWeight: 700 }}>
                Open details
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog open={confirmAction === 'approve'} onClose={() => setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Approve assessment?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>Teachers can enter marks after approval.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button fullWidth onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button fullWidth variant="contained" disabled={busy} onClick={() => void runApprove()} sx={{ bgcolor: '#059669', fontWeight: 700 }}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmAction === 'reject'} onClose={() => setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Reject assessment?</DialogTitle>
        <DialogContent>
          <TextField label="Reason (optional)" fullWidth size="small" multiline minRows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button fullWidth onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button fullWidth variant="contained" color="error" disabled={busy} onClick={() => void runReject()} sx={{ fontWeight: 700 }}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MiniStat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid rgba(0,4,53,0.06)' }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: accent ?? NAVY }}>{value}</Typography>
      {sub ? <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{sub}</Typography> : null}
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.35, borderBottom: '1px dashed rgba(0,4,53,0.08)' }}>
      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY, textAlign: 'right' }}>{value}</Typography>
    </Box>
  );
}

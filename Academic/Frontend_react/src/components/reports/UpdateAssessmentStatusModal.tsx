import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { bulkUpdateAssessmentReportingStage, listAssessmentReportingStageRecords, smListSubjects } from '@/services/api';
import { toast } from '@/lib/toast';

type Props = {
  open: boolean;
  onClose: () => void;
  academicYear: string;
  term: string;
  classes: Array<{ id: string; name: string; stream?: string | null }>;
  onUpdated?: () => void | Promise<void>;
};

type Row = {
  markId: string;
  assessmentId: string;
  studentName: string;
  studentCode: string;
  classId: string;
  className: string;
  stream?: string;
  subjectId: string;
  subjectName: string;
  componentName: string;
  assessmentTitle: string;
  assessmentDate?: string | null;
  score?: number | null;
  maxMark?: number | null;
  currentReportingStage: string;
};

const STAGE_OPTIONS = [
  { value: 'BEGINNING_TERM', label: 'Beginning Term' },
  { value: 'MID_TERM', label: 'Mid-Term' },
  { value: 'TERM_FINAL', label: 'Term Final (End of Term)' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
] as const;

function stageLabel(v?: string | null) {
  return STAGE_OPTIONS.find((o) => o.value === v)?.label || (v || 'Unassigned').replace(/_/g, ' ');
}

export default function UpdateAssessmentStatusModal({ open, onClose, academicYear, term, classes, onUpdated }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedMarkIds, setSelectedMarkIds] = useState<string[]>([]);
  const [targetStage, setTargetStage] = useState<'BEGINNING_TERM' | 'MID_TERM'>('BEGINNING_TERM');
  const [filters, setFilters] = useState({
    classId: '',
    stream: '',
    subjectId: '',
    component: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    currentStage: '',
  });
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    smListSubjects().then((s) => setSubjects(Array.isArray(s) ? s : [])).catch(() => setSubjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedMarkIds([]);
  }, [open, filters.classId, filters.stream, filters.subjectId, filters.component, filters.dateFrom, filters.dateTo, filters.search, filters.currentStage]);

  const streamOptions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (!filters.classId || c.id === filters.classId) {
        if (c.stream) set.add(c.stream);
      }
    });
    return [...set].sort();
  }, [classes, filters.classId]);

  const loadRows = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await listAssessmentReportingStageRecords({
        academicYear,
        term,
        classId: filters.classId || undefined,
        stream: filters.stream || undefined,
        subjectId: filters.subjectId || undefined,
        componentId: filters.component || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        search: filters.search || undefined,
        reportingStage: filters.currentStage || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Failed to load assessment records', e?.response?.data?.message || e?.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, academicYear, term, filters.classId, filters.stream, filters.subjectId, filters.component, filters.dateFrom, filters.dateTo, filters.search, filters.currentStage]);

  const filteredRows = useMemo(() => {
    // extra client-side component text filter for convenience
    const q = filters.component.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.componentName} ${r.assessmentTitle}`.toLowerCase().includes(q));
  }, [rows, filters.component]);

  const selectedSet = useMemo(() => new Set(selectedMarkIds), [selectedMarkIds]);
  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedSet.has(r.markId));
  const someSelected = filteredRows.some((r) => selectedSet.has(r.markId));

  const selectedRows = useMemo(() => filteredRows.filter((r) => selectedSet.has(r.markId)), [filteredRows, selectedSet]);
  const selectedAssessmentIds = useMemo(() => Array.from(new Set(selectedRows.map((r) => r.assessmentId))), [selectedRows]);

  const toggleAll = (checked: boolean) => {
    setSelectedMarkIds((prev) => {
      const set = new Set(prev);
      filteredRows.forEach((r) => (checked ? set.add(r.markId) : set.delete(r.markId)));
      return [...set];
    });
  };

  const toggleRow = (id: string) => {
    setSelectedMarkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const doUpdate = async () => {
    if (!selectedAssessmentIds.length) {
      toast.error('No records selected', 'Select assessment records to update.');
      return;
    }
    setSaving(true);
    try {
      const res = await bulkUpdateAssessmentReportingStage({
        assessmentIds: selectedAssessmentIds,
        reportingStage: targetStage,
        filters: {
          academicYear,
          term,
          classId: filters.classId || undefined,
        },
      });
      toast.success(
        `Updated ${res?.updated ?? 0} assessment(s)`,
        `Stage: ${stageLabel(targetStage)} · Skipped: ${res?.skipped ?? 0} · Unchanged: ${res?.unchanged ?? 0}`
      );
      setConfirmOpen(false);
      setSelectedMarkIds([]);
      await loadRows();
      await onUpdated?.();
    } catch (e: any) {
      toast.error('Update failed', e?.response?.data?.message || e?.message);
    } finally {
      setSaving(false);
    }
  };

  const componentOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.componentName && set.add(r.componentName));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  return (
    <>
      <Dialog open={open} onClose={() => !saving && onClose()} fullScreen={fullScreen} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#000435' }}>
          Update Assessment Status
          <Typography sx={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, mt: 0.25 }}>
            Review submitted assessment marks and assign them to Beginning Term or Mid-Term reporting. ({academicYear} · {term})
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
          <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, mb: 1.5, bgcolor: '#fff' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Class</InputLabel>
                <Select label="Class" value={filters.classId} onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value, stream: '' }))}>
                  <MenuItem value="">All classes</MenuItem>
                  {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}{c.stream ? ` ${c.stream}` : ''}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Stream</InputLabel>
                <Select label="Stream" value={filters.stream} onChange={(e) => setFilters((f) => ({ ...f, stream: e.target.value }))}>
                  <MenuItem value="">All streams</MenuItem>
                  {streamOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Subject/Course</InputLabel>
                <Select label="Subject/Course" value={filters.subjectId} onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}>
                  <MenuItem value="">All subjects</MenuItem>
                  {subjects.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Component</InputLabel>
                <Select label="Component" value={filters.component} onChange={(e) => setFilters((f) => ({ ...f, component: e.target.value }))}>
                  <MenuItem value="">All components</MenuItem>
                  {componentOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" type="date" label="Date from" InputLabelProps={{ shrink: true }} value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <TextField size="small" type="date" label="Date to" InputLabelProps={{ shrink: true }} value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }} alignItems={{ md: 'center' }}>
              <TextField size="small" label="Search student/code" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} sx={{ minWidth: { md: 260 } }} />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Current status</InputLabel>
                <Select label="Current status" value={filters.currentStage} onChange={(e) => setFilters((f) => ({ ...f, currentStage: e.target.value }))}>
                  <MenuItem value="">All statuses</MenuItem>
                  {STAGE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" onClick={() => void loadRows()} sx={{ textTransform: 'none', fontWeight: 700 }}>Refresh</Button>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #e2e8f0', borderRadius: 2, mb: 1.5, bgcolor: '#fff' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${filteredRows.length} record(s)`} />
                <Chip color={selectedRows.length ? 'primary' : 'default'} label={`${selectedRows.length} selected`} />
                <Chip label={`${selectedAssessmentIds.length} assessment(s) to update`} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>New status</InputLabel>
                  <Select label="New status" value={targetStage} onChange={(e) => setTargetStage(e.target.value as any)}>
                    <MenuItem value="BEGINNING_TERM">Beginning Term</MenuItem>
                    <MenuItem value="MID_TERM">Mid-Term</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!selectedRows.length || saving}
                  onClick={() => setConfirmOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#000435', '&:hover': { bgcolor: '#0b184f' } }}
                >
                  Update selected
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox indeterminate={someSelected && !allSelected} checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Class/Stream</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Marks</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Current</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>New</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>
                  ) : filteredRows.length ? filteredRows.map((r) => {
                    const checked = selectedSet.has(r.markId);
                    return (
                      <TableRow key={r.markId} hover selected={checked} onClick={() => toggleRow(r.markId)} sx={{ cursor: 'pointer' }}>
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={checked} onChange={() => toggleRow(r.markId)} />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{r.studentName}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{r.studentCode || 'No code'}</Typography>
                        </TableCell>
                        <TableCell>{r.className}{r.stream ? ` ${r.stream}` : ''}</TableCell>
                        <TableCell>{r.subjectName}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.componentName}</Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>{r.assessmentTitle}</Typography>
                        </TableCell>
                        <TableCell>{r.assessmentDate ? new Date(r.assessmentDate).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{r.score ?? '—'} / {r.maxMark ?? '—'}</TableCell>
                        <TableCell><Chip size="small" label={stageLabel(r.currentReportingStage)} /></TableCell>
                        <TableCell><Chip size="small" color={checked ? 'primary' : 'default'} label={checked ? stageLabel(targetStage) : '—'} /></TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5, color: '#64748b' }}>No submitted assessment marks found for the selected filters.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Divider sx={{ my: 1.5 }} />
          <Typography sx={{ fontSize: '0.78rem', color: '#475569' }}>
            Updates only the reporting classification (Beginning/Mid-Term). Existing marks, students, courses, components and dates are preserved. Changes affect report generation immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#000435' }}>Confirm status update</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: '#334155' }}>
            You are about to update the reporting status of <strong>{selectedRows.length}</strong> selected mark record(s) across <strong>{selectedAssessmentIds.length}</strong> assessment(s) to <strong>{stageLabel(targetStage)}</strong>.
          </Typography>
          <Typography sx={{ mt: 1, color: '#334155' }}>
            This will affect students&apos; report cards. Do you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={() => void doUpdate()} variant="contained" disabled={saving} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#000435' }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Continue & Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { toast } from '@/lib/toast';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import {
  createExaminationType,
  deleteExaminationType,
  getExaminationTypeStats,
  listExaminationTypeRows,
  updateExaminationType,
  type ExaminationTypeRow,
  type ExaminationTypeStats,
} from '@/services/api';

const NAVY = '#000435';
const BORDER = '#e2e8f0';

type FormState = {
  id: string | null;
  name: string;
  code: string;
  description: string;
  academicYear: string;
  term: string;
  status: 'ACTIVE' | 'INACTIVE';
};

const EMPTY_FORM = (year: string, term: string): FormState => ({
  id: null, name: '', code: '', description: '', academicYear: year || '', term: term || '', status: 'ACTIVE',
});

export default function ExaminationTypesPage() {
  const { settings, academicYear: currentYear, term: currentTerm } = useOrgAcademicPeriod();

  const [filters, setFilters] = useState({ academicYear: '', term: '', name: '' });
  const [rows, setRows] = useState<ExaminationTypeRow[]>([]);
  const [stats, setStats] = useState<ExaminationTypeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM(currentYear, currentTerm));
  const [saving, setSaving] = useState(false);

  const [viewRow, setViewRow] = useState<ExaminationTypeRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ExaminationTypeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const yearOptions = useMemo(() => (settings?.academicYears ?? [currentYear]).filter(Boolean), [settings, currentYear]);
  const termOptions = useMemo(() => (settings?.terms ?? [currentTerm]).filter(Boolean), [settings, currentTerm]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        academicYear: filters.academicYear || undefined,
        term: filters.term || undefined,
        name: filters.name.trim() || undefined,
      };
      const [rowData, statData] = await Promise.all([listExaminationTypeRows(params), getExaminationTypeStats(params)]);
      setRows(rowData);
      setStats(statData);
    } catch {
      setError('Could not load examination types.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  function openAdd() { setForm(EMPTY_FORM(filters.academicYear || currentYear, filters.term || currentTerm)); setFormOpen(true); }
  function openEdit(r: ExaminationTypeRow) {
    setForm({ id: r.id, name: r.name, code: r.code ?? '', description: r.description ?? '', academicYear: r.academicYear, term: r.term, status: (r.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') });
    setFormOpen(true);
  }

  async function saveForm() {
    if (!form.name.trim() || !form.academicYear.trim() || !form.term.trim()) {
      toast.error('Examination Type Name, Academic Year and Term are required.');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await updateExaminationType(form.id, {
          name: form.name.trim(), code: form.code.trim() || null, description: form.description.trim() || null,
          academicYear: form.academicYear.trim(), term: form.term.trim(), status: form.status,
        });
        toast.success('Examination type updated.');
      } else {
        await createExaminationType({
          name: form.name.trim(), code: form.code.trim() || undefined, description: form.description.trim() || undefined,
          academicYear: form.academicYear.trim(), term: form.term.trim(), status: form.status,
        });
        toast.success('Examination type created.');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save examination type.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await deleteExaminationType(deleteRow.id);
      toast.success('Examination type deleted. Dependent timetables, sessions, courses and examination lists were removed.');
      setDeleteRow(null);
      await load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not delete examination type.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100%', bgcolor: '#F5F7FA', p: { xs: 2, md: 3 }, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B7791F' }}>
            Academic · Examination
          </Typography>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: { xs: '1.375rem', md: '1.75rem' }, lineHeight: 1.2 }}>
            Examination Types
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.5 }}>
            Manage examination types. Deleting a type removes all linked timetables, sessions, courses, examination lists, rooms and assignments in one transaction.
          </Typography>
        </Box>

        {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}

        {/* Summary cards */}
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          <SummaryCard icon={<SchoolOutlinedIcon />} label="Total Examination Types" value={stats?.totalExaminationTypes ?? 0} />
          <SummaryCard icon={<CheckCircleOutlinedIcon />} label="Active Examination Types" value={stats?.activeExaminationTypes ?? 0} accent="#059669" />
          <SummaryCard icon={<EventNoteOutlinedIcon />} label="Total Examination Timetables" value={stats?.totalExaminationTimetables ?? 0} accent="#2563EB" />
          <SummaryCard icon={<CalendarMonthOutlinedIcon />} label="Academic Years Covered" value={stats?.academicYearsCovered ?? 0} accent="#FCB038" />
        </Box>

        {/* Filters + add */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${BORDER}` }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'flex-end' } }}>
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel id="f-year">Academic Year</InputLabel>
              <Select labelId="f-year" label="Academic Year" value={filters.academicYear} onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}>
                <MenuItem value="">All years</MenuItem>
                {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
              <InputLabel id="f-term">Term</InputLabel>
              <Select labelId="f-term" label="Term" value={filters.term} onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}>
                <MenuItem value="">All terms</MenuItem>
                {termOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Examination Type Name"
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              sx={{ minWidth: 200, flex: 1 }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY, borderRadius: 2, '&:hover': { bgcolor: '#1B2D52' }, whiteSpace: 'nowrap' }}>
              + Add Examination Type
            </Button>
          </Stack>
        </Paper>

        {/* Table */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {loading ? <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box> : null}
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Type Name', 'Type Code', 'Academic Year', 'Term', 'Number of Timetables', 'Number of Examination Sessions', 'Status', 'Created By', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ bgcolor: '#F8FAFC', color: NAVY, fontWeight: 800, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: NAVY }}>{r.name}</TableCell>
                    <TableCell>{r.code ?? '—'}</TableCell>
                    <TableCell>{r.academicYear}</TableCell>
                    <TableCell>{r.term}</TableCell>
                    <TableCell>{r.numberOfTimetables}</TableCell>
                    <TableCell>{r.numberOfExaminationSessions}</TableCell>
                    <TableCell><Chip size="small" label={r.status} color={r.status === 'ACTIVE' ? 'success' : 'default'} sx={{ fontWeight: 700 }} /></TableCell>
                    <TableCell>{r.createdBy ?? '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => setViewRow(r)} sx={{ textTransform: 'none' }}>View</Button>
                        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(r)} sx={{ textTransform: 'none' }}>Edit</Button>
                        <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setDeleteRow(r)} sx={{ textTransform: 'none' }}>Delete</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !rows.length ? (
                  <TableRow><TableCell colSpan={9} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>No examination types match these filters.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      {/* Add / Edit modal */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>{form.id ? 'Edit Examination Type' : 'Add Examination Type'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Examination Type Name" required fullWidth value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Beginning of Term, Mid-Term, End of Term" />
            <TextField label="Code" fullWidth value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} helperText="Unique examination type code" />
            <TextField label="Description" fullWidth multiline minRows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="fm-year">Academic Year</InputLabel>
                <Select labelId="fm-year" label="Academic Year" value={form.academicYear} onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}>
                  {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="fm-term">Term</InputLabel>
                <Select labelId="fm-term" label="Term" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}>
                  {termOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="fm-status">Status</InputLabel>
              <Select labelId="fm-status" label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={saveForm} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY }}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* View */}
      <Dialog open={Boolean(viewRow)} onClose={() => setViewRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>{viewRow?.name}</DialogTitle>
        <DialogContent dividers>
          {viewRow ? (
            <Stack spacing={1} sx={{ fontSize: '0.875rem' }}>
              <Row k="Type Code" v={viewRow.code ?? '—'} />
              <Row k="Academic Year" v={viewRow.academicYear} />
              <Row k="Term" v={viewRow.term} />
              <Row k="Status" v={viewRow.status} />
              <Row k="Number of Timetables" v={String(viewRow.numberOfTimetables)} />
              <Row k="Number of Examination Sessions" v={String(viewRow.numberOfExaminationSessions)} />
              <Row k="Number of Examination Lists" v={String(viewRow.numberOfExaminationLists)} />
              <Row k="Created By" v={viewRow.createdBy ?? '—'} />
              <Row k="Description" v={viewRow.description ?? '—'} />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setViewRow(null)} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteRow)} onClose={() => setDeleteRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#b91c1c' }}>Delete examination type?</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontWeight: 700, color: NAVY }}>{deleteRow?.name} ({deleteRow?.code ?? 'no code'})</Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will permanently delete, in a single transaction:
            <ul>
              <li>{deleteRow?.numberOfTimetables ?? 0} examination timetable(s)</li>
              <li>{deleteRow?.numberOfExaminationSessions ?? 0} examination session(s) and their assigned courses</li>
              <li>{deleteRow?.numberOfExaminationLists ?? 0} examination list(s), room allocations, classes, invigilator assignments and related records</li>
            </ul>
            This cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteRow(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={confirmDelete} sx={{ textTransform: 'none', fontWeight: 800 }}>{deleting ? 'Deleting…' : 'Delete permanently'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, borderBottom: `1px solid ${BORDER}`, pb: 0.75 }}><span style={{ color: '#64748b' }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></Box>;
}

function SummaryCard({ icon, label, value, accent = NAVY }: { icon: ReactNode; label: string; value: number; accent?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden', minWidth: 0 }}>
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: accent }} />
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box sx={{ color: accent }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }} noWrap>{label}</Typography>
          <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: NAVY, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

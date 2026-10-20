import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CloseIcon from '@mui/icons-material/Close';
import {
  api,
  createClassMonitor,
  deleteClassMonitor,
  listClassMonitors,
  type ClassMonitorRecord,
} from '@/services/api';
import type { ApiClass } from '@/types';

type StudentPick = {
  id: string;
  label: string;
  studentCode: string | null;
  classId: string | null;
};

function classLabel(cls: ApiClass) {
  return [cls.name, cls.stream].filter(Boolean).join(' ');
}

export default function ClassMonitorsPage() {
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [monitors, setMonitors] = useState<ClassMonitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickClass, setPickClass] = useState<ApiClass | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<StudentPick[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentPick | null>(null);
  const [slot, setSlot] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classRes, monitorRows] = await Promise.all([
        api.get('/classes'),
        listClassMonitors(),
      ]);
      setClasses(classRes.data.data ?? []);
      setMonitors(monitorRows);
    } catch {
      setSnackbar({ open: true, message: 'Could not load class monitors', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => classLabel(c).toLowerCase().includes(q));
  }, [classes, search]);

  const monitorsByClass = useMemo(() => {
    const map = new Map<string, ClassMonitorRecord[]>();
    for (const m of monitors) {
      const list = map.get(m.classId) ?? [];
      list.push(m);
      map.set(m.classId, list);
    }
    for (const [, list] of map) list.sort((a, b) => a.slot - b.slot);
    return map;
  }, [monitors]);

  const openAdd = (cls: ApiClass) => {
    const existing = monitorsByClass.get(cls.id) ?? [];
    const nextSlot: 1 | 2 = existing.some((m) => m.slot === 1) ? 2 : 1;
    if (existing.length >= 2) {
      setSnackbar({ open: true, message: 'This class already has two monitors', severity: 'error' });
      return;
    }
    setPickClass(cls);
    setSlot(nextSlot);
    setSelectedStudent(null);
    setStudentQuery('');
    setStudentOptions([]);
    setDialogOpen(true);
    void loadStudentsForClass(cls.id, '');
  };

  const loadStudentsForClass = async (classId: string, q: string) => {
    setLoadingStudents(true);
    try {
      const res = await api.get('/students', { params: { classId, search: q || undefined, status: 'ACTIVE' } });
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      setStudentOptions(
        rows.map((s: { id: string; firstName: string; lastName: string; studentCode?: string | null; classId?: string }) => ({
          id: s.id,
          label: `${s.firstName} ${s.lastName}`.trim(),
          studentCode: s.studentCode ?? null,
          classId: s.classId ?? classId,
        }))
      );
    } catch {
      setStudentOptions([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (!dialogOpen || !pickClass) return;
    const t = setTimeout(() => void loadStudentsForClass(pickClass.id, studentQuery), 280);
    return () => clearTimeout(t);
  }, [dialogOpen, pickClass, studentQuery]);

  const handleSave = async () => {
    if (!pickClass || !selectedStudent) return;
    setSaving(true);
    try {
      await createClassMonitor({ classId: pickClass.id, studentId: selectedStudent.id, slot });
      setSnackbar({ open: true, message: 'Class monitor assigned', severity: 'success' });
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save class monitor';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ClassMonitorRecord) => {
    if (!confirm(`Remove ${row.studentName} as monitor for ${row.className}?`)) return;
    try {
      await deleteClassMonitor(row.id);
      setSnackbar({ open: true, message: 'Monitor removed', severity: 'success' });
      await load();
    } catch {
      setSnackbar({ open: true, message: 'Could not remove monitor', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Class monitors
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
          Assign up to two student monitors per class. Teachers scan a monitor badge in TichaPortal to record period
          check-in for that class.
        </Typography>
      </Paper>

      <TextField
        fullWidth
        size="small"
        placeholder="Search classes…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, opacity: 0.5 }} />,
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell>Monitors (max 2)</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClasses.map((cls) => {
                const rows = monitorsByClass.get(cls.id) ?? [];
                return (
                  <TableRow key={cls.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{classLabel(cls)}</TableCell>
                    <TableCell>
                      {rows.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          None assigned
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {rows.map((m) => (
                            <Box
                              key={m.id}
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                borderRadius: 2,
                                bgcolor: 'action.hover',
                              }}
                            >
                              <Chip size="small" label={`Monitor ${m.slot}`} color="primary" variant="outlined" />
                              <Typography variant="body2" fontWeight={600}>
                                {m.studentName}
                              </Typography>
                              {m.studentCode && (
                                <Typography variant="caption" color="text.secondary">
                                  {m.studentCode}
                                </Typography>
                              )}
                              <Chip
                                size="small"
                                icon={<QrCode2Icon />}
                                label={m.qrCode}
                                sx={{ fontFamily: 'monospace', fontSize: 11 }}
                              />
                              <Button size="small" color="error" onClick={() => void handleDelete(m)}>
                                Remove
                              </Button>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        disabled={rows.length >= 2}
                        onClick={() => openAdd(cls)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                      >
                        Add monitor
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Assign class monitor
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Class"
            value={pickClass ? classLabel(pickClass) : ''}
            InputProps={{ readOnly: true }}
            size="small"
          />
          <TextField
            select
            label="Monitor slot"
            value={slot}
            onChange={(e) => setSlot(Number(e.target.value) as 1 | 2)}
            size="small"
            SelectProps={{ native: true }}
          >
            <option value={1}>Monitor 1</option>
            <option value={2}>Monitor 2</option>
          </TextField>
          <Autocomplete
            options={studentOptions}
            loading={loadingStudents}
            value={selectedStudent}
            onChange={(_, v) => setSelectedStudent(v)}
            onInputChange={(_, v) => setStudentQuery(v)}
            getOptionLabel={(o) =>
              o.studentCode ? `${o.label} (${o.studentCode})` : o.label
            }
            renderInput={(params) => (
              <TextField {...params} label="Student" placeholder="Search by name or code" />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!selectedStudent || saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save monitor'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

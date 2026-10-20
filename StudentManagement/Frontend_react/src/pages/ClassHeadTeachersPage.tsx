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
  InputAdornment,
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
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import { api, assignClassHeadTeacher, fetchTeacherCandidates } from '@/services/api';
import type { ApiClass } from '@/types';

type TeacherCandidate = {
  id: string;
  name: string;
  email: string | null;
  source: 'TIMETABLE' | 'HR' | 'MANUAL';
  userId: string | null;
  refId: string | null;
  subtitle: string | null;
};

function classLabel(cls: ApiClass) {
  return [cls.name, cls.stream].filter(Boolean).join(' ');
}

function sourceColor(source?: string | null) {
  switch (source) {
    case 'TIMETABLE':
      return 'primary';
    case 'HR':
      return 'secondary';
    default:
      return 'default';
  }
}

export default function ClassHeadTeachersPage() {
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ApiClass | null>(null);
  const [candidates, setCandidates] = useState<TeacherCandidate[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<TeacherCandidate | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data ?? []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load classes', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const loadCandidates = useCallback(async (q?: string) => {
    setLoadingCandidates(true);
    try {
      const data = await fetchTeacherCandidates(q);
      setCandidates(Array.isArray(data) ? data : []);
    } catch {
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const timer = window.setTimeout(() => {
      void loadCandidates(candidateSearch || undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [dialogOpen, candidateSearch, loadCandidates]);

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((cls) => {
      const label = classLabel(cls).toLowerCase();
      const head = cls.headTeacherName?.toLowerCase() ?? '';
      return label.includes(q) || head.includes(q) || (cls.category?.toLowerCase().includes(q) ?? false);
    });
  }, [classes, search]);

  const assignedCount = useMemo(
    () => classes.filter((c) => Boolean(c.headTeacherName)).length,
    [classes]
  );

  function openAssignDialog(cls: ApiClass) {
    setSelectedClass(cls);
    setSelectedCandidate(null);
    setManualName(cls.headTeacherName ?? '');
    setManualEmail(cls.headTeacherEmail ?? '');
    setUseManual(cls.headTeacherSource === 'MANUAL' || (!cls.headTeacherUserId && !cls.headTeacherRefId && Boolean(cls.headTeacherName)));
    setCandidateSearch('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const payload = useManual
        ? {
            headTeacherUserId: null,
            headTeacherRefId: null,
            headTeacherName: manualName.trim() || null,
            headTeacherEmail: manualEmail.trim() || null,
            headTeacherSource: 'MANUAL' as const,
          }
        : selectedCandidate
          ? {
              headTeacherUserId: selectedCandidate.userId,
              headTeacherRefId: selectedCandidate.refId,
              headTeacherName: selectedCandidate.name,
              headTeacherEmail: selectedCandidate.email,
              headTeacherSource: selectedCandidate.source,
            }
          : {
              headTeacherUserId: null,
              headTeacherRefId: null,
              headTeacherName: null,
              headTeacherEmail: null,
              headTeacherSource: null,
            };

      await assignClassHeadTeacher(selectedClass.id, payload);
      setSnackbar({ open: true, message: 'Head of class updated', severity: 'success' });
      setDialogOpen(false);
      await loadClasses();
    } catch {
      setSnackbar({ open: true, message: 'Could not update head of class', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
            Class Teachers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign a head of class from Timetable, HR, or enter manually. Teachers see these classes in Teacher Portal · My Classes.
          </Typography>
        </Box>
        <Paper elevation={0} sx={{ px: 2.5, py: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Assigned
          </Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {assignedCount}/{classes.length}
          </Typography>
        </Paper>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search class or head teacher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280, flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Head Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Source</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon sx={{ color: '#64748b', fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 600 }}>{classLabel(cls)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{cls.category ?? '—'}</TableCell>
                    <TableCell>
                      {cls.headTeacherName ? (
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{cls.headTeacherName}</Typography>
                          {cls.headTeacherEmail && (
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{cls.headTeacherEmail}</Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#94a3b8', fontStyle: 'italic' }}>Not assigned</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {cls.headTeacherSource ? (
                        <Chip size="small" label={cls.headTeacherSource} color={sourceColor(cls.headTeacherSource) as 'primary' | 'secondary' | 'default'} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => openAssignDialog(cls)}>
                        {cls.headTeacherName ? 'Change' : 'Assign'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>Assign Head of Class</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedClass ? classLabel(selectedClass) : ''}
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant={!useManual ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setUseManual(false)}
            >
              Pick from list
            </Button>
            <Button
              variant={useManual ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setUseManual(true)}
            >
              Manual entry
            </Button>
          </Box>

          {!useManual ? (
            <>
              <TextField
                fullWidth
                size="small"
                placeholder="Search teachers (Timetable / HR)…"
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {loadingCandidates ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Autocomplete
                  options={candidates}
                  getOptionLabel={(option) => option.name}
                  value={selectedCandidate}
                  onChange={(_, value) => setSelectedCandidate(value)}
                  renderInput={(params) => <TextField {...params} label="Teacher" placeholder="Select teacher" />}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[option.subtitle, option.email].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              )}
            </>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField
                label="Teacher name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Email (optional)"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                fullWidth
                type="email"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="inherit"
            onClick={() => {
              setSelectedCandidate(null);
              setManualName('');
              setManualEmail('');
            }}
          >
            Clear
          </Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving || (useManual ? !manualName.trim() : false)}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

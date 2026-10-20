import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Checkbox, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api, smListClasses, smListStudents, smUpdateStudentStatus } from '@/services/api';
import { toast } from '@/lib/toast';
import { useAcademicSettings } from '@/contexts/academic-settings-context';

type GradStudent = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  studentUid?: string;
  studentCode?: string;
  status?: string;
};

export default function GraduationPage() {
  const { settings } = useAcademicSettings();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<GradStudent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    Promise.all([smListClasses().catch(() => []), api.get('/classes').then((r) => r.data.data).catch(() => [])])
      .then(([sm, local]) => {
        const rows = (Array.isArray(sm) && sm.length ? sm : local) ?? [];
        setClasses(rows);
      });
  }, []);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    setLoading(true);
    smListStudents({ classId, academicYear: settings?.currentAcademicYear || undefined })
      .then(async (rows: any[]) => {
        if (rows?.length) return rows;
        const res = await api.get('/students', { params: { classId } });
        return res.data.data ?? [];
      })
      .then((rows) => setStudents(rows ?? []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [classId, settings?.currentAcademicYear]);

  const nameOf = (s: GradStudent) => s.fullName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();

  const allSelected = students.length > 0 && students.every((s) => selected.has(s.id));

  const printCerts = () => window.print();

  const graduate = async () => {
    if (!selected.size) return;
    if (!confirm(`Mark ${selected.size} student(s) as graduated (alumni)?`)) return;
    const count = selected.size;
    setWorking(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          smUpdateStudentStatus(id, 'GRADUATED', { skipToast: true }).catch(() =>
            api.put(`/students/${id}`, { status: 'GRADUATED' }, { skipToast: true })
          )
        )
      );
      setStudents((prev) => prev.map((s) => (selected.has(s.id) ? { ...s, status: 'GRADUATED' } : s)));
      setSelected(new Set());
      toast.success(`${count} student(s) marked as alumni`);
    } catch {
      toast.error('Could not update graduation status');
    } finally {
      setWorking(false);
    }
  };

  const selectedStudents = useMemo(() => students.filter((s) => selected.has(s.id)), [students, selected]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, px: 3, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon sx={{ color: '#000435' }} />
          <Typography sx={{ fontWeight: 700 }}>Graduation</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!selected.size} onClick={printCerts} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Print certificates
          </Button>
          <Button variant="contained" startIcon={working ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />} disabled={!selected.size || working} onClick={() => void graduate()} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435' }}>
            Promote to alumni
          </Button>
        </Box>
      </Box>
      <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
        <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
          <InputLabel>Graduating class</InputLabel>
          <Select label="Graduating class" value={classId} onChange={(e) => { setClassId(e.target.value); setSelected(new Set()); }}>
            {classes.map((c: any) => (
              <MenuItem key={c.id} value={c.id}>{c.stream ? `${c.name} ${c.stream}` : c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={24} /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(students.map((s) => s.id)))} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>Select a class to load the cohort</TableCell></TableRow>
                ) : students.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={selected.has(s.id)} onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                          return next;
                        });
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{nameOf(s)}</TableCell>
                    <TableCell>{s.studentCode || s.studentUid}</TableCell>
                    <TableCell>{s.status ?? 'ACTIVE'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Box>

      <Box className="grad-certs" sx={{ display: 'none', '@media print': { display: 'block', p: 4 } }}>
        {selectedStudents.map((s) => (
          <Box key={s.id} sx={{ border: '4px solid #000435', p: 6, mb: 4, textAlign: 'center', pageBreakAfter: 'always' }}>
            <Typography sx={{ letterSpacing: '0.2em', fontSize: '0.75rem', fontWeight: 800 }}>CERTIFICATE OF COMPLETION</Typography>
            <Typography sx={{ mt: 3, fontSize: '1.75rem', fontWeight: 800 }}>{nameOf(s)}</Typography>
            <Typography sx={{ mt: 1 }}>has completed studies for {settings?.currentAcademicYear ?? ''}.</Typography>
            <Typography sx={{ mt: 4, fontFamily: 'monospace' }}>{s.studentCode || s.studentUid}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

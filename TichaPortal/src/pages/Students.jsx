import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ConductMarksModal from '../components/ConductMarksModal';
import { PageLoading, EmptyState } from '../components/ui';
import {
  ListPage,
  StickyFilterBar,
  BarSelect,
  ListPageBody,
  PageTitleRow,
  SectionPaper,
} from '../components/ListPageKit';
import api from '../services/api';
import { resolveStudentPhotoUrl, studentInitials } from '../utils/studentDisplay';
import { brand } from '../theme/theme';

const CLASS_TEACHER_SCOPE = { scope: 'class_teacher' };

const headCellSx = {
  py: 1,
  px: 1.5,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: brand.muted,
  bgcolor: '#F8F9FC',
  borderBottom: `1px solid ${brand.border}`,
  whiteSpace: 'nowrap',
};

const bodyCellSx = {
  py: 1.25,
  px: 1.5,
  fontSize: 13,
  color: brand.muted,
  borderBottom: `1px solid ${brand.border}`,
};

function StudentAvatar({ student }) {
  const [broken, setBroken] = useState(false);
  const src = resolveStudentPhotoUrl(student?.student_photo_url);
  useEffect(() => setBroken(false), [src]);
  return (
    <Avatar
      src={src && !broken ? src : undefined}
      onError={() => setBroken(true)}
      sx={{ width: 44, height: 44, bgcolor: 'rgba(19,33,61,0.08)', color: brand.navy, fontWeight: 700, fontSize: 13 }}
    >
      {studentInitials(student?.name)}
    </Avatar>
  );
}

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState('');
  const [classAccess, setClassAccess] = useState({ allowed: false, message: '' });
  const [records, setRecords] = useState({});
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isConductModalOpen, setIsConductModalOpen] = useState(false);
  const [conductStudent, setConductStudent] = useState(null);

  const loadClasses = useCallback(async () => {
    const res = await api.get('/teacher-portal/classes', { params: CLASS_TEACHER_SCOPE });
    const list = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
    setClasses(list);
    setSelectedClass((prev) => prev || list[0] || '');
    return list;
  }, []);

  const loadStudents = useCallback(async (className) => {
    if (!className) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/teacher-portal/students', {
        params: { ...CLASS_TEACHER_SCOPE, class_name: className, className },
      });
      if (res.data?.success) {
        setStudents(res.data.data || []);
        setLoadWarning(res.data.warning || '');
      }
    } catch (e) {
      console.error(e);
      setStudents([]);
      setLoadWarning('Could not load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses().catch(console.error);
  }, [loadClasses]);

  useEffect(() => {
    if (selectedClass) loadStudents(selectedClass);
  }, [selectedClass, loadStudents]);

  const loadAccess = useCallback(async (className) => {
    if (!className) {
      setClassAccess({ allowed: false, message: '' });
      setRecords({});
      return;
    }
    try {
      const res = await api.get('/class-students', { params: { className } });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setRecords(Object.fromEntries(list.map((r) => [r.id, r])));
      setClassAccess({ allowed: true, message: '' });
    } catch (e) {
      setRecords({});
      setClassAccess({
        allowed: false,
        message:
          e.response?.data?.message ||
          'Student information is not available for this class. Ask your school to enable it.',
      });
    }
  }, []);

  useEffect(() => {
    void loadAccess(selectedClass);
  }, [selectedClass, loadAccess]);

  const recordFor = (s) => records[s.student_id || s.id];

  const openEdit = (s) => {
    const r = recordFor(s);
    if (!r) return;
    setSaveError('');
    setEditing(r);
    setForm({
      firstName: r.firstName || '',
      lastName: r.lastName || '',
      gender: r.gender || '',
      dateOfBirth: r.dateOfBirth ? String(r.dateOfBirth).slice(0, 10) : '',
      nationality: r.nationality || '',
      district: r.district || '',
      sector: r.sector || '',
      cell: r.cell || '',
      village: r.village || '',
      bloodGroup: r.bloodGroup || '',
      allergies: r.allergies || '',
      hasMedicalCondition: Boolean(r.hasMedicalCondition),
      medicalConditionDetails: r.medicalConditionDetails || '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.put(`/class-students/${editing.id}`, form);
      setEditing(null);
      await loadAccess(selectedClass);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Could not save student information.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.id || '').toLowerCase().includes(q) ||
        String(s.student_code || '').toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  const openConduct = (student = null) => {
    setConductStudent(student);
    setIsConductModalOpen(true);
  };

  return (
    <ListPage>
      <StickyFilterBar search={searchTerm} onSearch={setSearchTerm} searchPlaceholder="Search by name or ID…">
        <BarSelect label="Class" value={selectedClass} onChange={setSelectedClass} options={classes} />
      </StickyFilterBar>

      <ListPageBody>
        <PageTitleRow
          title="My class students"
          subtitle="Roster and conduct marks for classes where you are the class teacher."
          actions={
            <Button
              variant="contained"
              startIcon={<GppMaybeOutlinedIcon />}
              disabled={!selectedClass || !students.length}
              onClick={() => openConduct(null)}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: brand.navy, color: '#fff', '&:hover': { bgcolor: '#1B2D52' } }}
            >
              Conduct marks
            </Button>
          }
        />

        {loadWarning ? (
          <Alert severity="warning" sx={{ borderRadius: 1 }}>
            {loadWarning}
          </Alert>
        ) : null}

        {classAccess.message ? (
          <Alert severity="info" sx={{ borderRadius: 1 }}>
            <Typography component="span" sx={{ fontWeight: 700 }}>Student information is off for this class. </Typography>
            {classAccess.message}
          </Alert>
        ) : null}

        {!classes.length ? (
          <SectionPaper title="Students" count={0}>
            <EmptyState
              title="No class teacher assignment"
              description="Ask your school to assign you as class teacher in Academic."
            />
          </SectionPaper>
        ) : selectedClass ? (
          <SectionPaper title={selectedClass} count={filteredStudents.length}>
            {loading ? (
              <PageLoading label="Loading students…" />
            ) : !filteredStudents.length ? (
              <EmptyState title="No students found" description={students.length ? 'Try a different search.' : 'No students in this class.'} />
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Student</TableCell>
                      <TableCell sx={headCellSx}>Student ID</TableCell>
                      <TableCell sx={headCellSx}>Grade / Stream</TableCell>
                      <TableCell sx={{ ...headCellSx, textAlign: 'right' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.map((s, idx) => (
                      <TableRow
                        key={s.row_id || s.id}
                        hover
                        sx={{
                          bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{ ...bodyCellSx, minWidth: 220 }}>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <StudentAvatar student={s} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: brand.navy }}>{s.name}</Typography>
                              <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>{s.student_code || s.id || '—'}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: 'tabular-nums' }}>
                          {s.student_code || s.id || '—'}
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, whiteSpace: 'nowrap' }}>
                          {s.grade ? `${s.grade}${s.stream ? ` ${s.stream}` : ''}` : '—'}
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                            <Button size="small" variant="outlined" onClick={() => openConduct(s)} sx={{ textTransform: 'none', fontWeight: 700, borderColor: brand.border }}>
                              Conduct
                            </Button>
                            {classAccess.allowed && recordFor(s) ? (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<EditRoundedIcon sx={{ fontSize: 14 }} />}
                                onClick={() => openEdit(s)}
                                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: brand.navy, color: '#fff', '&:hover': { bgcolor: '#1B2D52' } }}
                              >
                                Edit
                              </Button>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionPaper>
        ) : null}
      </ListPageBody>

      <Dialog open={!!editing} onClose={saving ? undefined : () => setEditing(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={saveEdit}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: brand.primary, textTransform: 'uppercase' }}>
                Student information
              </Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: brand.navy }}>
                {form.firstName} {form.lastName}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => setEditing(null)}
              disabled={saving}
              aria-label="Close"
              sx={{ minWidth: 0, p: 1, color: brand.muted }}
            >
              <CloseRoundedIcon />
            </Button>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {[
                ['firstName', 'First name'],
                ['lastName', 'Last name'],
                ['gender', 'Gender'],
                ['dateOfBirth', 'Date of birth', 'date'],
                ['nationality', 'Nationality'],
                ['district', 'District'],
                ['sector', 'Sector'],
                ['cell', 'Cell'],
                ['village', 'Village'],
                ['bloodGroup', 'Blood group'],
              ].map(([key, label, type]) => (
                <TextField
                  key={key}
                  label={label}
                  type={type || 'text'}
                  size="small"
                  value={form[key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  fullWidth
                />
              ))}
              <TextField
                label="Allergies"
                size="small"
                value={form.allergies ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                fullWidth
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(form.hasMedicalCondition)}
                    onChange={(e) => setForm((f) => ({ ...f, hasMedicalCondition: e.target.checked }))}
                  />
                }
                label="Has a medical condition"
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
              {form.hasMedicalCondition ? (
                <TextField
                  label="Medical condition details"
                  size="small"
                  value={form.medicalConditionDetails ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, medicalConditionDetails: e.target.value }))}
                  multiline
                  minRows={2}
                  fullWidth
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
              ) : null}
              {saveError ? (
                <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
                  {saveError}
                </Alert>
              ) : null}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditing(null)} disabled={saving} sx={{ fontWeight: 700, color: brand.navy }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
              sx={{ fontWeight: 700, bgcolor: brand.primary, color: brand.navy }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConductMarksModal
        isOpen={isConductModalOpen}
        onClose={() => setIsConductModalOpen(false)}
        initialStudent={conductStudent}
        students={students}
        className={selectedClass}
      />
    </ListPage>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupsIcon from '@mui/icons-material/Groups';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { brand } from '../theme/theme';
import api from '../services/api';
import { resolveStudentPhotoUrl, studentInitials } from '../utils/studentDisplay';

function signedPoints(mark) {
  const pts = Math.abs(Number(mark.points) || 0);
  if (String(mark.type || '').toUpperCase() === 'REWARD') return pts;
  return -pts;
}

const labelSx = { display: 'block', mb: 0.75, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748B' };

const searchBoxSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  borderRadius: 1,
  border: '1px solid #E2E8F0',
  px: 1.25,
  py: 0.75,
  '&:focus-within': { borderColor: brand.primary },
};

export default function ConductMarksModal({
  isOpen,
  onClose,
  initialStudent = null,
  students = [],
  className = '',
}) {
  const [catalogue, setCatalogue] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState('');
  const [markSearch, setMarkSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [student, setStudent] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRows([]);
    setStudent(initialStudent || null);
    setNote('');
    setSuccess(null);
    setSubmitError('');
    setMarkSearch('');
    setStudentSearch('');
  }, [isOpen, initialStudent]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setCatalogueLoading(true);
      setCatalogueError('');
      try {
        const res = await api.get('/teacher-portal/discipline/marks', { params: { status: 'Active' } });
        const list = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
        if (!cancelled) setCatalogue(list);
        if (!list.length && res.data?.warning) setCatalogueError(res.data.warning);
      } catch {
        if (!cancelled) {
          setCatalogue([]);
          setCatalogueError('Discipline marks could not be loaded. Check Student Discipline service.');
        }
      } finally {
        if (!cancelled) setCatalogueLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredMarks = useMemo(() => {
    const q = markSearch.trim().toLowerCase();
    if (!q) return catalogue;
    return catalogue.filter(
      (m) =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.category || '').toLowerCase().includes(q)
    );
  }, [catalogue, markSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.id || '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const addMark = useCallback((mark) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.id === mark.id);
      if (existing) {
        return prev.map((r) => (r.id === mark.id ? { ...r, qty: r.qty + 1 } : r));
      }
      return [...prev, { ...mark, qty: 1, impact: signedPoints(mark) }];
    });
    setMarkSearch('');
  }, []);

  const updateQty = (id, delta) => {
    setRows((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, qty: Math.max(1, r.qty + delta) } : r))
        .filter((r) => r.qty > 0)
    );
  };

  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));

  const totalPoints = rows.reduce((s, r) => s + r.impact * r.qty, 0);
  const canSubmit = Boolean(student && rows.length && className && !submitting);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post('/teacher-portal/discipline/conduct', {
        className,
        studentId: student.row_id || student.student_id,
        studentName: student.name,
        studentCode: student.student_code || student.id,
        note,
        notifyParent: true,
        notifyMethods: ['sms', 'email', 'inapp'],
        items: rows.map((r) => ({ markId: r.id, qty: r.qty })),
      });
      const cases = res.data?.data?.cases || [];
      const last = cases[cases.length - 1];
      setSuccess({
        count: res.data?.data?.count ?? cases.length,
        scoreAfter: last?.scoreAfter,
        scoreBefore: last?.scoreBefore,
      });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 'Could not record conduct. Try again or contact discipline office.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const listBoxSx = { maxHeight: 160, overflowY: 'auto', borderRadius: 1, border: '1px solid #E2E8F0', listStyle: 'none', m: 0, p: 0 };
  const listBtnSx = { display: 'flex', width: '100%', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, textAlign: 'left', border: 0, bgcolor: 'transparent', fontFamily: 'inherit', cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } };

  return (
    <Dialog
      open={Boolean(isOpen)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: { xs: '16px 16px 0 0', sm: 2 }, maxHeight: '92vh', m: { xs: 0, sm: 2 }, position: { xs: 'fixed', sm: 'relative' }, bottom: { xs: 0, sm: 'auto' } } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #E2E8F0', px: 2.5, py: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupsIcon sx={{ fontSize: 20, color: brand.primary }} />
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: brand.navy }}>Conduct marks</Typography>
            {className && <Typography sx={{ fontSize: 12, color: '#64748B' }}>{className}</Typography>}
          </Box>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close" sx={{ borderRadius: 1, color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Stack>

      {success ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: '#059669' }} />
          <Typography sx={{ mt: 2, fontSize: 18, fontWeight: 700, color: brand.navy }}>Recorded</Typography>
          <Typography sx={{ mt: 1, fontSize: 14, color: '#475569' }}>
            {success.count} discipline case{success.count === 1 ? '' : 's'} saved for {student?.name}.
            Parents were notified in Kinyarwanda and English when contact details exist.
          </Typography>
          {success.scoreAfter != null && (
            <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 600, color: brand.navy }}>
              Discipline score: {success.scoreBefore ?? '-'} to {success.scoreAfter} / 100
            </Typography>
          )}
          <Button
            type="button"
            fullWidth
            onClick={onClose}
            sx={{ mt: 3, py: 1.5, borderRadius: 1, bgcolor: brand.navy, color: '#fff', fontSize: 14, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: brand.navy2 } }}
          >
            Close
          </Button>
        </Box>
      ) : (
        <>
          <Stack spacing={2.5} sx={{ maxHeight: '70vh', overflowY: 'auto', px: 2.5, py: 2 }}>
            <Box>
              <Box component="label" sx={labelSx}>Student</Box>
              {!student ? (
                <>
                  <Box sx={{ ...searchBoxSx, mb: 1 }}>
                    <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                    <InputBase
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search student..."
                      sx={{ flex: 1, fontSize: 14 }}
                    />
                  </Box>
                  <Box component="ul" sx={listBoxSx}>
                    {filteredStudents.map((s) => (
                      <Box component="li" key={s.row_id || s.id} sx={{ borderBottom: '1px solid #F1F5F9', '&:last-of-type': { borderBottom: 'none' } }}>
                        <Box component="button" type="button" onClick={() => setStudent(s)} sx={listBtnSx}>
                          <StudentThumb student={s} />
                          <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: brand.navy }}>{s.name}</Typography>
                        </Box>
                      </Box>
                    ))}
                    {!filteredStudents.length && (
                      <Box component="li" sx={{ px: 1.5, py: 2, textAlign: 'center', fontSize: 12, color: '#64748B' }}>No students</Box>
                    )}
                  </Box>
                </>
              ) : (
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderRadius: 1, border: '1px solid #E2E8F0', px: 1.5, py: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <StudentThumb student={student} />
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{student.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>{student.student_code || student.id}</Typography>
                    </Box>
                  </Stack>
                  {!initialStudent && (
                    <IconButton size="small" onClick={() => setStudent(null)} aria-label="Clear student" sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Stack>
              )}
            </Box>

            <Box>
              <Box component="label" sx={labelSx}>Discipline case / mark</Box>
              <Box sx={{ ...searchBoxSx, mb: 1 }}>
                <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                <InputBase
                  value={markSearch}
                  onChange={(e) => setMarkSearch(e.target.value)}
                  placeholder="Search cases from Student Discipline..."
                  sx={{ flex: 1, fontSize: 14 }}
                />
              </Box>
              {catalogueLoading ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 2, fontSize: 14, color: '#64748B' }}>
                  <CircularProgress size={16} /> <Box component="span">Loading marks...</Box>
                </Stack>
              ) : catalogueError ? (
                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ fontSize: 14, color: '#92400E' }}>
                  <WarningAmberIcon sx={{ mt: 0.25, fontSize: 16, flexShrink: 0 }} />
                  <Box component="span">{catalogueError}</Box>
                </Stack>
              ) : (
                <Box component="ul" sx={{ ...listBoxSx, maxHeight: 144 }}>
                  {filteredMarks.map((m) => (
                    <Box component="li" key={m.id} sx={{ borderBottom: '1px solid #F1F5F9', '&:last-of-type': { borderBottom: 'none' } }}>
                      <Box component="button" type="button" onClick={() => addMark(m)} sx={{ ...listBtnSx, justifyContent: 'space-between' }}>
                        <Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 500, color: brand.navy }}>{m.name}</Typography>
                          <Typography sx={{ fontSize: 12, color: '#64748B' }}>{m.category}</Typography>
                        </Box>
                        <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: signedPoints(m) >= 0 ? '#059669' : '#DC2626' }}>
                          {signedPoints(m) > 0 ? '+' : ''}{signedPoints(m)}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                  {!filteredMarks.length && (
                    <Box component="li" sx={{ px: 1.5, py: 2, textAlign: 'center', fontSize: 12, color: '#64748B' }}>No matching marks</Box>
                  )}
                </Box>
              )}
            </Box>

            {rows.length > 0 && (
              <Box sx={{ borderRadius: 1, border: '1px solid #E2E8F0', bgcolor: 'rgba(248,250,252,0.8)', p: 1.5 }}>
                <Typography sx={{ mb: 1, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>Selected</Typography>
                <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                  {rows.map((r) => (
                    <Stack component="li" key={r.id} direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ fontSize: 14 }}>
                      <Box component="span" sx={{ fontWeight: 500, color: brand.navy }}>{r.name}</Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton size="small" onClick={() => updateQty(r.id, -1)} sx={{ border: '1px solid #E2E8F0', borderRadius: 1, p: 0.25 }}>
                          <RemoveIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                        <Box component="span" sx={{ width: 24, textAlign: 'center', fontWeight: 600 }}>{r.qty}</Box>
                        <IconButton size="small" onClick={() => updateQty(r.id, 1)} sx={{ border: '1px solid #E2E8F0', borderRadius: 1, p: 0.25 }}>
                          <AddIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                        <Box component="span" sx={{ width: 40, textAlign: 'right', fontWeight: 700, color: r.impact >= 0 ? '#059669' : '#DC2626' }}>{r.impact * r.qty}</Box>
                        <IconButton size="small" onClick={() => removeRow(r.id)} aria-label="Remove" sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}>
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
                <Typography sx={{ mt: 1.5, borderTop: '1px solid #E2E8F0', pt: 1, fontSize: 14, fontWeight: 600, color: brand.navy }}>
                  Net points:{' '}
                  <Box component="span" sx={{ color: totalPoints >= 0 ? '#059669' : '#DC2626' }}>
                    {totalPoints > 0 ? '+' : ''}{totalPoints}
                  </Box>
                </Typography>
              </Box>
            )}

            <Box>
              <Box component="label" sx={labelSx}>Notes (optional)</Box>
              <Box
                component="textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Context for this case..."
                sx={{ width: '100%', borderRadius: 1, border: '1px solid #E2E8F0', px: 1.5, py: 1, fontSize: 14, fontFamily: 'inherit', outline: 'none', '&:focus': { borderColor: brand.primary } }}
              />
            </Box>

            {submitError && (
              <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ borderRadius: 1, border: '1px solid #FECACA', bgcolor: '#FEF2F2', px: 1.5, py: 1, fontSize: 14, color: '#991B1B' }}>
                <WarningAmberIcon sx={{ mt: 0.25, fontSize: 16, flexShrink: 0 }} />
                <Box component="span">{submitError}</Box>
              </Stack>
            )}
          </Stack>

          <Box sx={{ borderTop: '1px solid #E2E8F0', px: 2.5, py: 2 }}>
            <Button
              type="button"
              fullWidth
              disabled={!canSubmit}
              onClick={handleSubmit}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
              sx={{ py: 1.5, borderRadius: 1, bgcolor: brand.primary, color: brand.navy, fontSize: 14, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: brand.primaryStrong }, '&.Mui-disabled': { opacity: 0.5 } }}
            >
              {submitting ? 'Saving...' : 'Record & notify parent (KR + EN)'}
            </Button>
          </Box>
        </>
      )}
    </Dialog>
  );
}

function StudentThumb({ student }) {
  const [broken, setBroken] = useState(false);
  const src = resolveStudentPhotoUrl(student?.student_photo_url);
  useEffect(() => setBroken(false), [src]);
  if (src && !broken) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        onError={() => setBroken(true)}
        sx={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E2E8F0', objectFit: 'cover' }}
      />
    );
  }
  return (
    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(19,33,61,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: brand.navy }}>
      {studentInitials(student?.name)}
    </Box>
  );
}

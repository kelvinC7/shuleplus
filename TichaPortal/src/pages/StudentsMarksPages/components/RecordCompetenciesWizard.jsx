import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { brand } from '../../../theme/theme';
import {
  fetchTeachingAssignments,
  fetchCompetencyCategories,
  fetchCompetencyRatings,
  saveCompetencyRatings,
} from '../../../services/marksApi.js';

const STEPS = ['Class assignment', 'Academic period', 'Rate competencies'];

const RATING_DEFAULT = 'Good';

export default function RecordCompetenciesWizard({ open, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [termOptions, setTermOptions] = useState([]);
  const [term, setTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [categories, setCategories] = useState([]);
  const [ratingLevels, setRatingLevels] = useState([]);
  const [students, setStudents] = useState([]);
  const [ratings, setRatings] = useState({});

  const classOptions = useMemo(() => {
    const set = new Set(assignments.map((a) => a.class_name));
    return Array.from(set).sort();
  }, [assignments]);

  const reset = useCallback(() => {
    setStep(0);
    setSelectedClass('');
    setStudents([]);
    setRatings({});
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    (async () => {
      setLoading(true);
      try {
        const res = await fetchTeachingAssignments();
        const data = res?.data || {};
        setAssignments(data.assignments || []);
        setAcademicYear(data.academic_year || '');
        setAcademicYearOptions(data.academic_years || []);
        setTerm(data.term || '');
        setTermOptions(data.terms || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, reset]);

  const loadRatingsGrid = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, ratingRes] = await Promise.all([
        fetchCompetencyCategories(),
        fetchCompetencyRatings({
          class_name: selectedClass,
          academic_year: academicYear,
          term,
        }),
      ]);
      const cats = catRes?.data?.categories || [];
      const levels = catRes?.data?.rating_levels || [];
      const stu = ratingRes?.data?.students || [];
      const existing = ratingRes?.data?.ratings || {};
      setCategories(cats);
      setRatingLevels(levels.length ? levels : ['Excellent', 'Very Good', 'Good', 'Needs Improvement']);
      setStudents(stu);
      const grid = {};
      for (const s of stu) {
        grid[s.id] = {};
        for (const c of cats) {
          grid[s.id][c.id] = existing[s.id]?.[c.id] || RATING_DEFAULT;
        }
      }
      setRatings(grid);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load competency data');
    } finally {
      setLoading(false);
    }
  };

  const setRating = (studentId, categoryId, value) => {
    setRatings((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [categoryId]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = [];
      for (const s of students) {
        for (const c of categories) {
          payload.push({
            student_id: s.id,
            category_id: c.id,
            rating: ratings[s.id]?.[c.id] || RATING_DEFAULT,
          });
        }
      }
      await saveCompetencyRatings({
        class_name: selectedClass,
        academic_year: academicYear,
        term,
        ratings: payload,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save ratings');
    } finally {
      setSaving(false);
    }
  };

  const selectSx = { width: '100%', px: 1.5, py: 1, borderRadius: 1.5, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'inherit', color: '#0F172A', bgcolor: '#fff', outline: 'none' };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F1F5F9' }}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6 }}>Competency analysis</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: brand.navy }}>{STEPS[step]}</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" sx={{ borderRadius: 1, '&:hover': { bgcolor: '#F1F5F9' } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {error && <Box sx={{ mb: 2, borderRadius: 1.5, bgcolor: '#FEF2F2', px: 1.5, py: 1, fontSize: 14, color: '#DC2626' }}>{error}</Box>}
        {loading && step < 2 && (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} sx={{ color: '#94A3B8' }} /></Box>
        )}

        {step === 0 && !loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {classOptions.map((cn) => (
              <Box
                component="button"
                type="button"
                key={cn}
                onClick={() => setSelectedClass(cn)}
                sx={{
                  textAlign: 'left',
                  p: 2,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: selectedClass === cn ? brand.navy : '#F1F5F9',
                  bgcolor: selectedClass === cn ? '#FFFBEB' : 'transparent',
                  cursor: 'pointer',
                  transition: 'border-color .15s, background-color .15s',
                  '&:hover': { borderColor: selectedClass === cn ? brand.navy : '#E2E8F0' },
                }}
              >
                <Typography sx={{ fontWeight: 600, color: brand.navy }}>{cn}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 12, color: '#64748B' }}>Your assigned class</Typography>
              </Box>
            ))}
            {!classOptions.length && <Typography sx={{ gridColumn: '1 / -1', fontSize: 14, color: '#64748B' }}>No class assignments found.</Typography>}
          </Box>
        )}

        {step === 1 && (
          <Stack spacing={2} sx={{ maxWidth: 448 }}>
            <Box>
              <Typography component="label" sx={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>Academic year</Typography>
              <Box component="select" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} sx={{ ...selectSx, mt: 0.5 }}>
                {(academicYearOptions.length ? academicYearOptions : [academicYear]).filter(Boolean).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography component="label" sx={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>Term</Typography>
              <Box component="select" value={term} onChange={(e) => setTerm(e.target.value)} sx={{ ...selectSx, mt: 0.5 }}>
                {(termOptions.length ? termOptions : [term]).filter(Boolean).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Box>
            </Box>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>Class: <Box component="strong" sx={{ color: brand.navy }}>{selectedClass}</Box></Typography>
          </Stack>
        )}

        {step === 2 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 640, fontSize: 14, borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr" sx={{ borderBottom: '1px solid #F1F5F9', fontSize: 10, textTransform: 'uppercase', color: '#94A3B8' }}>
                  <Box component="th" sx={{ textAlign: 'left', py: 1, pr: 1.5, fontWeight: 500 }}>Student</Box>
                  {categories.map((c) => (
                    <Box component="th" key={c.id} sx={{ textAlign: 'center', px: 1, py: 1, whiteSpace: 'nowrap', fontWeight: 500 }}>{c.name}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {students.map((s) => (
                  <Box component="tr" key={s.id} sx={{ borderBottom: '1px solid #F8FAFC' }}>
                    <Box component="td" sx={{ py: 1, pr: 1.5, fontWeight: 500, color: brand.navy }}>
                      {s.first_name} {s.last_name}
                    </Box>
                    {categories.map((c) => (
                      <Box component="td" key={c.id} sx={{ px: 1, py: 1 }}>
                        <Box
                          component="select"
                          value={ratings[s.id]?.[c.id] || RATING_DEFAULT}
                          onChange={(e) => setRating(s.id, c.id, e.target.value)}
                          sx={{ width: '100%', fontSize: 12, px: 1, py: 0.75, borderRadius: 1.5, border: '1px solid #E2E8F0', bgcolor: '#fff', outline: 'none' }}
                        >
                          {ratingLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderTop: '1px solid #F1F5F9', bgcolor: 'rgba(248,250,252,0.5)' }}>
        <Button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          sx={{ px: 2, py: 1, fontSize: 14, color: '#475569', textTransform: 'none', '&.Mui-disabled': { opacity: 0.4 } }}
        >
          Back
        </Button>
        {step < 2 ? (
          <Button
            type="button"
            disabled={step === 0 && !selectedClass}
            onClick={() => (step === 0 ? setStep(1) : loadRatingsGrid())}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            sx={{ px: 2.5, py: 1.25, borderRadius: 1.5, bgcolor: brand.navy, color: '#fff', fontSize: 14, fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: '#24396A' }, '&.Mui-disabled': { opacity: 0.5 } }}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
            sx={{ px: 2.5, py: 1.25, borderRadius: 1.5, bgcolor: brand.navy, color: '#fff', fontSize: 14, fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: '#24396A' }, '&.Mui-disabled': { opacity: 0.5 } }}
          >
            Save competencies
          </Button>
        )}
      </Stack>
    </Dialog>
  );
}
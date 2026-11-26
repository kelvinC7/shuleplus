import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  enterAssessmentMarks,
  fetchAssessment,
  fetchAssessmentMarks,
  fetchClassStudents,
  fetchGradingScale,
  fetchSchoolProfile,
  fetchCourseDefaultMarks,
  tpApiError,
} from '../services/teacherPortalApi';
import { exportAssessmentMarksPdf } from '../utils/exportAssessmentMarksPdf.js';
import { submitAssessmentMarks, fetchAssessmentActivity, fetchMyCorrectionRequests } from '../services/coursesMarksApi.js';
import RequestEditModal from './coursesMarks/RequestEditModal.jsx';
import AssessmentFormSheet from './assessments/AssessmentFormSheet';
import { useTpToast } from '../components/TpToast.jsx';
import {
  assessmentMaxMark,
  canEditMarks,
  gradeFromScale,
  inferAcademicLevel,
  isLockedStatus,
  markScoreValidationError,
  parseMarkScore,
} from './coursesMarks/statusUtils.js';
import { buildPerformanceStats, collectScoredRows } from '../utils/assessmentPerformance.js';
import AssessmentPerformancePanel from './AssessmentPerformancePanel.jsx';
import { brand } from '../theme/theme';

const BANNER_SX = {
  submitted: { bgcolor: '#FFFBEB', color: '#78350F', border: '1px solid #FDE68A' },
  locked: { bgcolor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' },
  edit_pending: { bgcolor: '#FEFCE8', color: '#713F12', border: '1px solid #FEF08A' },
};

function StatusBanner({ status, correction }) {
  const ui = correction?.status === 'PENDING' ? 'edit_pending' : correction?.status === 'REJECTED' ? 'locked' : null;
  const key = ui || (String(status || 'DRAFT').toUpperCase() === 'SUBMITTED' ? 'submitted' : isLockedStatus(status) ? 'locked' : 'draft');

  if (key === 'draft') return null;

  return (
    <Box sx={{ ...BANNER_SX[key], borderRadius: 2, px: 2, py: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      <LockOutlinedIcon sx={{ fontSize: 18, mt: 0.25, flexShrink: 0 }} />
      <Box>
        {correction?.status === 'PENDING' ? (
          <>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Edit request pending</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12, opacity: 0.8 }}>
              Your request is waiting for Academic review.
            </Typography>
          </>
        ) : null}
        {correction?.status === 'REJECTED' ? (
          <>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Edit request rejected</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12, opacity: 0.8 }}>
              {correction.reviewNotes || 'Contact your marks administrator.'}
            </Typography>
          </>
        ) : null}
        {!correction && isLockedStatus(status) ? (
          <>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>These marks have been submitted</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12, opacity: 0.8 }}>
              Direct editing is blocked. Use Request Edit if a correction is needed.
            </Typography>
          </>
        ) : null}
      </Box>
    </Box>
  );
}

export default function AssessmentMarks() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const [pdfScoreMode, setPdfScoreMode] = useState('entered');
  const [courseDefaultTotal, setCourseDefaultTotal] = useState(null);
  const [gradingScale, setGradingScale] = useState([]);
  const toast = useTpToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('marks');
  const [activity, setActivity] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [assessmentEditOpen, setAssessmentEditOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const inputRefs = useRef([]);
  const saveTimer = useRef(null);

  const maxMark = assessmentMaxMark(assessment);
  const locked = isLockedStatus(assessment?.status);
  const editable = canEditMarks(assessment?.status, assessment?.correction_request);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, marksPayload, actRes, corrRes] = await Promise.all([
        fetchAssessment(id),
        fetchAssessmentMarks(id).catch(() => null),
        fetchAssessmentActivity(id).catch(() => ({ data: { events: [] } })),
        fetchMyCorrectionRequests().catch(() => ({ data: { rows: [] } })),
      ]);
      const correction = (corrRes?.data?.rows || []).find((c) => c.assessmentId === id) || null;
      setAssessment({ ...a, correction_request: correction });
      setActivity(actRes?.data?.events || actRes?.events || []);

      const level = inferAcademicLevel(a);
      try {
        setGradingScale(await fetchGradingScale(level));
      } catch {
        setGradingScale([]);
      }

      const existingList = Array.isArray(marksPayload?.marks)
        ? marksPayload.marks
        : Array.isArray(marksPayload)
          ? marksPayload
          : [];

      let studentList = [];
      const className = a.class ? [a.class.name, a.class.stream].filter(Boolean).join(' ') : undefined;
      const classId = a.classId || a.class?.id;
      if (classId || className) {
        try {
          studentList = await fetchClassStudents(classId || className, className, a.academicYear);
          if (!studentList.length && className && classId && classId !== className) {
            studentList = await fetchClassStudents(className, className, a.academicYear);
          }
        } catch {
          studentList = [];
        }
      }
      // Always show the marks roster in ascending alphabetical order (A–Z).
      const sortedStudents = (Array.isArray(studentList) ? studentList : []).sort((x, y) => {
        const nameOrder = String(x.fullName || x.name || '').localeCompare(
          String(y.fullName || y.name || ''),
          undefined,
          { sensitivity: 'base', numeric: true },
        );
        if (nameOrder) return nameOrder;
        return String(x.studentCode || x.adm || '').localeCompare(
          String(y.studentCode || y.adm || ''),
          undefined,
          { sensitivity: 'base', numeric: true },
        );
      });
      setStudents(sortedStudents);

      const next = {};
      for (const m of existingList) {
        next[m.studentId] = {
          studentId: m.studentId,
          score: m.score != null ? String(m.score) : '',
          markStatus: m.markStatus || 'PRESENT',
        };
      }
      for (const s of studentList) {
        if (!next[s.id]) next[s.id] = { studentId: s.id, score: '', markStatus: 'PRESENT' };
      }
      setEntries(next);

      const subj = a.subject?.name || a.subjectName;
      const cn = className;
      if (subj && a.academicYear && a.term) {
        try {
          const dcm = await fetchCourseDefaultMarks({
            class_name: cn,
            class_id: classId || a.classId,
            subject_name: subj,
            academic_year: a.academicYear,
            term: a.term,
          });
          setCourseDefaultTotal(dcm?.defaultCourseMarks ?? null);
        } catch {
          setCourseDefaultTotal(null);
        }
      } else {
        setCourseDefaultTotal(null);
      }
    } catch (err) {
      toast.error(tpApiError(err, 'Could not load assessment'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.fullName?.toLowerCase().includes(q) || s.studentCode?.toLowerCase().includes(q));
  }, [students, search]);

  const markIssues = useMemo(() => {
    const invalid = [];
    for (const s of students) {
      const e = entries[s.id];
      if (e?.markStatus !== 'PRESENT') continue;
      const score = parseMarkScore(e?.score);
      if (score == null) {
        if (e?.score !== '' && e?.score != null) {
          invalid.push({ studentId: s.id, studentName: s.fullName, message: 'Enter a valid number.' });
        }
        continue;
      }
      const message = markScoreValidationError(score, maxMark);
      if (message) invalid.push({ studentId: s.id, studentName: s.fullName, message });
    }
    return invalid;
  }, [students, entries, maxMark]);

  const stats = useMemo(() => {
    let entered = 0;
    let missing = 0;
    let total = 0;
    const invalidIds = new Set(markIssues.map((i) => i.studentId));
    for (const s of students) {
      const e = entries[s.id];
      if (e?.markStatus !== 'PRESENT') continue;
      const score = parseMarkScore(e?.score);
      if (score != null && !invalidIds.has(s.id)) {
        entered += 1;
        total += score;
      } else if (e?.score === '' || e?.score == null) {
        missing += 1;
      }
    }
    return {
      totalStudents: students.length,
      entered,
      missing,
      invalid: markIssues.length,
      average: entered > 0 ? Math.round((total / entered) * 10) / 10 : null,
    };
  }, [students, entries, markIssues]);

  const performance = useMemo(() => {
    const invalidIds = new Set(markIssues.map((i) => i.studentId));
    const scored = collectScoredRows(students, entries, maxMark, invalidIds);
    return buildPerformanceStats(scored, gradingScale);
  }, [students, entries, maxMark, markIssues, gradingScale]);

  function assertMarksValid() {
    if (!markIssues.length) return true;
    const first = markIssues[0];
    const extra = markIssues.length > 1 ? ` (${markIssues.length} students have scores to fix)` : '';
    toast.error(`${first.studentName}: ${first.message}${extra}`);
    return false;
  }

  function updateEntry(studentId, patch) {
    if (!editable) return;
    setEntries((prev) => ({ ...prev, [studentId]: { ...prev[studentId], studentId, ...patch } }));
  }

  const buildMarksPayload = () =>
    students.map((s) => {
      const e = entries[s.id] || {};
      return {
        studentId: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        score: e.score === '' || e.score == null ? undefined : Number(e.score),
        markStatus: e.markStatus || 'PRESENT',
      };
    });

  async function handleSaveDraft() {
    if (!assertMarksValid()) return;
    setSaving(true);
    try {
      await enterAssessmentMarks(id, buildMarksPayload());
      toast.success('Draft saved');
      setLastSaved(new Date());
    } catch (err) {
      toast.error(tpApiError(err, 'Could not save marks'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf(mode = pdfScoreMode) {
    if (!students.length) {
      toast.error('No students to export.');
      return;
    }
    if (mode === 'converted' && !courseDefaultTotal) {
      toast.error('No course total set in Academic → Courses for this class and subject.');
      return;
    }
    setDownloading(true);
    try {
      let school = null;
      try {
        school = await fetchSchoolProfile();
      } catch {
        school = { schoolName: 'School' };
      }
      await exportAssessmentMarksPdf({
        school,
        assessment,
        students,
        entries,
        gradingScale,
        scoreMode: mode,
        courseDefaultMax: courseDefaultTotal,
      });
      toast.success('Marks sheet downloaded');
      setDownloadAnchor(null);
    } catch (err) {
      toast.error(tpApiError(err, 'Could not generate PDF'));
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmit() {
    if (!assertMarksValid()) return;
    setSubmitting(true);
    try {
      await enterAssessmentMarks(id, buildMarksPayload());
      const res = await submitAssessmentMarks(id);
      if (!res?.success && res?.submitted !== true) throw new Error(res?.message || 'Submit failed');
      toast.success('Marks submitted for review');
      await load();
    } catch (err) {
      toast.error(tpApiError(err, 'Could not submit marks'));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!editable || loading || markIssues.length) return undefined;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      enterAssessmentMarks(id, buildMarksPayload()).then(() => setLastSaved(new Date())).catch(() => {});
    }, 8000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [entries, editable, id, loading, students, markIssues.length]);

  function focusRow(idx) {
    inputRefs.current[idx]?.focus();
  }

  if (loading) {
    return (
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ py: 10 }}>
        <CircularProgress size={20} sx={{ color: brand.navy }} />
        <Typography sx={{ fontSize: 13, color: 'rgba(19,33,61,0.5)' }}>Loading marks workspace…</Typography>
      </Stack>
    );
  }

  const classLabel = assessment?.class ? [assessment.class.name, assessment.class.stream].filter(Boolean).join(' ') : '';
  const componentLabel = assessment?.component?.name || assessment?.title || 'Assessment';

  const statusTone =
    String(assessment?.status || '').toUpperCase() === 'OPEN' || String(assessment?.status || '').toUpperCase() === 'MARK_ENTRY'
      ? 'Scheduled · Approved'
      : assessment?.status;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', pb: 6 }}>
      {/* Sticky tabs — full width, square */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 22,
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(19,33,61,0.08)',
          display: 'flex',
        }}
      >
        {[
          { id: 'marks', label: 'Marks' },
          { id: 'performance', label: 'Performance' },
          { id: 'activity', label: 'Activity' },
        ].map((t) => (
          <Button
            key={t.id}
            onClick={() => setTab(t.id)}
            sx={{
              flex: 1,
              borderRadius: 0,
              py: 1.15,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.01em',
              borderBottom: tab === t.id ? `2px solid ${brand.navy}` : '2px solid transparent',
              color: tab === t.id ? brand.navy : 'rgba(19,33,61,0.45)',
              bgcolor: tab === t.id ? 'rgba(19,33,61,0.03)' : 'transparent',
              textTransform: 'none',
              minWidth: 0,
              '&:hover': { color: brand.navy, bgcolor: 'rgba(19,33,61,0.04)' },
            }}
          >
            {t.label}
          </Button>
        ))}
      </Box>

      {/* Sticky plain search under tabs (marks only) */}
      {tab === 'marks' ? (
        <Box
          sx={{
            position: 'sticky',
            top: 40,
            zIndex: 20,
            bgcolor: '#fff',
            borderBottom: '1px solid rgba(19,33,61,0.08)',
            px: 1.5,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <SearchIcon sx={{ fontSize: 16, color: 'rgba(19,33,61,0.3)', mr: 1, flexShrink: 0 }} />
          <Box
            component="input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            sx={{
              width: '100%',
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              py: 0.75,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
              color: brand.navy,
              '&::placeholder': { color: 'rgba(19,33,61,0.35)', fontWeight: 500 },
            }}
          />
        </Box>
      ) : null}

      <Stack spacing={2} sx={{ p: { xs: 1.25, md: 2, lg: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: brand.navy }}>
              {assessment?.subject?.name || 'Course'}
              <Box component="span" sx={{ color: 'rgba(19,33,61,0.35)' }}>{' · '}</Box>
              {classLabel || 'Class'}
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12, color: 'rgba(19,33,61,0.45)' }}>
              {componentLabel} · Max {maxMark}
              {assessment?.assessmentCode ? ` · ${assessment.assessmentCode}` : ''}
              {' · '}{statusTone}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap', rowGap: 1 }}
          >
            {editable ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setAssessmentEditOpen(true)}
                  startIcon={<EditOutlinedIcon />}
                  sx={{ textTransform: 'none', fontWeight: 600, flex: { xs: 1, sm: 'unset' } }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={saving}
                  onClick={() => void handleSaveDraft()}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                  sx={{ textTransform: 'none', fontWeight: 600, flex: { xs: 1, sm: 'unset' } }}
                >
                  Save draft
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled={submitting || stats.entered === 0}
                  onClick={() => void handleSubmit()}
                  startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, flex: { xs: 1, sm: 'unset' } }}
                >
                  Submit marks
                </Button>
              </>
            ) : null}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Button
                variant="contained"
                size="small"
                fullWidth
                disabled={!students.length || downloading}
                onClick={(e) => setDownloadAnchor(e.currentTarget)}
                startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                endIcon={<ExpandMoreIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: brand.navy,
                  color: '#fff',
                  '&:hover': { bgcolor: '#1B2D52' },
                }}
              >
                PDF
              </Button>
              <Menu
                anchorEl={downloadAnchor}
                open={Boolean(downloadAnchor)}
                onClose={() => setDownloadAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { mt: 0.5, width: 288, p: 1.5, borderRadius: 2 } }}
              >
                <Box sx={{ px: 0.5, py: 0.5 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
                    Score format
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={pdfScoreMode}
                    onChange={(e) => setPdfScoreMode(e.target.value)}
                    sx={{ mt: 1 }}
                  >
                    <MenuItem value="entered">As entered (out of {maxMark})</MenuItem>
                    <MenuItem value="converted" disabled={!courseDefaultTotal}>
                      {courseDefaultTotal
                        ? `Converted (out of ${courseDefaultTotal})`
                        : 'Converted (set total in Academic Courses)'}
                    </MenuItem>
                  </TextField>
                  <Typography sx={{ mt: 1, fontSize: 11, lineHeight: 1.4, color: brand.muted }}>
                    {pdfScoreMode === 'entered'
                      ? `PDF lists students highest to lowest with score / ${maxMark}, %, and grade.`
                      : courseDefaultTotal
                        ? `PDF lists students highest to lowest with course score / ${courseDefaultTotal} (quiz marks shown under each row).`
                        : 'Ask Academic to set the course total under Courses → Course catalog.'}
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={downloading}
                    onClick={() => void handleDownloadPdf(pdfScoreMode)}
                    startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                    sx={{ mt: 1.5, fontWeight: 700 }}
                  >
                    Download now
                  </Button>
                </Box>
              </Menu>
            </Box>

            {locked ? (
              <Button
                variant="contained"
                size="small"
                onClick={() => setEditOpen(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  flex: 1,
                  bgcolor: brand.primary,
                  color: brand.navy,
                  '&:hover': { bgcolor: brand.primaryStrong },
                }}
              >
                Request edit
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <StatusBanner status={assessment?.status} correction={assessment?.correction_request} />

        {markIssues.length > 0 && editable ? (
          <Alert severity="error" sx={{ borderRadius: 1.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Some scores are outside the allowed range</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12, lineHeight: 1.5 }}>
              This assessment is marked out of <strong>{maxMark}</strong>. Adjust highlighted scores before saving or submitting.
              {markIssues.length === 1
                ? ` ${markIssues[0].studentName}: ${markIssues[0].message}`
                : ` ${markIssues.length} students need corrections.`}
            </Typography>
          </Alert>
        ) : null}

        {lastSaved && editable ? (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#94A3B8' }}>
            <AccessTimeIcon sx={{ fontSize: 12 }} />
            <Typography sx={{ fontSize: 11 }}>Auto-saved {lastSaved.toLocaleTimeString()}</Typography>
          </Stack>
        ) : null}

        {tab === 'performance' ? (
          <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(19,33,61,0.08)', overflow: 'hidden' }}>
            <AssessmentPerformancePanel performance={performance} maxMark={maxMark} />
          </Paper>
        ) : tab === 'activity' ? (
          <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(19,33,61,0.08)', p: 2.5 }}>
            <Stack spacing={1.5}>
              {activity.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: brand.muted }}>No activity recorded yet.</Typography>
              ) : (
                activity.map((ev, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    spacing={1.5}
                    sx={{ pb: 1.5, borderBottom: i < activity.length - 1 ? `1px solid ${brand.border}` : 'none' }}
                  >
                    <Box sx={{ mt: 1, width: 8, height: 8, borderRadius: '50%', bgcolor: brand.primary, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 13.5 }}>{ev.label}</Typography>
                      {ev.detail ? (
                        <Typography sx={{ mt: 0.25, fontSize: 12, color: brand.muted }}>{ev.detail}</Typography>
                      ) : null}
                      <Typography sx={{ mt: 0.5, fontSize: 10, color: '#94A3B8' }}>
                        {ev.at ? new Date(ev.at).toLocaleString() : ''}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Stack>
          </Paper>
        ) : (
          <>
            {/* Stats live under Marks tab only */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.25 }}>
              {[
                { label: 'Students', value: stats.totalStudents },
                { label: 'Entered', value: stats.entered },
                { label: 'Missing', value: stats.missing },
                { label: 'Average', value: stats.average != null ? `${stats.average}/${maxMark}` : '-' },
              ].map((s) => (
                <Box
                  key={s.label}
                  sx={{
                    px: 1.75,
                    py: 1.5,
                    minHeight: 84,
                    borderRadius: 0,
                    bgcolor: brand.navy,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 10px -4px rgba(0,0,0,0.2)',
                  }}
                >
                  <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.72)' }}>
                    {s.label}
                  </Typography>
                  <Typography sx={{ mt: 0.75, fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#fff', lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Paper
              component="section"
              elevation={0}
              sx={{ borderRadius: 2, border: '1px solid rgba(19,33,61,0.08)', bgcolor: '#fff', overflow: 'hidden' }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>Students</Typography>
                <Box
                  component="span"
                  sx={{
                    ml: 'auto',
                    borderRadius: 999,
                    bgcolor: '#F1F5F9',
                    px: 1,
                    py: 0.25,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#64748B',
                  }}
                >
                  {filtered.length}
                </Box>
              </Stack>

              {students.length === 0 ? (
                <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 500, color: brand.navy }}>
                    No students loaded for this class
                  </Typography>
                  <Typography sx={{ mx: 'auto', mt: 0.5, maxWidth: 384, fontSize: 12, color: brand.muted }}>
                    Check that Student Management has active students in {classLabel || 'this class'} for{' '}
                    {assessment?.academicYear || 'this year'}.
                  </Typography>
                </Box>
              ) : isMobile ? (
                <Stack spacing={1} sx={{ p: 1.25 }}>
                  {filtered.map((s, idx) => {
                    const e = entries[s.id] || {};
                    const scoreNum = parseMarkScore(e.score);
                    const scoreError = scoreNum != null ? markScoreValidationError(scoreNum, maxMark) : null;
                    const invalid = Boolean(scoreError);
                    const grade = invalid ? null : gradeFromScale(scoreNum, maxMark, gradingScale);
                    const missing = e.markStatus === 'PRESENT' && (e.score === '' || e.score == null) && !invalid;
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          border: '1px solid rgba(19,33,61,0.08)',
                          borderRadius: 2,
                          bgcolor: '#fff',
                          px: 1.5,
                          py: 1.25,
                          boxShadow: '0 1px 2px rgba(19,33,61,0.04)',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography noWrap sx={{ fontWeight: 700, fontSize: 13.5, color: brand.navy }}>
                              {s.fullName}
                            </Typography>
                            <Typography sx={{ mt: 0.1, fontSize: 11, color: '#94A3B8' }}>
                              {idx + 1}. {s.studentCode || '—'}
                            </Typography>
                          </Box>
                          {editable ? (
                            <TextField
                              inputRef={(el) => {
                                inputRefs.current[idx] = el;
                              }}
                              type="number"
                              size="small"
                              value={e.score ?? ''}
                              onChange={(ev) => updateEntry(s.id, { score: ev.target.value })}
                              error={invalid}
                              onKeyDown={(ev) => {
                                if (ev.key === 'ArrowDown' || ev.key === 'Enter') {
                                  ev.preventDefault();
                                  focusRow(idx + 1);
                                }
                                if (ev.key === 'ArrowUp') {
                                  ev.preventDefault();
                                  focusRow(idx - 1);
                                }
                              }}
                              inputProps={{ min: 0, max: maxMark, step: 'any', 'aria-invalid': invalid }}
                              sx={{
                                flexShrink: 0,
                                width: 92,
                                '& .MuiOutlinedInput-input': {
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontVariantNumeric: 'tabular-nums',
                                  py: 1,
                                  fontSize: 15,
                                },
                              }}
                            />
                          ) : (
                            <Typography
                              sx={{
                                flexShrink: 0,
                                minWidth: 52,
                                textAlign: 'right',
                                fontWeight: 800,
                                fontSize: 17,
                                fontVariantNumeric: 'tabular-nums',
                                color: brand.navy,
                              }}
                            >
                              {scoreNum ?? '-'}
                              <Box component="span" sx={{ ml: 0.25, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
                                /{maxMark}
                              </Box>
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              minWidth: 28,
                              justifyContent: 'center',
                              borderRadius: 1,
                              bgcolor: '#F1F5F9',
                              px: 0.75,
                              py: 0.2,
                              fontSize: 12,
                              fontWeight: 700,
                              color: brand.navy,
                            }}
                          >
                            {grade || '-'}
                          </Box>
                          {invalid ? (
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#B91C1C' }}>Fix score</Typography>
                          ) : missing ? (
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#B45309' }}>Missing</Typography>
                          ) : scoreNum != null ? (
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#047857' }}>Done</Typography>
                          ) : (
                            <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>{e.markStatus}</Typography>
                          )}
                        </Stack>
                        {invalid && scoreError ? (
                          <Typography sx={{ mt: 0.75, fontSize: 11, fontWeight: 500, color: '#B91C1C' }}>
                            {scoreError}
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <TableContainer>
                  <Table size="small" sx={{ width: '100%', tableLayout: 'auto' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, pl: { xs: 1.5, sm: 2 }, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8', bgcolor: '#F8F9FC', borderBottom: '1px solid rgba(19,33,61,0.08)', width: 36 }}>
                          #
                        </TableCell>
                        <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8', bgcolor: '#F8F9FC', borderBottom: '1px solid rgba(19,33,61,0.08)' }}>
                          Student
                        </TableCell>
                        <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8', bgcolor: '#F8F9FC', borderBottom: '1px solid rgba(19,33,61,0.08)', whiteSpace: 'nowrap' }}>
                          Score/{maxMark}
                        </TableCell>
                        <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8', bgcolor: '#F8F9FC', borderBottom: '1px solid rgba(19,33,61,0.08)' }}>
                          Grade
                        </TableCell>
                        <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, pr: { xs: 1.5, sm: 2 }, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8', bgcolor: '#F8F9FC', borderBottom: '1px solid rgba(19,33,61,0.08)' }}>
                          Status
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((s, idx) => {
                        const e = entries[s.id] || {};
                        const scoreNum = parseMarkScore(e.score);
                        const scoreError = scoreNum != null ? markScoreValidationError(scoreNum, maxMark) : null;
                        const invalid = Boolean(scoreError);
                        const grade = invalid ? null : gradeFromScale(scoreNum, maxMark, gradingScale);
                        const missing = e.markStatus === 'PRESENT' && (e.score === '' || e.score == null) && !invalid;
                        return (
                          <TableRow
                            key={s.id}
                            hover
                            sx={{
                              bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                              '&:last-child td': { borderBottom: 0 },
                            }}
                          >
                            <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, pl: { xs: 1.5, sm: 2 }, fontSize: 12, color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(19,33,61,0.05)' }}>
                              {idx + 1}
                            </TableCell>
                            <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, borderBottom: '1px solid rgba(19,33,61,0.05)', maxWidth: 0, width: '100%' }}>
                              <Typography noWrap sx={{ fontWeight: 600, color: brand.navy, fontSize: { xs: 12, sm: 13 } }}>{s.fullName}</Typography>
                              <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>{s.studentCode}</Typography>
                            </TableCell>
                            <TableCell sx={{ py: 0.75, px: { xs: 1, sm: 1.5 }, borderBottom: '1px solid rgba(19,33,61,0.05)' }}>
                              {editable ? (
                                <Box>
                                  <TextField
                                    inputRef={(el) => {
                                      inputRefs.current[idx] = el;
                                    }}
                                    type="number"
                                    size="small"
                                    value={e.score ?? ''}
                                    onChange={(ev) => updateEntry(s.id, { score: ev.target.value })}
                                    error={invalid}
                                    onKeyDown={(ev) => {
                                      if (ev.key === 'ArrowDown' || ev.key === 'Enter') {
                                        ev.preventDefault();
                                        focusRow(idx + 1);
                                      }
                                      if (ev.key === 'ArrowUp') {
                                        ev.preventDefault();
                                        focusRow(idx - 1);
                                      }
                                    }}
                                    inputProps={{ min: 0, max: maxMark, step: 'any', 'aria-invalid': invalid }}
                                    sx={{
                                      width: 88,
                                      '& .MuiOutlinedInput-input': {
                                        textAlign: 'center',
                                        fontWeight: 600,
                                        fontVariantNumeric: 'tabular-nums',
                                        py: 0.75,
                                        fontSize: 13,
                                      },
                                    }}
                                  />
                                  {invalid && scoreError ? (
                                    <Typography sx={{ mt: 0.35, maxWidth: 160, fontSize: 10, fontWeight: 500, lineHeight: 1.3, color: '#B91C1C' }}>
                                      {scoreError}
                                    </Typography>
                                  ) : null}
                                </Box>
                              ) : (
                                <Typography sx={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: brand.navy }}>
                                  {scoreNum ?? '-'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, borderBottom: '1px solid rgba(19,33,61,0.05)' }}>
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  minWidth: 28,
                                  justifyContent: 'center',
                                  borderRadius: 1,
                                  bgcolor: '#F1F5F9',
                                  px: 0.75,
                                  py: 0.2,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: brand.navy,
                                }}
                              >
                                {grade || '-'}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 0.85, px: { xs: 1, sm: 1.5 }, pr: { xs: 1.5, sm: 2 }, borderBottom: '1px solid rgba(19,33,61,0.05)' }}>
                              {invalid ? (
                                <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#B91C1C' }}>Fix score</Typography>
                              ) : missing ? (
                                <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#B45309' }}>Missing</Typography>
                              ) : scoreNum != null ? (
                                <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#047857' }}>Done</Typography>
                              ) : (
                                <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>{e.markStatus}</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        )}
      </Stack>

      <AssessmentFormSheet
        open={assessmentEditOpen}
        mode="edit"
        assessment={assessment}
        onClose={() => setAssessmentEditOpen(false)}
        onSaved={() => {
          setAssessmentEditOpen(false);
          void load();
        }}
      />

      <RequestEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        assessment={{
          id,
          title: assessment?.title,
          subject: assessment?.subject?.name,
          class_name: classLabel,
          class_id: assessment?.classId || assessment?.class?.id,
          academic_year: assessment?.academicYear,
          max_mark: maxMark,
        }}
        onSuccess={load}
      />
    </Box>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { fetchMarksCenter, patchMarkCell, requestMarkEdit } from '../../../services/marksApi.js';
import { buildFilterParams, gradeTone, markTone } from '../utils/marksCenterUtils.js';
import { exportMarksCenterExcel, exportMarksCenterPdf } from '../utils/marksCenterExport.js';
import RecordMarksWizard from '../components/RecordMarksWizard.jsx';

const NAVY = '#13213D';
const AMBER = '#F5A623';
const MUTED = 'rgba(19,33,61,0.45)';
const BORDER = 'rgba(19,33,61,0.06)';

const selectSx = {
  width: '100%',
  height: 36,
  borderRadius: 2,
  border: '1px solid rgba(0,0,0,0.1)',
  bgcolor: '#fff',
  px: 1.25,
  fontSize: 12,
  fontFamily: 'inherit',
  color: NAVY,
  outline: 'none',
  '&:focus': { boxShadow: '0 0 0 2px rgba(19,33,61,0.15)' },
  '&:disabled': { opacity: 0.5 },
};

const fieldLabelSx = { display: 'block', mb: 0.5, fontSize: 10, fontWeight: 500, color: MUTED };

function FilterSelect({ label, value, onChange, options, disabled }) {
  return (
    <Box sx={{ minWidth: 130, flex: 1 }}>
      <Box component="label" sx={fieldLabelSx}>{label}</Box>
      <Box component="select" value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} sx={selectSx}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Box>
    </Box>
  );
}

function KpiCard({ label, value, suffix = '' }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: { xs: 2.5, lg: 0 }, border: `1px solid ${BORDER}`, bgcolor: '#fff', px: 2, py: 1.5 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 500, color: MUTED }}>{label}</Typography>
      <Typography sx={{ mt: 0.25, fontSize: 18, fontWeight: 600, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
        {value ?? '-'}{suffix && value != null ? suffix : ''}
      </Typography>
    </Paper>
  );
}

const cellBaseSx = { borderColor: BORDER, py: 1.5, px: 2, fontSize: 12 };
const headCellSx = {
  ...cellBaseSx,
  bgcolor: 'rgba(19,33,61,0.03)',
  fontSize: 10,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: MUTED,
  borderBottom: '1px solid rgba(19,33,61,0.06)',
};

const toolBtnSx = {
  gap: 0.75,
  borderRadius: 2,
  border: '1px solid rgba(0,0,0,0.1)',
  px: 1.5,
  py: 1,
  fontSize: 12,
  fontWeight: 500,
  textTransform: 'none',
  color: 'rgba(19,33,61,0.7)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
};

const toneSx = (tone) => ({ color: tone.color, bgcolor: tone.bgcolor });

export default function MarksCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPreset, setWizardPreset] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link: /marks/marks-center?record=1 opens the Record Marks wizard
  useEffect(() => {
    if (!searchParams.get('record')) return;
    setWizardOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('record');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [exporting, setExporting] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [editRequestScore, setEditRequestScore] = useState('');
  const [editRequestReason, setEditRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const fetchSeq = useRef(0);
  const hasLoadedRef = useRef(false);

  const [filters, setFilters] = useState({
    academicYear: '',
    term: '',
    className: '',
    course: '',
    assessmentType: '',
    assessmentId: '',
  });

  const filtersRef = useRef(filters);
  const studentSearchRef = useRef(studentSearch);
  filtersRef.current = filters;
  studentSearchRef.current = studentSearch;

  const syncFiltersFromSelected = useCallback((selected, current) => {
    if (!selected) return current;
    const next = { ...current };
    let changed = false;
    const apply = (key, value) => {
      if (value == null || value === '') return;
      if (next[key] !== value) {
        next[key] = value;
        changed = true;
      }
    };
    if (!current.academicYear) apply('academicYear', selected.academic_year);
    if (!current.term) apply('term', selected.term);
    if (!current.className) apply('className', selected.class_name);
    if (!current.course) apply('course', selected.subject_name);
    return changed ? next : current;
  }, []);

  const load = useCallback(async (studentId = null) => {
    const seq = ++fetchSeq.current;
    if (hasLoadedRef.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchMarksCenter(buildFilterParams(filtersRef.current, studentSearchRef.current, studentId));
      if (seq !== fetchSeq.current) return;
      if (!res?.success) {
        setError(res?.message || 'Failed to load marks center');
        if (!hasLoadedRef.current) setData(null);
        return;
      }
      setData(res.data);
      hasLoadedRef.current = true;
      if (res.data?.selected) {
        setFilters((f) => syncFiltersFromSelected(res.data.selected, f));
      }
      if (studentId && res.data?.student_detail) {
        setSelectedStudent(res.data.student_detail);
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      setError(err?.response?.data?.message || 'Failed to load marks center');
    } finally {
      if (seq === fetchSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [syncFiltersFromSelected]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [
    filters.academicYear,
    filters.term,
    filters.className,
    filters.course,
    filters.assessmentType,
    filters.assessmentId,
    studentSearch,
    load,
  ]);

  const columns = data?.assessment_columns || [];
  const students = data?.students || [];
  const categoryRows = data?.category_averages || [];

  const yearOptions = useMemo(() => {
    const current = data?.filters?.current_academic_year;
    return (data?.filters?.academic_years || []).map((y) => ({
      value: y,
      label: current && y === current ? `${y} (current)` : y,
    }));
  }, [data]);

  const typeOptions = useMemo(() => [
    { value: '', label: 'All types' },
    ...(data?.filters?.assessment_types || []).map((t) => ({ value: t.slug, label: t.name })),
  ], [data]);

  const assessmentOptions = useMemo(() => [
    { value: '', label: 'All assessments' },
    ...(data?.filters?.assessments || []).map((a) => ({ value: String(a.id), label: a.assessment_name })),
  ], [data]);

  const setFilter = (key, value) => {
    setFilters((f) => {
      const next = { ...f, [key]: value };
      if (key === 'academicYear') {
        next.term = '';
        next.className = '';
        next.course = '';
        next.assessmentType = '';
        next.assessmentId = '';
      }
      if (key === 'className') { next.course = ''; next.assessmentType = ''; next.assessmentId = ''; }
      if (key === 'course') { next.assessmentType = ''; next.assessmentId = ''; }
      if (key === 'assessmentType') next.assessmentId = '';
      if (key === 'term') {
        next.className = '';
        next.course = '';
        next.assessmentType = '';
        next.assessmentId = '';
      }
      return next;
    });
  };

  const openStudent = (row) => {
    setSelectedStudent(row);
    load(row.student_id);
  };

  const startEdit = (studentId, assessmentId, current, column) => {
    if (column?.is_locked) {
      setEditRequest({
        studentId,
        assessmentId,
        currentScore: current?.value ?? null,
        maxScore: column.max_score,
        studentName: null,
      });
      setEditRequestScore(current?.value != null ? String(current.value) : '');
      setEditRequestReason('');
      return;
    }
    setEditingCell(`${studentId}:${assessmentId}`);
    setEditValue(current?.mark_code || (current?.value != null ? String(current.value) : ''));
  };

  const submitEditRequest = async () => {
    if (!editRequest || !editRequestReason.trim()) return;
    setSubmittingRequest(true);
    try {
      const res = await requestMarkEdit({
        assessment_id: editRequest.assessmentId,
        student_id: editRequest.studentId,
        current_score: Number(editRequest.currentScore ?? 0),
        requested_score: Number(editRequestScore),
        reason: editRequestReason.trim(),
      });
      if (!res?.success) {
        setError(res?.message || 'Failed to submit edit request');
        return;
      }
      setEditRequest(null);
      setRequestSuccess('Edit request sent - Academic will review and approve or reject.');
      setTimeout(() => setRequestSuccess(null), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit edit request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const saveEdit = async (studentId, assessmentId, maxScore) => {
    setSavingCell(true);
    try {
      const upper = editValue.trim().toUpperCase();
      const payload = { assessment_id: assessmentId, student_id: studentId };
      if (['A', 'E', 'M'].includes(upper)) payload.mark_code = upper;
      else if (editValue.trim() === '') payload.value = '';
      else payload.value = Number(editValue);

      const res = await patchMarkCell(payload);
      if (!res?.success) {
        setError(res?.message || 'Failed to save mark');
        return;
      }
      setEditingCell(null);
      await load(selectedStudent?.student_id || null);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save mark';
      if (msg.toLowerCase().includes('published') || msg.toLowerCase().includes('request')) {
        const col = columns.find((c) => c.id === assessmentId);
        startEdit(studentId, assessmentId, { value: editValue }, col || { is_locked: true, max_score: maxScore });
      } else {
        setError(msg);
      }
    } finally {
      setSavingCell(false);
    }
  };

  const handlePrint = () => window.print();

  const openWizard = (preset = null) => {
    setWizardPreset(preset);
    setWizardOpen(true);
  };

  const handleExportExcel = () => {
    if (!data?.students?.length) return;
    setExporting('excel');
    try {
      exportMarksCenterExcel(data, filters);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (!data?.students?.length) return;
    setExporting('pdf');
    try {
      await exportMarksCenterPdf(data, filters);
    } finally {
      setExporting(null);
    }
  };

  const gradeChartData = useMemo(() => {
    const d = data?.grade_distribution || {};
    return ['A', 'B', 'C', 'D', 'F'].map((g) => ({ grade: g, count: d[g] || 0 }));
  }, [data]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent={{ sm: 'space-between' }} spacing={1.5}>
        <Box>
          <Typography component="h3" sx={{ fontSize: 18, fontWeight: 600, color: NAVY }}>Marks Center</Typography>
          <Typography sx={{ mt: 0.25, fontSize: 12, color: 'rgba(19,33,61,0.5)' }}>
            Gradebook for your assigned classes only - filters update instantly.
          </Typography>
        </Box>
        <Stack direction="row" flexWrap="wrap" useFlexGap alignItems="center" spacing={1}>
          {refreshing && <CircularProgress size={14} sx={{ color: 'rgba(19,33,61,0.3)' }} />}
          <Button
            onClick={() => openWizard({ className: filters.className, subjectName: filters.course, typeSlug: filters.assessmentType || undefined, startStep: 1 })}
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            sx={toolBtnSx}
          >
            Add assessment
          </Button>
          <Button
            onClick={() => openWizard({ className: filters.className, subjectName: filters.course, startStep: 0 })}
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            sx={{ ...toolBtnSx, bgcolor: NAVY, color: '#fff', border: `1px solid ${NAVY}`, '&:hover': { bgcolor: '#1B2D52' } }}
          >
            Add marks
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={!data?.students?.length || !!exporting}
            startIcon={exporting === 'excel' ? <CircularProgress size={14} /> : <TableChartIcon sx={{ fontSize: 14 }} />}
            sx={toolBtnSx}
          >
            Excel
          </Button>
          <Button
            onClick={handleExportPdf}
            disabled={!data?.students?.length || !!exporting}
            startIcon={exporting === 'pdf' ? <CircularProgress size={14} /> : <DownloadIcon sx={{ fontSize: 14 }} />}
            sx={toolBtnSx}
          >
            PDF
          </Button>
          <Button onClick={handlePrint} startIcon={<PrintIcon sx={{ fontSize: 14 }} />} sx={toolBtnSx}>
            Print
          </Button>
        </Stack>
      </Stack>

      {requestSuccess && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ borderRadius: 2.5, border: '1px solid #BBF7D0', bgcolor: '#F0FDF4', px: 2, py: 1.5, fontSize: 14, color: '#166534' }}>
          <CheckCircleIcon sx={{ fontSize: 16 }} /> {requestSuccess}
        </Stack>
      )}

      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', p: 2, boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
          <FilterSelect label="Academic year" value={filters.academicYear} onChange={(v) => setFilter('academicYear', v)}
            options={yearOptions.length ? yearOptions : [{ value: '', label: 'Loading...' }]} disabled={loading} />
          <FilterSelect label="Term" value={filters.term} onChange={(v) => setFilter('term', v)}
            options={(data?.filters?.terms || ['Term 1', 'Term 2', 'Term 3']).map((t) => ({ value: t, label: t }))} disabled={loading} />
          <FilterSelect label="Class" value={filters.className} onChange={(v) => setFilter('className', v)}
            options={(data?.filters?.classes || []).map((c) => ({ value: c, label: c }))} disabled={loading} />
          <FilterSelect label="Course" value={filters.course} onChange={(v) => setFilter('course', v)}
            options={(data?.filters?.courses || []).map((c) => ({ value: c, label: c }))} disabled={loading} />
          <FilterSelect label="Assessment type" value={filters.assessmentType} onChange={(v) => setFilter('assessmentType', v)}
            options={typeOptions} disabled={loading} />
          <FilterSelect label="Assessment" value={filters.assessmentId} onChange={(v) => setFilter('assessmentId', v)}
            options={assessmentOptions} disabled={loading} />
          <Box sx={{ minWidth: 160, flex: 1 }}>
            <Box component="label" sx={fieldLabelSx}>Search student</Box>
            <Box sx={{ position: 'relative' }}>
              <SearchIcon sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(19,33,61,0.3)' }} />
              <Box
                component="input"
                type="search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Name or ID..."
                sx={{ ...selectSx, pl: 4, pr: 1.5 }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ borderRadius: 2.5, bgcolor: '#FEF2F2', border: '1px solid #FEE2E2', px: 2, py: 1.5, fontSize: 14, color: '#991B1B' }}>
          <WarningAmberIcon sx={{ fontSize: 16 }} /> {error}
        </Stack>
      )}

      {data?.empty_reason && !loading && (
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${BORDER}`, bgcolor: '#fff', p: 4, textAlign: 'center', fontSize: 14, color: 'rgba(19,33,61,0.5)' }}>
          {data.empty_reason}
        </Paper>
      )}

      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={32} sx={{ color: 'rgba(19,33,61,0.3)' }} />
        </Box>
      ) : data && !data.empty_reason ? (
        <>
          {(data.missing_marks_count > 0 || (data.insights || []).length > 0) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {data.missing_marks_count > 0 && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ borderRadius: 2.5, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', px: 1.5, py: 1, fontSize: 12, color: '#78350F' }}>
                  <WarningAmberIcon sx={{ fontSize: 14 }} /> {data.missing_marks_count} missing marks
                  <ButtonBase
                    onClick={() => openWizard({ className: filters.className, subjectName: filters.course, startStep: 2 })}
                    sx={{ ml: 0.5, fontSize: 12, fontWeight: 500, color: '#78350F', textDecoration: 'underline' }}
                  >
                    Complete missing marks
                  </ButtonBase>
                </Stack>
              )}
              {(data.insights || []).map((ins, i) => (
                <Stack
                  key={i}
                  direction="row"
                  alignItems="center"
                  spacing={0.75}
                  sx={{
                    borderRadius: 2.5,
                    px: 1.5,
                    py: 1,
                    fontSize: 12,
                    ...(ins.type === 'success'
                      ? { bgcolor: '#F0FDF4', color: '#166534', border: '1px solid #DCFCE7' }
                      : { bgcolor: '#FFFBEB', color: '#78350F', border: '1px solid #FEF3C7' }),
                  }}
                >
                  {ins.type === 'success' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <WarningAmberIcon sx={{ fontSize: 14 }} />} {ins.text}
                </Stack>
              ))}
            </Box>
          )}

          {columns.length === 0 && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              flexWrap="wrap"
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ borderRadius: 2.5, border: '1px solid rgba(19,33,61,0.2)', bgcolor: 'rgba(19,33,61,0.05)', px: 2, py: 1.5, fontSize: 14, color: 'rgba(19,33,61,0.7)' }}
            >
              <Box component="span">
                No assessments for <strong>{filters.course || data.selected?.subject_name}</strong> in{' '}
                <strong>{filters.className || data.selected?.class_name}</strong> yet.
              </Box>
              <ButtonBase
                onClick={() => openWizard({ className: filters.className, subjectName: filters.course, startStep: 1 })}
                sx={{ fontSize: 12, fontWeight: 500, color: NAVY, '&:hover': { textDecoration: 'underline' } }}
              >
                + Create first assessment
              </ButtonBase>
            </Stack>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: { xs: 1.5, lg: 0 }, '@media (min-width:1200px)': { '& > *:not(:first-of-type)': { borderLeft: 0 } } }}>
            <KpiCard label="Total students" value={data.kpis?.total_students} />
            <KpiCard label="Average mark" value={data.kpis?.average_percent} suffix="%" />
            <KpiCard label="Highest score" value={data.kpis?.highest} suffix="%" />
            <KpiCard label="Lowest score" value={data.kpis?.lowest} suffix="%" />
            <KpiCard label="Pass rate" value={data.kpis?.pass_rate} suffix="%" />
          </Box>
          {columns.length > 0 && data.kpis?.average_percent == null && (
            <Typography sx={{ mt: -1, fontSize: 12, color: MUTED }}>
              KPIs appear once marks are recorded for the selected class and course.
            </Typography>
          )}

          <Stack direction="row" spacing={0.5} sx={{ width: 'fit-content', borderRadius: 2.5, bgcolor: 'rgba(19,33,61,0.04)', p: 0.5 }}>
            {[
              { id: 'all', label: 'All assessments' },
              { id: 'categories', label: 'Assessment categories' },
              { id: 'averages', label: 'Student averages' },
            ].map((t) => (
              <ButtonBase
                key={t.id}
                onClick={() => setTab(t.id)}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'color .15s',
                  ...(tab === t.id
                    ? { bgcolor: '#fff', color: NAVY, boxShadow: '0 1px 2px rgba(19,33,61,0.08)' }
                    : { color: 'rgba(19,33,61,0.5)', '&:hover': { color: NAVY } }),
                }}
              >
                {t.label}
              </ButtonBase>
            ))}
          </Stack>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 2 }}>
            <Paper elevation={0} sx={{ flex: 1, minWidth: 0, borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden', boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}>
              {tab === 'all' && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table sx={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, position: 'sticky', left: 0, zIndex: 20, bgcolor: '#f4f5f8', textAlign: 'left', minWidth: 160, borderRight: 0, boxShadow: `inset -1px 0 0 ${BORDER}` }}>
                          Student
                        </TableCell>
                        {columns.map((c) => (
                          <TableCell
                            key={c.id}
                            title={c.is_locked ? 'Published - request edit to change' : undefined}
                            sx={{ ...headCellSx, textAlign: 'center', px: 1, minWidth: 72, whiteSpace: 'nowrap' }}
                          >
                            <Box component="span" sx={{ display: 'block', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.short_label || c.assessment_name}
                            </Box>
                            {c.is_locked && <Box component="span" sx={{ fontSize: 9, fontWeight: 500, color: '#D97706' }}>locked</Box>}
                          </TableCell>
                        ))}
                        <TableCell sx={{ ...headCellSx, textAlign: 'center', px: 1.5, minWidth: 64 }}>Avg</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={columns.length + 2} sx={{ py: 6, textAlign: 'center', fontSize: 14, color: 'rgba(19,33,61,0.4)' }}>
                            No students found
                          </TableCell>
                        </TableRow>
                      ) : students.map((row) => (
                        <TableRow key={row.student_id} hover onClick={() => openStudent(row)} sx={{ cursor: 'pointer', '& td': { borderTop: `1px solid rgba(0,0,0,0.04)`, borderBottom: 'none' } }}>
                          <TableCell sx={{ position: 'sticky', left: 0, zIndex: 10, bgcolor: '#fff', 'tr:hover > &': { bgcolor: '#F5F5F5' }, borderRight: 0, boxShadow: `inset -1px 0 0 ${BORDER}`, py: 1.25, px: 2, fontWeight: 500, color: NAVY }}>
                            <Typography sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>{row.name}</Typography>
                            <Typography sx={{ fontSize: 10, color: 'rgba(19,33,61,0.35)' }}>{row.student_uid}</Typography>
                          </TableCell>
                          {columns.map((c) => {
                            const cell = row.marks[c.id];
                            const cellKey = `${row.student_id}:${c.id}`;
                            const isEditing = editingCell === cellKey;
                            return (
                              <TableCell key={c.id} onClick={(e) => e.stopPropagation()} sx={{ py: 0.75, px: 0.5, textAlign: 'center', borderTop: `1px solid rgba(0,0,0,0.04)`, borderBottom: 'none' }}>
                                {isEditing ? (
                                  <Box
                                    component="input"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit(row.student_id, c.id, c.max_score)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(row.student_id, c.id, c.max_score); if (e.key === 'Escape') setEditingCell(null); }}
                                    disabled={savingCell}
                                    sx={{ width: 56, height: 32, textAlign: 'center', fontSize: 12, fontFamily: 'inherit', borderRadius: 2, border: `1px solid ${NAVY}`, outline: 'none' }}
                                  />
                                ) : (
                                  <ButtonBase
                                    onClick={() => startEdit(row.student_id, c.id, cell, c)}
                                    sx={{
                                      minWidth: '2.5rem',
                                      height: 32,
                                      px: 0.75,
                                      borderRadius: 2,
                                      fontSize: 12,
                                      fontWeight: 500,
                                      fontVariantNumeric: 'tabular-nums',
                                      ...toneSx(markTone(cell?.percent)),
                                    }}
                                  >
                                    {cell?.mark_code || (cell?.value != null ? cell.value : '-')}
                                  </ButtonBase>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell sx={{ py: 1.25, px: 1, textAlign: 'center', borderTop: `1px solid rgba(0,0,0,0.04)`, borderBottom: 'none' }}>
                            <Box component="span" sx={{ borderRadius: 1.5, px: 1, py: 0.25, fontSize: 12, fontWeight: 600, ...toneSx(markTone(row.average_percent)) }}>
                              {row.average_percent != null ? `${row.average_percent}%` : '-'}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {tab === 'categories' && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table sx={{ width: '100%' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, textAlign: 'left' }}>Category</TableCell>
                        <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Weight</TableCell>
                        <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Class average</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ py: 5, textAlign: 'center', color: 'rgba(19,33,61,0.4)' }}>No category data yet</TableCell>
                        </TableRow>
                      ) : categoryRows.map((c) => (
                        <TableRow key={c.slug}>
                          <TableCell sx={{ ...cellBaseSx, fontWeight: 500, color: NAVY, borderTop: `1px solid rgba(0,0,0,0.04)`, borderBottom: 'none' }}>{c.name}</TableCell>
                          <TableCell sx={{ ...cellBaseSx, textAlign: 'center', color: 'rgba(19,33,61,0.6)', borderTop: `1px solid rgba(0,0,0,0.04)`, borderBottom: 'none' }}>{c.weight_percent}%</TableCell>
                          <TableCell sx={{ ...cellBaseSx, textAlign: 'center', borderTop: `1px solid rgba(0,0,0,0.04)`, borderBottom: 'none' }}>
                            <Box component="span" sx={{ display: 'inline-block', borderRadius: 2, px: 1.25, py: 0.5, fontSize: 12, fontWeight: 600, ...toneSx(markTone(c.average_percent)) }}>
                              {c.average_percent != null ? `${c.average_percent}%` : '-'}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {tab === 'averages' && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table sx={{ width: '100%' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, textAlign: 'left' }}>#</TableCell>
                        <TableCell sx={{ ...headCellSx, textAlign: 'left' }}>Student</TableCell>
                        <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Average</TableCell>
                        <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Grade</TableCell>
                        <TableCell sx={{ ...headCellSx, textAlign: 'center' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((row) => (
                        <TableRow key={row.student_id} hover onClick={() => openStudent(row)} sx={{ cursor: 'pointer', '& td': { borderTop: `1px solid rgba(0,0,0,0.04)`, borderBottom: 'none' } }}>
                          <TableCell sx={{ ...cellBaseSx, color: 'rgba(19,33,61,0.4)', fontSize: 12 }}>{row.position ?? '-'}</TableCell>
                          <TableCell sx={{ ...cellBaseSx, fontWeight: 500, color: NAVY }}>{row.name}</TableCell>
                          <TableCell sx={{ ...cellBaseSx, textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {row.average_percent != null ? `${row.average_percent}%` : '-'}
                          </TableCell>
                          <TableCell sx={{ ...cellBaseSx, textAlign: 'center' }}>
                            {row.grade ? (
                              <Box component="span" sx={{ borderRadius: 99, px: 1, py: 0.25, fontSize: 12, fontWeight: 500, ...toneSx(gradeTone(row.grade)) }}>
                                {row.grade}
                              </Box>
                            ) : '-'}
                          </TableCell>
                          <TableCell sx={{ ...cellBaseSx, textAlign: 'center', fontSize: 12 }}>
                            {row.missing_count > 0 ? (
                              <Box component="span" sx={{ color: '#B45309' }}>Missing {row.missing_count}</Box>
                            ) : (
                              <Box component="span" sx={{ color: '#15803D' }}>Complete</Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Paper>

            {data.selected_assessment && (
              <Paper elevation={0} sx={{ flexShrink: 0, width: { xl: 288 }, height: 'fit-content', borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', p: 2.5, boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}>
                <Typography sx={{ mb: 1.5, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(19,33,61,0.4)' }}>
                  Assessment details
                </Typography>
                <Typography component="h4" sx={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{data.selected_assessment.assessment_name}</Typography>
                <Box component="dl" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.25, fontSize: 12, m: 0 }}>
                  {[
                    { dt: 'Type', dd: data.selected_assessment.type_name },
                    { dt: 'Maximum marks', dd: data.selected_assessment.max_score },
                    { dt: 'Created', dd: data.selected_assessment.created_at ? new Date(data.selected_assessment.created_at).toLocaleDateString() : '-' },
                    { dt: 'Submitted', dd: `${data.selected_assessment.submitted_count}/${data.selected_assessment.total_students}` },
                  ].map((item) => (
                    <Box key={item.dt} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box component="dt" sx={{ color: 'rgba(19,33,61,0.5)' }}>{item.dt}</Box>
                      <Box component="dd" sx={{ m: 0, fontWeight: 500, color: NAVY }}>{item.dd}</Box>
                    </Box>
                  ))}
                </Box>
                <Button
                  onClick={() => setFilter('assessmentId', String(data.selected_assessment.id))}
                  fullWidth
                  sx={{ ...toolBtnSx, mt: 2, height: 36 }}
                >
                  Focus this assessment
                </Button>
              </Paper>
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', p: 2.5, boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5, fontSize: 12, fontWeight: 500, color: 'rgba(19,33,61,0.55)' }}>
                <BarChartIcon sx={{ fontSize: 14 }} /> Grade distribution
              </Stack>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#13213D08" />
                  <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={NAVY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', p: 2.5, boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5, fontSize: 12, fontWeight: 500, color: 'rgba(19,33,61,0.55)' }}>
                <TrendingUpIcon sx={{ fontSize: 14 }} /> Performance trend
              </Stack>
              {(data.trend || []).length === 0 ? (
                <Typography sx={{ py: 6, textAlign: 'center', fontSize: 12, color: 'rgba(19,33,61,0.4)' }}>
                  Record more assessments to see trends
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#13213D08" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Line type="monotone" dataKey="average" stroke={NAVY} strokeWidth={2} dot={{ fill: NAVY }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', p: 2.5, boxShadow: '0 1px 2px rgba(19,33,61,0.06)' }}>
              <Typography sx={{ mb: 1.5, fontSize: 12, fontWeight: 500, color: 'rgba(19,33,61,0.55)' }}>Top performers</Typography>
              {(data.top_performers || []).length === 0 ? (
                <Typography sx={{ py: 4, textAlign: 'center', fontSize: 12, color: 'rgba(19,33,61,0.4)' }}>No data yet</Typography>
              ) : (
                <Box component="ol" sx={{ display: 'flex', flexDirection: 'column', gap: 1, m: 0, p: 0, listStyle: 'none' }}>
                  {data.top_performers.map((p, i) => (
                    <Box key={p.student_id} component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                      <Box component="span" sx={{ width: 20, fontSize: 12, color: 'rgba(19,33,61,0.4)' }}>{i + 1}</Box>
                      <Box component="span" sx={{ flex: 1, fontWeight: 500, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Box>
                      <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{p.average_percent}%</Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        </>
      ) : null}

      <RecordMarksWizard
        open={wizardOpen}
        preset={wizardPreset}
        onClose={() => { setWizardOpen(false); setWizardPreset(null); load(); }}
        onPublished={() => load()}
      />

      <Dialog open={!!editRequest} onClose={() => setEditRequest(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 0 } }}>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: NAVY }}>Request mark edit</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12, color: 'rgba(19,33,61,0.5)' }}>
              This assessment is published. Academic must approve your change.
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, fontSize: 14 }}>
            <Box sx={{ borderRadius: 2.5, bgcolor: 'rgba(19,33,61,0.05)', px: 1.5, py: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'rgba(19,33,61,0.4)' }}>Current</Typography>
              <Typography sx={{ fontWeight: 600 }}>{editRequest?.currentScore ?? '-'}</Typography>
            </Box>
            <Box>
              <Box component="label" sx={fieldLabelSx}>Requested score</Box>
              <Box
                component="input"
                type="number"
                min={0}
                max={editRequest?.maxScore}
                value={editRequestScore}
                onChange={(e) => setEditRequestScore(e.target.value)}
                sx={{ width: '100%', height: 40, borderRadius: 2.5, border: '1px solid rgba(0,0,0,0.1)', px: 1.5, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
              />
            </Box>
          </Box>
          <Box>
            <Box component="label" sx={fieldLabelSx}>Reason *</Box>
            <Box
              component="textarea"
              value={editRequestReason}
              onChange={(e) => setEditRequestReason(e.target.value)}
              rows={3}
              placeholder="Explain why this mark needs to change..."
              sx={{ width: '100%', borderRadius: 2.5, border: '1px solid rgba(0,0,0,0.1)', px: 1.5, py: 1, fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none' }}
            />
          </Box>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 1 }}>
            <Button onClick={() => setEditRequest(null)} sx={toolBtnSx}>Cancel</Button>
            <Button
              onClick={submitEditRequest}
              disabled={submittingRequest || !editRequestReason.trim()}
              sx={{ borderRadius: 2.5, px: 2, py: 1, fontSize: 12, fontWeight: 500, textTransform: 'none', color: '#fff', bgcolor: NAVY, '&:hover': { bgcolor: '#1B2D52' } }}
            >
              {submittingRequest ? 'Sending...' : 'Submit request'}
            </Button>
          </Stack>
        </Box>
      </Dialog>

      <Drawer anchor="right" open={!!selectedStudent} onClose={() => setSelectedStudent(null)} PaperProps={{ sx: { width: '100%', maxWidth: 448 } }}>
        {selectedStudent && (
          <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: `1px solid ${BORDER}`, px: 2.5, py: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(19,33,61,0.05)' }}>
                  <PersonOutlineIcon sx={{ fontSize: 20, color: NAVY }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{selectedStudent.name}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'rgba(19,33,61,0.45)' }}>{selectedStudent.student_uid}</Typography>
                </Box>
              </Stack>
              <IconButton onClick={() => setSelectedStudent(null)} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box sx={{ borderRadius: 2.5, border: `1px solid ${BORDER}`, p: 1.5 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(19,33,61,0.4)' }}>Average</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 600, color: NAVY }}>
                    {selectedStudent.average_percent != null ? `${selectedStudent.average_percent}%` : '-'}
                  </Typography>
                </Box>
                <Box sx={{ borderRadius: 2.5, border: `1px solid ${BORDER}`, p: 1.5 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(19,33,61,0.4)' }}>Position</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 600, color: NAVY }}>{selectedStudent.position ?? '-'}</Typography>
                </Box>
              </Box>
              {selectedStudent.grade && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderRadius: 2.5, border: `1px solid ${BORDER}`, p: 1.5 }}>
                  <Box component="span" sx={{ fontSize: 12, color: 'rgba(19,33,61,0.5)' }}>Grade</Box>
                  <Box component="span" sx={{ borderRadius: 99, px: 1.5, py: 0.5, fontSize: 14, fontWeight: 500, ...toneSx(gradeTone(selectedStudent.grade)) }}>
                    {selectedStudent.grade}
                  </Box>
                </Stack>
              )}
              <Box>
                <Typography sx={{ mb: 1, fontSize: 12, fontWeight: 500, color: 'rgba(19,33,61,0.55)' }}>Subject averages (your classes)</Typography>
                <Stack spacing={1}>
                  {(selectedStudent.subject_averages || []).length === 0 ? (
                    <Typography sx={{ fontSize: 12, color: 'rgba(19,33,61,0.4)' }}>No marks recorded in other subjects yet.</Typography>
                  ) : selectedStudent.subject_averages.map((s) => (
                    <Stack key={s.subject_name} direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid rgba(0,0,0,0.04)', py: 1, '&:last-of-type': { borderBottom: 0 } }}>
                      <Box component="span" sx={{ fontSize: 14, color: NAVY }}>{s.subject_name}</Box>
                      <Box component="span" sx={{ borderRadius: 1.5, px: 1, py: 0.25, fontSize: 12, fontWeight: 600, ...toneSx(markTone(s.average_percent)) }}>
                        {s.average_percent}%
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
              <Box component={Link} to="/marks/student-profiles" sx={{ display: 'block', textAlign: 'center', fontSize: 12, fontWeight: 500, color: NAVY, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                View full student profile &rarr;
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { deleteAssessmentCourse, deleteAssessmentMarks, getAssessmentMarks, getGradingScale, getPendingCorrections, listAssessments, listTimetableClassConfig, reviewCorrection, smListClasses, smListStudents, type TimetableClassCatalog } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { AssessmentReviewDrawer } from '@/components/assessment-review-drawer';
import { toast } from '@/lib/toast';
import type { ApiAssessment, ApiAssessmentMark, ApiClass } from '@/types';
import { NAVY, classLabel, isTeacherScheduledAssessment, marksScoredCount, statusRecordLabel, workflowStatusLabel } from '@/lib/assessment-records';
import * as XLSX from 'xlsx';

interface CorrectionRow {
  id: string;
  assessmentId: string;
  studentId: string;
  currentScore: number;
  requestedScore: number;
  reason: string;
  status: string;
  requestedBy: string | null;
  createdAt: string;
  reviewNotes?: string | null;
  assessment?: ApiAssessment;
  student?: { firstName?: string; lastName?: string; studentUid?: string };
}

type StudentRosterRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  studentUid?: string | null;
  studentCode?: string | null;
  admissionNumber?: string | null;
};

type GradeBand = { minPercentage: number; maxPercentage: number; grade: string };

function classOptionLabel(c: { name: string; stream?: string | null }) {
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

function excelSafeName(name: string, fallback: string) {
  const safe = name.replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31);
  return safe || fallback;
}

function classAcademicLevel(cls: ApiClass | null): string {
  const category = cls?.category?.trim().toUpperCase();
  if (['NURSERY', 'PRIMARY', 'O_LEVEL', 'A_LEVEL', 'UNIVERSITY', 'TVET'].includes(category ?? '')) {
    return category!;
  }
  const label = `${cls?.name ?? ''} ${cls?.grade?.name ?? ''}`.trim().toUpperCase();
  if (/^(N[1-3]|BABY|NURSERY)/.test(label)) return 'NURSERY';
  if (/^(P[1-6]|PRIMARY)/.test(label)) return 'PRIMARY';
  if (/^S[1-3]/.test(label)) return 'O_LEVEL';
  if (/^S[4-6]/.test(label)) return 'A_LEVEL';
  if (category === 'SECONDARY') return 'SECONDARY';
  return category || 'PRIMARY';
}

function gradeForPercentage(percentage: number, scales: GradeBand[]): string {
  const match = scales.find((scale) =>
      percentage + 0.001 >= Number(scale.minPercentage) &&
      percentage - 0.001 <= Number(scale.maxPercentage)
  );
  return match?.grade ?? 'N/A';
}

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename, { compression: true });
}

const PUBLISH_ROLES = new Set([
  'organization_admin', 'school_admin', 'director', 'head_teacher', 'headteacher',
  'dos', 'dod', 'academic_admin', 'academics_admin', 'principal',
]);

export default function MarksRecordsPage() {
  const { settings } = useAcademicSettings();
  const { user } = useAuth();
  const canDelete = (user?.roles ?? []).some((r) => PUBLISH_ROLES.has(String(r).toLowerCase()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApiAssessment[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRow[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [ttConfig, setTtConfig] = useState<TimetableClassCatalog[]>([]);

  const [tab, setTab] = useState<'records' | 'requests'>('records');
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [classId, setClassId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [search, setSearch] = useState('');
  const [blankMaxMark, setBlankMaxMark] = useState('100');
  const [exportBusy, setExportBusy] = useState<'results' | 'blank' | null>(null);
  const [exportProgress, setExportProgress] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [reqPage, setReqPage] = useState(0);
  const [reqRowsPerPage, setReqRowsPerPage] = useState(10);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewingCorrectionId, setReviewingCorrectionId] = useState<string | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ assessment: ApiAssessment; mode: 'course' | 'marks' } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (settings?.currentAcademicYear && !filterYear) setFilterYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !filterTerm) setFilterTerm(settings.currentTerm);
  }, [settings, filterYear, filterTerm]);

  useEffect(() => { smListClasses().then((d) => setClasses(Array.isArray(d) ? d : [])).catch(() => setClasses([])); }, []);
  useEffect(() => {
    listTimetableClassConfig({ term: filterTerm || undefined, academicYear: filterYear || undefined })
      .then((d) => setTtConfig(Array.isArray(d) ? d : [])).catch(() => setTtConfig([]));
  }, [filterTerm, filterYear]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [assessments, corr] = await Promise.all([
        listAssessments({ academicYear: filterYear || undefined, term: filterTerm || undefined, classId: classId || undefined }),
        getPendingCorrections('all').catch(() => []),
      ]);
      setRows((assessments ?? []).filter(isTeacherScheduledAssessment));
      setCorrections(Array.isArray(corr) ? corr : []);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message || 'Could not load marks records');
      setRows([]);
    } finally { setLoading(false); }
  }, [filterYear, filterTerm, classId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(0); }, [filterYear, filterTerm, classId, courseName, assessmentId, teacherName, search]);

  const yearOptions = useMemo(() => {
    const base = settings?.academicYears?.length ? [...settings.academicYears] : [];
    if (settings?.currentAcademicYear && !base.includes(settings.currentAcademicYear)) base.unshift(settings.currentAcademicYear);
    if (filterYear && !base.includes(filterYear)) base.unshift(filterYear);
    return [...new Set(base.length ? base : [new Date().getFullYear().toString()])];
  }, [settings, filterYear]);
  const termOptions = useMemo(() => {
    const base = settings?.terms?.length ? [...settings.terms] : ['Term 1', 'Term 2', 'Term 3'];
    if (settings?.currentTerm && !base.includes(settings.currentTerm)) base.unshift(settings.currentTerm);
    if (filterTerm && !base.includes(filterTerm)) base.unshift(filterTerm);
    return [...new Set(base)];
  }, [settings, filterTerm]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) || null, [classes, classId]);
  const selectedTtClass = useMemo(() => ttConfig.find((c) => c.classId === classId) || ttConfig.find((c) => selectedClass && c.className === classOptionLabel(selectedClass)) || null, [ttConfig, classId, selectedClass]);

  const courseOptions = useMemo(() => {
    const names = new Set<string>();
    if (selectedTtClass) selectedTtClass.courses.forEach((c) => c.subjectName && names.add(c.subjectName));
    else if (!classId) ttConfig.forEach((cl) => cl.courses.forEach((c) => c.subjectName && names.add(c.subjectName)));
    rows.forEach((a) => { if (a.subject?.name) names.add(a.subject.name); });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [selectedTtClass, ttConfig, rows, classId]);
  const teacherOptions = useMemo(() => {
    const names = new Set<string>();
    if (selectedTtClass) selectedTtClass.courses.forEach((c) => c.teacherName && names.add(c.teacherName));
    else if (!classId) ttConfig.forEach((cl) => cl.courses.forEach((c) => c.teacherName && names.add(c.teacherName)));
    rows.forEach((a) => { if (a.createdByName) names.add(a.createdByName); });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [selectedTtClass, ttConfig, rows, classId]);

  const assessmentOptions = useMemo(
    () =>
      rows
        .filter((a) => (!classId || a.classId === classId))
        .filter((a) => !courseName || (a.subject?.name || '').toLowerCase() === courseName.toLowerCase())
        .sort((a, b) => `${a.subject?.name ?? ''} ${a.title}`.localeCompare(`${b.subject?.name ?? ''} ${b.title}`)),
    [rows, classId, courseName]
  );

  useEffect(() => { if (courseName && !courseOptions.includes(courseName)) setCourseName(''); }, [courseOptions, courseName]);
  useEffect(() => { if (teacherName && !teacherOptions.includes(teacherName)) setTeacherName(''); }, [teacherOptions, teacherName]);
  useEffect(() => {
    if (assessmentId && !assessmentOptions.some((a) => a.id === assessmentId)) setAssessmentId('');
  }, [assessmentOptions, assessmentId]);

  const filtered = useMemo(() => {
    let list = rows;
    if (classId) list = list.filter((a) => a.classId === classId);
    if (courseName) list = list.filter((a) => (a.subject?.name || '').toLowerCase() === courseName.toLowerCase() || (a.subject?.name || '').toLowerCase().includes(courseName.toLowerCase()));
    if (assessmentId) list = list.filter((a) => a.id === assessmentId);
    if (teacherName) list = list.filter((a) => (a.createdByName || '').toLowerCase() === teacherName.toLowerCase() || (a.createdByName || '').toLowerCase().includes(teacherName.toLowerCase()));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((a) => [a.title, a.assessmentCode, a.subject?.name, classLabel(a), a.createdByName, a.component?.name].filter(Boolean).join(' ').toLowerCase().includes(q));
    return list;
  }, [rows, classId, courseName, assessmentId, teacherName, search]);

  const paginated = useMemo(() => { const start = page * rowsPerPage; return filtered.slice(start, start + rowsPerPage); }, [filtered, page, rowsPerPage]);
  const teacherCorrections = useMemo(() => corrections.filter((c) => !c.assessment || isTeacherScheduledAssessment(c.assessment as ApiAssessment)), [corrections]);
  const paginatedCorrections = useMemo(() => teacherCorrections.slice(reqPage * reqRowsPerPage, reqPage * reqRowsPerPage + reqRowsPerPage), [teacherCorrections, reqPage, reqRowsPerPage]);
  const pendingCount = useMemo(() => corrections.filter((c) => c.status === 'PENDING').length, [corrections]);

  function correctionAssessmentTitle(c: CorrectionRow) {
    const a = c.assessment; if (!a) return c.assessmentId.slice(0, 8);
    return [a.title, a.subject?.name, classLabel(a as ApiAssessment)].filter(Boolean).join(' · ');
  }
  function correctionStatusStyle(status: string) {
    if (status === 'PENDING') return { bg: '#fef3c7', color: '#92400e' };
    if (status === 'APPROVED') return { bg: '#dcfce7', color: '#166534' };
    if (status === 'REJECTED') return { bg: '#fee2e2', color: '#991b1b' };
    return { bg: '#f1f5f9', color: '#475569' };
  }

  async function exportMarkedResults() {
    const assessments = filtered.filter((a) => marksScoredCount(a) > 0);
    if (!assessments.length) {
      toast.error('No entered marks', 'Choose a class, course, or assessment with saved marks.');
      return;
    }

    setExportBusy('results');
    setExportProgress('Loading marks and grading scale…');
    try {
      const assessmentLevels = assessments.map((assessment) => {
        const assessmentClass =
          classes.find((cls) => cls.id === assessment.classId) ?? assessment.class ?? selectedClass;
        return classAcademicLevel(assessmentClass);
      });
      const uniqueLevels = [...new Set(assessmentLevels)];
      const [markPayloads, scalePayloads] = await Promise.all([
        Promise.all(assessments.map((assessment) => getAssessmentMarks(assessment.id))),
        Promise.all(uniqueLevels.map((level) => getGradingScale(level))),
      ]);
      const scalesByLevel = new Map<string, GradeBand[]>(
        uniqueLevels.map((level, index) => [
          level,
          ((Array.isArray(scalePayloads[index]) ? scalePayloads[index] : []) as GradeBand[])
            .sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage)),
        ])
      );
      const workbook = XLSX.utils.book_new();
      const usedSheetNames = new Set<string>();

      setExportProgress('Building results workbook…');
      assessments.forEach((assessment, index) => {
        const payload = markPayloads[index] as { marks?: ApiAssessmentMark[] } | ApiAssessmentMark[];
        const marks = Array.isArray(payload) ? payload : Array.isArray(payload?.marks) ? payload.marks : [];
        const entered = marks
          .filter((mark) => mark.markStatus === 'PRESENT' && mark.score != null)
          .map((mark) => {
            const score = Number(mark.score);
            const maxMark = Number(mark.maxMark ?? assessment.maxMark);
            const percentage = maxMark > 0 ? (score / maxMark) * 100 : 0;
            const student = mark.student;
            return {
              name: student
                ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
                : mark.studentId,
              studentCode: student?.studentUid ?? mark.studentId,
              score,
              maxMark,
              percentage,
              grade: maxMark > 0 ? gradeForPercentage(percentage, scalesByLevel.get(assessmentLevels[index]) ?? []) : 'N/A',
              status: mark.markStatus,
              remarks: mark.remarks ?? '',
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!entered.length) {
          setExportProgress(`Preparing results… ${index + 1}/${assessments.length}`);
          return;
        }

        const rows: Array<Array<string | number>> = [
          ['MARKS RESULTS'],
          [`${assessment.subject?.name ?? 'Course'} · ${assessment.title}`],
          [`Class: ${classLabel(assessment) || selectedClass?.name || '—'}    |    Year: ${assessment.academicYear}    |    Term: ${assessment.term}`],
          [`Maximum mark: ${assessment.maxMark}    |    Students with marks: ${entered.length}    |    Generated: ${new Date().toLocaleString()}`],
          ['#', 'Student ID', 'Student name', 'Marks', 'Out of', 'Percentage', 'Grade', 'Status', 'Remarks'],
          ...entered.map((mark, rowIndex) => [
            rowIndex + 1,
            mark.studentCode,
            mark.name,
            mark.score,
            mark.maxMark,
            mark.percentage / 100,
            mark.grade,
            mark.status,
            mark.remarks,
          ]),
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        entered.forEach((_, rowIndex) => {
          const percentageCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex + 5, c: 5 })];
          if (percentageCell) percentageCell.z = '0.00%';
        });
        worksheet['!merges'] = [0, 1, 2, 3].map((row) => ({
          s: { r: row, c: 0 },
          e: { r: row, c: 8 },
        }));
        worksheet['!cols'] = [
          { wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 12 }, { wch: 12 },
          { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 30 },
        ];
        worksheet['!autofilter'] = { ref: `A5:I${Math.max(5, rows.length)}` };
        worksheet['!freeze'] = { xSplit: 3, ySplit: 5, topLeftCell: 'D6', activePane: 'bottomRight', state: 'frozen' };

        const baseName = excelSafeName(
          `${assessment.subject?.name ?? 'Course'} - ${assessment.title}`,
          `Assessment ${index + 1}`
        );
        let sheetName = baseName;
        let suffix = 2;
        while (usedSheetNames.has(sheetName.toLowerCase())) {
          const ending = ` ${suffix++}`;
          sheetName = `${baseName.slice(0, 31 - ending.length)}${ending}`;
        }
        usedSheetNames.add(sheetName.toLowerCase());
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      if (!workbook.SheetNames.length) {
        toast.error('No marks to download', 'The selected assessment records do not contain entered marks.');
        return;
      }
      const safeClass = (selectedClass ? classOptionLabel(selectedClass) : 'all-classes').replace(/[^\w-]+/g, '-');
      const safeTerm = (filterTerm || 'all-terms').replace(/[^\w-]+/g, '-');
      downloadWorkbook(workbook, `marks-results-${safeClass}-${safeTerm}.xlsx`);
      toast.success('Marks list downloaded', `${workbook.SheetNames.length} assessment sheet(s)`);
      const missingScales = uniqueLevels.filter((level) => !scalesByLevel.get(level)?.length);
      if (missingScales.length) {
        toast.warning('Grades unavailable', `No grading scale is configured for: ${missingScales.join(', ')}. Marks and percentages were exported.`);
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Could not prepare marks export.';
      toast.error('Marks export failed', message);
    } finally {
      setExportBusy(null);
      setExportProgress('');
    }
  }

  async function downloadBlankMarksEntry() {
    if (!classId || !selectedClass) {
      toast.error('Select a class', 'Choose one class before downloading a blank marks-entry sheet.');
      return;
    }
    const maxMark = Number(blankMaxMark);
    if (!Number.isFinite(maxMark) || maxMark <= 0) {
      toast.error('Invalid maximum mark', 'Enter a number greater than zero for the blank columns.');
      return;
    }

    setExportBusy('blank');
    setExportProgress('Loading class student list…');
    try {
      const response = await smListStudents({ classId, academicYear: filterYear || undefined });
      if (!Array.isArray(response)) throw new Error('Student list response was not in the expected format.');
      const students = (response as StudentRosterRow[])
        .filter((student) => student?.id)
        .sort((a, b) =>
          `${a.lastName ?? ''} ${a.firstName ?? a.fullName ?? ''}`.localeCompare(
            `${b.lastName ?? ''} ${b.firstName ?? b.fullName ?? ''}`
          )
        );
      if (!students.length) {
        toast.error('No students found', `There are no students listed for ${classOptionLabel(selectedClass)}.`);
        return;
      }

      const selectedAssessments = filtered
        .filter((assessment) => assessment.classId === classId)
        .slice(0, 5);
      const markHeaders = Array.from({ length: 5 }, (_, index) => {
        const assessment = selectedAssessments[index];
        const label = assessment
          ? `${assessment.subject?.name ? `${assessment.subject.name} ` : ''}${assessment.title}`
          : `Mark ${index + 1}`;
        return `${label} (out of ${assessment?.maxMark || maxMark})`;
      });
      const courseLabel = courseName || selectedAssessments[0]?.subject?.name || 'All courses';
      const rows: Array<Array<string | number>> = [
        ['MARKS ENTRY'],
        [`Class: ${classOptionLabel(selectedClass)}    |    Academic year: ${filterYear || '—'}    |    Term: ${filterTerm || '—'}`],
        [`Course: ${courseLabel}    |    Prepared for paper entry`],
        ['Enter one mark per student in the columns below. Maximum marks are shown in each column heading.'],
        ['#', 'Student ID', 'Student name', ...markHeaders],
        ...students.map((student, index) => [
          index + 1,
          student.studentUid ?? student.studentCode ?? student.admissionNumber ?? student.id,
          student.fullName || `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'Student',
          '', '', '', '', '',
        ]),
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet['!merges'] = [0, 1, 2, 3].map((row) => ({
        s: { r: row, c: 0 },
        e: { r: row, c: 7 },
      }));
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 18 }, { wch: 28 }, ...Array.from({ length: 5 }, () => ({ wch: 22 })),
      ];
      worksheet['!rows'] = [
        { hpt: 28 }, { hpt: 23 }, { hpt: 23 }, { hpt: 22 }, { hpt: 32 },
        ...students.map(() => ({ hpt: 24 })),
      ];
      worksheet['!autofilter'] = { ref: `A5:H${students.length + 5}` };
      worksheet['!freeze'] = { xSplit: 3, ySplit: 5, topLeftCell: 'D6', activePane: 'bottomRight', state: 'frozen' };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Entry');
      const safeClass = classOptionLabel(selectedClass).replace(/[^\w-]+/g, '-');
      const safeTerm = (filterTerm || 'term').replace(/[^\w-]+/g, '-');
      downloadWorkbook(workbook, `marks-entry-${safeClass}-${safeTerm}.xlsx`);
      toast.success('Blank marks-entry sheet downloaded', `${students.length} students · 5 mark columns`);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Could not prepare the blank marks-entry sheet.';
      toast.error('Template download failed', message);
    } finally {
      setExportBusy(null);
      setExportProgress('');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const isCourse = deleteTarget.mode === 'course';
      const result = isCourse
        ? await deleteAssessmentCourse(deleteTarget.assessment.id)
        : await deleteAssessmentMarks(deleteTarget.assessment.id);
      toast.success(
        isCourse ? 'Course removed' : 'Marks removed',
        isCourse
          ? `${result?.marksRemoved ?? 0} mark record(s) removed with the course.`
          : `${result?.marksRemoved ?? 0} mark record(s) removed. Reports recompute from remaining marks.`
      );
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error('Delete failed', (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleCorrectionReview(id: string, approved: boolean) {
    if (reviewBusyId) return; setReviewBusyId(id);
    try {
      await reviewCorrection(id, { approved, reviewNotes: reviewNotes.trim() || undefined });
      toast.success(approved ? 'Edit request approved' : 'Edit request rejected');
      setReviewingCorrectionId(null); setReviewNotes(''); await load();
    } catch (err) {
      toast.error('Could not update request', (err as { response?: { data?: { message?: string } } })?.response?.data?.message);
    } finally { setReviewBusyId(null); }
  }

  const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } } as const;

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: '1px solid #e6ebf2', bgcolor: '#fff', boxShadow: '0 6px 18px rgba(0,4,53,0.05)' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 1.25, alignItems: { md: 'center' }, mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#FCB038', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Academic Check-In</Typography>
            <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.15 }}>Marks Records</Typography>
            <Typography sx={{ fontSize: '0.84rem', color: '#64748b', mt: 0.35 }}>Review saved assessment records and manage edit requests.</Typography>
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load()} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, alignSelf: { xs: 'flex-start', md: 'center' } }}>Refresh</Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(6,1fr)' }, gap: 1.1 }}>
          <TextField select size="small" label="Academic year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} sx={inputSx}>{yearOptions.map((y) => <MenuItem key={y} value={y}>{y}{y === settings?.currentAcademicYear ? ' (active)' : ''}</MenuItem>)}</TextField>
          <TextField select size="small" label="Term" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} sx={inputSx}>{termOptions.map((t) => <MenuItem key={t} value={t}>{t}{t === settings?.currentTerm ? ' (active)' : ''}</MenuItem>)}</TextField>
          <TextField select size="small" label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setCourseName(''); setTeacherName(''); }} sx={inputSx}><MenuItem value="">All classes</MenuItem>{classes.map((c) => <MenuItem key={c.id} value={c.id}>{classOptionLabel(c)}</MenuItem>)}</TextField>
          <TextField select size="small" label="Course (timetable)" value={courseName} onChange={(e) => setCourseName(e.target.value)} sx={inputSx}><MenuItem value="">All courses</MenuItem>{courseOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
          <TextField select size="small" label="Teacher (timetable)" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} sx={inputSx}><MenuItem value="">All teachers</MenuItem>{teacherOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
          <TextField select size="small" label="Assessment" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} sx={inputSx}>
            <MenuItem value="">All assessments</MenuItem>
            {assessmentOptions.map((assessment) => (
              <MenuItem key={assessment.id} value={assessment.id}>
                {[assessment.subject?.name, assessment.title, classId ? '' : classLabel(assessment)].filter(Boolean).join(' · ')}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ mt: 1.1 }}>
          <TextField size="small" fullWidth label="Search records" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Assessment, code, class, course, teacher..." sx={inputSx} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }} />
        </Box>
        <Box sx={{ mt: 1.5, p: { xs: 1.25, sm: 1.5 }, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 1.25 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: NAVY }}>Download marks sheets</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mt: 0.2 }}>
                Results follow the filters above. The blank entry template contains the selected class roster and five mark columns.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                label="Default out of"
                value={blankMaxMark}
                onChange={(e) => setBlankMaxMark(e.target.value)}
                inputProps={{ min: 0.01, step: 'any' }}
                sx={{ ...inputSx, width: 130 }}
              />
              <Button
                variant="contained"
                startIcon={<DownloadOutlinedIcon />}
                onClick={() => void exportMarkedResults()}
                disabled={Boolean(exportBusy) || loading || !filtered.some((assessment) => marksScoredCount(assessment) > 0)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: NAVY }}
              >
                Download marked results
              </Button>
              <Button
                variant="outlined"
                startIcon={<DescriptionOutlinedIcon />}
                onClick={() => void downloadBlankMarksEntry()}
                disabled={Boolean(exportBusy) || loading || !classId}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, borderColor: '#cbd5e1', color: NAVY }}
              >
                Blank Marks Entry
              </Button>
            </Box>
          </Box>
          {exportBusy ? (
            <Box sx={{ mt: 1.2 }}>
              <LinearProgress sx={{ borderRadius: 999, '& .MuiLinearProgress-bar': { bgcolor: NAVY } }} />
              <Typography sx={{ mt: 0.6, fontSize: '0.75rem', color: '#64748b' }}>{exportProgress}</Typography>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {[
          { id: 'records' as const, label: 'Assessment Records', icon: AssignmentOutlinedIcon },
          { id: 'requests' as const, label: `Edit Requests${pendingCount ? ` (${pendingCount})` : ''}`, icon: RateReviewOutlinedIcon },
        ].map((t) => {
          const Icon = t.icon; const active = tab === t.id;
          return <Button key={t.id} onClick={() => setTab(t.id)} startIcon={<Icon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999, px: 1.5, py: 0.8, bgcolor: active ? NAVY : '#fff', color: active ? '#fff' : '#475569', border: '1px solid', borderColor: active ? NAVY : '#e2e8f0', '&:hover': { bgcolor: active ? '#09145e' : '#f8fafc' } }}>{t.label}</Button>;
        })}
      </Box>

      {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}><CircularProgress size={24} sx={{ color: NAVY }} /><Typography sx={{ color: '#64748b' }}>Loading records…</Typography></Box>
      ) : tab === 'records' ? (
        <Box sx={{ display: 'grid', gap: 1.1 }}>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            {paginated.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: '#64748b', bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>No assessment records for current filters.</Box> : paginated.map((a) => {
              const rec = statusRecordLabel(a);
              return (
                <Box key={a.id} sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.4 }}><Typography sx={{ fontWeight: 800, color: NAVY }}>{a.title}</Typography><Chip label={rec.label} size="small" sx={{ fontWeight: 700, height: 22, bgcolor: rec.bg, color: rec.color }} /></Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#475569' }}>{[a.assessmentCode, classLabel(a), a.subject?.name].filter(Boolean).join(' · ')}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.25 }}>{marksScoredCount(a)} marks · {workflowStatusLabel(a.status)} · {a.createdByName ?? 'Teacher'}</Typography>
                  <Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => setReviewId(a.id)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Review</Button>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>{['Code', 'Assessment', 'Class', 'Subject', 'Teacher', 'Marks', 'Record', 'Workflow', ...(canDelete ? ['Admin actions'] : [])].map((h) => <TableCell key={h || 'act'} sx={{ fontWeight: 800, fontSize: '0.68rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {paginated.length === 0 ? <TableRow><TableCell colSpan={canDelete ? 10 : 9} sx={{ py: 8, textAlign: 'center', color: '#94a3b8' }}>No assessment records for current filters.</TableCell></TableRow> : paginated.map((a) => {
                    const rec = statusRecordLabel(a);
                    return (
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{a.assessmentCode ?? '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: NAVY }}>{a.title}</TableCell>
                        <TableCell>{classLabel(a) || '—'}</TableCell>
                        <TableCell>{a.subject?.name ?? '—'}</TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{a.createdByName ?? 'Teacher'}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{marksScoredCount(a)}</TableCell>
                        <TableCell><Chip label={rec.label} size="small" sx={{ fontWeight: 700, height: 22, bgcolor: rec.bg, color: rec.color }} /></TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{workflowStatusLabel(a.status)}</TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => setReviewId(a.id)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, mr: canDelete ? 0.5 : 0 }}>Review</Button>
                          {canDelete ? (
                            <>
                              <IconButton
                                size="small"
                                title="Delete marks entered"
                                disabled={!marksScoredCount(a)}
                                onClick={() => setDeleteTarget({ assessment: a, mode: 'marks' })}
                                sx={{ color: '#b45309' }}
                              >
                                <DeleteSweepOutlinedIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                title="Delete course and all marks"
                                onClick={() => setDeleteTarget({ assessment: a, mode: 'course' })}
                                sx={{ color: '#dc2626' }}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} sx={{ bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }} />
        </Box>
      ) : (
        <Box sx={{ bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3, overflow: 'hidden' }}>
          {teacherCorrections.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center', px: 3 }}><RateReviewOutlinedIcon sx={{ fontSize: 42, color: '#cbd5e1', mb: 1 }} /><Typography sx={{ fontWeight: 800, color: NAVY }}>No edit requests</Typography><Typography sx={{ fontSize: '0.85rem', color: '#64748b', mt: 0.5 }}>Mark correction requests will appear here.</Typography></Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow>{['Date', 'Assessment', 'Student', 'Change', 'Reason', 'Status', ''].map((h) => <TableCell key={h || 'a'} sx={{ fontWeight: 800, fontSize: '0.68rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {paginatedCorrections.map((c) => {
                      const st = correctionStatusStyle(c.status);
                      return (
                        <TableRow key={c.id} hover>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY }}>{correctionAssessmentTitle(c)}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem' }}>{c.student ? `${c.student.firstName} ${c.student.lastName}` : '—'}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{c.currentScore} → {c.requestedScore}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{c.reason}</TableCell>
                          <TableCell><Chip label={c.status} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: st.bg, color: st.color }} /></TableCell>
                          <TableCell align="right">
                            {c.status === 'PENDING' ? (
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" onClick={() => setReviewId(c.assessmentId)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Marks</Button>
                                <Button size="small" variant="contained" onClick={() => setReviewingCorrectionId(c.id)} sx={{ bgcolor: NAVY, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Review</Button>
                              </Box>
                            ) : <Button size="small" variant="text" onClick={() => setReviewId(c.assessmentId)} sx={{ textTransform: 'none', fontWeight: 700 }}>View marks</Button>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination component="div" count={teacherCorrections.length} page={reqPage} onPageChange={(_, p) => setReqPage(p)} rowsPerPage={reqRowsPerPage} onRowsPerPageChange={(e) => { setReqRowsPerPage(parseInt(e.target.value, 10)); setReqPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
            </>
          )}
        </Box>
      )}

      <Dialog open={Boolean(reviewingCorrectionId)} onClose={() => setReviewingCorrectionId(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY, pr: 6 }}>Review edit request<IconButton onClick={() => setReviewingCorrectionId(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
        <DialogContent dividers>
          <TextField size="small" fullWidth multiline minRows={3} label="Review notes (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button fullWidth variant="contained" disabled={!reviewingCorrectionId || reviewBusyId === reviewingCorrectionId} onClick={() => reviewingCorrectionId && void handleCorrectionReview(reviewingCorrectionId, true)} sx={{ bgcolor: '#16a34a', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#15803d' } }}>Approve</Button>
            <Button fullWidth variant="outlined" disabled={!reviewingCorrectionId || reviewBusyId === reviewingCorrectionId} onClick={() => reviewingCorrectionId && void handleCorrectionReview(reviewingCorrectionId, false)} color="error" sx={{ textTransform: 'none', fontWeight: 700 }}>Reject</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleteBusy && setDeleteTarget(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY, pr: 6 }}>
          {deleteTarget?.mode === 'course' ? 'Delete course' : 'Delete entered marks'}
          <IconButton onClick={() => setDeleteTarget(null)} disabled={deleteBusy} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {deleteTarget?.mode === 'course' ? (
            <Typography sx={{ fontSize: '0.875rem', color: '#334155' }}>
              Delete <strong>{deleteTarget.assessment.title}</strong> and all{' '}
              <strong>{marksScoredCount(deleteTarget.assessment)}</strong> marks entered for it? This also removes evidence
              and correction requests, and cannot be undone.
            </Typography>
          ) : (
            <Typography sx={{ fontSize: '0.875rem', color: '#334155' }}>
              Remove all <strong>{deleteTarget ? marksScoredCount(deleteTarget.assessment) : 0}</strong> marks entered for{' '}
              <strong>{deleteTarget?.assessment.title}</strong>? The course stays, and reports recompute from remaining marks.
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
            <Button fullWidth variant="contained" disabled={deleteBusy} onClick={() => void confirmDelete()}
              sx={{ bgcolor: '#b91c1c', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#991b1b' } }}>
              {deleteBusy ? <CircularProgress size={18} color="inherit" /> : deleteTarget?.mode === 'course' ? 'Delete course' : 'Delete marks'}
            </Button>
            <Button fullWidth variant="outlined" disabled={deleteBusy} onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <AssessmentReviewDrawer open={Boolean(reviewId)} assessmentId={reviewId} onClose={() => setReviewId(null)} />
    </Box>
  );
}

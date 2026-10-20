import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Autocomplete, Button, CircularProgress, Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LockIcon from '@mui/icons-material/Lock';
import GradingIcon from '@mui/icons-material/Grading';
import SchoolIcon from '@mui/icons-material/School';
import { listExams, smListClasses, smListSubjects, getMarkStudents, getMarksForEntry, bulkSaveMarks, updateExam } from '@/services/api';
import { toast } from '@/lib/toast';
import type { ApiExam, ApiClass, ApiSubject, ApiMarkEntry } from '@/types';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '120px 1fr' }, alignItems: 'center', mb: 2, gap: { xs: 0.5, md: 0 } }}>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
      {children}
    </Box>
  );
}

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  studentUid: string;
  score: string;
  remarks: string;
  markEntryId?: string;
  dirty: boolean;
}

export default function MarksPage() {
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [, setAllMarks] = useState<ApiMarkEntry[]>([]);

  const selectedExam = exams.find(e => e.id === selectedExamId) ?? null;
  const selectedClass = classes.find(c => c.id === selectedClassId) ?? null;
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) ?? null;

  const academicYear = selectedExam?.academicYear ?? '2026';

  // Load exams on mount
  useEffect(() => {
    listExams().then(data => setExams(data ?? [])).finally(() => setLoadingExams(false));
  }, []);

  // Load classes when exam changes
  useEffect(() => {
    if (!selectedExamId) { setClasses([]); return; }
    setLoadingClasses(true);
    smListClasses().then(data => setClasses(data ?? [])).finally(() => setLoadingClasses(false));
  }, [selectedExamId]);

  // Load subjects when class changes
  useEffect(() => {
    if (!selectedClassId) { setSubjects([]); return; }
    setLoadingSubjects(true);
    smListSubjects().then(data => setSubjects(data ?? [])).finally(() => setLoadingSubjects(false));
  }, [selectedClassId]);

  // Load students when class + year changes
  useEffect(() => {
    if (!selectedClassId) { setStudents([]); return; }
    setLoadingStudents(true);
    getMarkStudents(selectedClassId, academicYear).then((data: any[]) => {
      setStudents(data.map((s: any) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        studentUid: s.studentUid,
        score: '',
        remarks: '',
        dirty: false,
      })));
    }).finally(() => setLoadingStudents(false));
  }, [selectedClassId, academicYear]);

  // Load existing marks when exam + class + subject changes
  useEffect(() => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) { setAllMarks([]); return; }
    getMarksForEntry(selectedExamId, selectedClassId, selectedSubjectId).then((data: any[]) => {
      setAllMarks(data ?? []);
      // Merge existing marks into students
      setStudents(prev => prev.map(s => {
        const existing = data.find((m: any) => m.studentId === s.id);
        return {
          ...s,
          score: existing ? String(existing.score) : '',
          remarks: existing?.remarks ?? '',
          markEntryId: existing?.id,
          dirty: false,
        };
      }));
    });
  }, [selectedExamId, selectedClassId, selectedSubjectId]);

  const handleScoreChange = (studentId: string, value: string) => {
    // Allow empty, or valid number
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    if (value !== '' && selectedExam?.totalMarks && parseFloat(value) > selectedExam.totalMarks) return;
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, score: value, dirty: true } : s));
  };

  const handleRemarksChange = (studentId: string, value: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, remarks: value, dirty: true } : s));
  };

  const handleSave = async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) return;
    const marksToSave = students
      .filter(s => s.score !== '' && s.dirty)
      .map(s => ({
        studentId: s.id,
        score: parseFloat(s.score),
        remarks: s.remarks || undefined,
      }));
    if (marksToSave.length === 0) return;

    setSaving(true);
    try {
      await bulkSaveMarks({
        examId: selectedExamId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        marks: marksToSave,
      });
      const data = await getMarksForEntry(selectedExamId, selectedClassId, selectedSubjectId);
      setAllMarks(data ?? []);
      setStudents(prev => prev.map(s => {
        const existing = data.find((m: any) => m.studentId === s.id);
        return {
          ...s,
          score: existing ? String(existing.score) : s.score,
          remarks: existing?.remarks ?? s.remarks,
          markEntryId: existing?.id,
          dirty: false,
        };
      }));
    } catch {
      /* interceptor toasts the error */
    } finally {
      setSaving(false);
    }
  };

  const locked = selectedExam?.status === 'COMPLETED' || selectedExam?.status === 'CANCELLED';

  const handleCsvImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error('CSV needs a header and at least one row');
      return;
    }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const uidIdx = header.findIndex((h) => ['studentuid', 'uid', 'code', 'studentcode'].includes(h));
    const scoreIdx = header.findIndex((h) => ['score', 'marks', 'mark'].includes(h));
    const remarksIdx = header.findIndex((h) => ['remarks', 'comment'].includes(h));
    if (uidIdx < 0 || scoreIdx < 0) {
      toast.error('CSV must include studentUid and score columns');
      return;
    }
    const byUid = new Map<string, { score: string; remarks: string }>();
    for (const line of lines.slice(1)) {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const uid = cols[uidIdx];
      if (!uid) continue;
      byUid.set(uid.toLowerCase(), {
        score: cols[scoreIdx] ?? '',
        remarks: remarksIdx >= 0 ? cols[remarksIdx] ?? '' : '',
      });
    }
    setStudents((prev) =>
      prev.map((s) => {
        const row = byUid.get(s.studentUid.toLowerCase()) ?? byUid.get((s.studentUid || '').toLowerCase());
        if (!row) return s;
        return { ...s, score: row.score, remarks: row.remarks || s.remarks, dirty: true };
      })
    );
    toast.success(`Imported scores for ${byUid.size} row(s). Review and Save.`);
  };

  const handleLock = async () => {
    if (!selectedExamId) return;
    if (!confirm('Lock this exam? Marks cannot be edited after lock (status becomes Completed).')) return;
    try {
      await updateExam(selectedExamId, { status: 'COMPLETED' });
      setExams((prev) => prev.map((e) => (e.id === selectedExamId ? { ...e, status: 'COMPLETED' } : e)));
    } catch {
      /* interceptor toasts the error */
    }
  };

  const dirtyCount = students.filter(s => s.dirty && s.score !== '').length;
  const totalStudents = students.length;
  const markedStudents = students.filter(s => s.score !== '').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8f9fa', overflow: 'hidden' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 3 }, py: 1, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GradingIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8125rem', md: '0.9375rem' } }}>Marks Entry</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {totalStudents > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>{markedStudents}</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>entered</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{totalStudents}</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>students</Typography>
              </Box>
            </Box>
          )}
          <Button
            variant="outlined"
            disabled={!selectedExamId || !selectedClassId || !selectedSubjectId || locked}
            onClick={() => csvInputRef.current?.click()}
            startIcon={<UploadFileIcon />}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}
          >
            Import CSV
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleCsvImport(file);
              e.target.value = '';
            }}
          />
          <Button
            variant="outlined"
            color="warning"
            disabled={!selectedExamId || locked}
            onClick={() => void handleLock()}
            startIcon={<LockIcon />}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' }}
          >
            {locked ? 'Locked' : 'Lock marks'}
          </Button>
          <Button
            variant="contained"
            disabled={saving || dirtyCount === 0 || !selectedExamId || !selectedClassId || !selectedSubjectId || locked}
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {saving ? 'Saving...' : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
          </Button>
        </Box>
      </Box>

      {/* Selectors */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: 2, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: { xs: 2, md: 3 }, maxWidth: 1100 }}>
          <Field label="Exam">
            <Autocomplete
              options={exams}
              value={selectedExam}
              onChange={(_, v) => { setSelectedExamId(v?.id ?? null); setSelectedClassId(null); setSelectedSubjectId(null); setStudents([]); setAllMarks([]); }}
              getOptionLabel={(opt) => `${opt.name} (${opt.academicYear})`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              loading={loadingExams}
              renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select exam" />}
              fullWidth size="small"
            />
          </Field>
          <Field label="Class">
            <Autocomplete
              options={classes}
              value={selectedClass}
              onChange={(_, v) => { setSelectedClassId(v?.id ?? null); setSelectedSubjectId(null); setStudents([]); setAllMarks([]); }}
              getOptionLabel={(opt) => opt.stream ? `${opt.name} ${opt.stream}` : opt.name}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              loading={loadingClasses}
              disabled={!selectedExamId}
              renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select class" />}
              fullWidth size="small"
            />
          </Field>
          <Field label="Subject">
            <Autocomplete
              options={subjects}
              value={selectedSubject}
              onChange={(_, v) => { setSelectedSubjectId(v?.id ?? null); setAllMarks([]); }}
              getOptionLabel={(opt) => opt.code ? `${opt.name} (${opt.code})` : opt.name}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              loading={loadingSubjects}
              disabled={!selectedClassId}
              renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select subject" />}
              fullWidth size="small"
            />
          </Field>
        </Box>
      </Box>

      {/* Marks Table */}
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 4 } }}>
        {!selectedExamId || !selectedClassId || !selectedSubjectId ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            <GradingIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>Select Exam, Class & Subject</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Choose the exam, class and subject above to start entering marks</Typography>
          </Box>
        ) : loadingStudents ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : students.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            <SchoolIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>No Students Found</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>No active students enrolled in this class for {academicYear}</Typography>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {/* Entry Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 1.5, borderRadius: 1, bgcolor: 'rgba(25,118,210,0.04)', border: '1px solid', borderColor: 'rgba(25,118,210,0.12)' }}>
              <GradingIcon sx={{ color: 'primary.main', fontSize: 18 }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                  {selectedExam?.name} — {selectedClass?.stream ? `${selectedClass.name} ${selectedClass.stream}` : selectedClass?.name} — {selectedSubject?.name}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {selectedExam?.totalMarks ? `Max marks: ${selectedExam.totalMarks}` : ''} {selectedExam?.passingMarks ? `| Pass: ${selectedExam.passingMarks}` : ''}
                </Typography>
              </Box>
            </Box>

            {/* Header */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 160px', gap: 1, mb: 1, px: 1 }}>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>#</Typography>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Student</Typography>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Score</Typography>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Remarks</Typography>
            </Box>

            {/* Student Rows */}
            {students.map((student, index) => {
              const scoreNum = student.score ? parseFloat(student.score) : null;
              const totalMarks = selectedExam?.totalMarks;
              const passingMarks = selectedExam?.passingMarks;
              const isPassing = scoreNum !== null && passingMarks != null && scoreNum >= passingMarks;
              const isFailing = scoreNum !== null && passingMarks != null && scoreNum < passingMarks;
              const isOverMax = scoreNum !== null && totalMarks != null && scoreNum > totalMarks;

              return (
                <Box
                  key={student.id}
                  sx={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 120px 160px', gap: 1, mb: 0.5, p: 1, borderRadius: 1,
                    bgcolor: student.dirty ? 'rgba(245,158,11,0.04)' : index % 2 !== 0 ? 'rgba(0,0,0,0.01)' : 'white',
                    border: '1px solid', borderColor: student.dirty ? 'rgba(245,158,11,0.2)' : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>{index + 1}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(25,118,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1976d2' }}>{student.firstName[0]}{student.lastName[0]}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.2 }}>{student.firstName} {student.lastName}</Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>{student.studentUid}</Typography>
                    </Box>
                  </Box>
                  <TextField
                    size="small"
                    value={student.score}
                    onChange={(e) => handleScoreChange(student.id, e.target.value)}
                    placeholder="0"
                    type="number"
                    disabled={locked}
                    slotProps={{ htmlInput: { min: 0, max: totalMarks ?? 100, step: 0.5, style: { textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' } } }}
                    error={isOverMax}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, bgcolor: student.score ? (isPassing ? 'rgba(5,150,105,0.04)' : isFailing ? 'rgba(220,38,38,0.04)' : 'white') : 'white' } }}
                  />
                  <TextField
                    size="small"
                    value={student.remarks}
                    onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                    placeholder="Optional"
                    disabled={locked}
                    slotProps={{ htmlInput: { style: { fontSize: '0.75rem' } } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

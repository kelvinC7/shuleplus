import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Drawer, Divider, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CalculateIcon from '@mui/icons-material/Calculate';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Link } from 'react-router-dom';
import {
  listAssignments, listAssessmentTemplates, assignTemplateToClass,
  enterComponentMarks, calculateResults, getClassResults, smListClasses, smListSubjects,
} from '@/services/api';
import type { ApiTemplateAssignment, ApiAssessmentTemplate, ApiClass, ApiStudentResult } from '@/types';
import { api } from '@/services/api';
import { apiErrorMessage, toast } from '@/lib/toast';

type View = 'list' | 'marks' | 'results';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#d1fae5', text: '#059669' },
  DRAFT: { bg: '#f1f5f9', text: '#64748b' },
  COMPLETED: { bg: '#dbeafe', text: '#2563eb' },
  ARCHIVED: { bg: '#e2e8f0', text: '#64748b' },
};

const cellHeaderSx = {
  fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase' as const,
  letterSpacing: '0.05em', color: '#1e293b', bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider',
};

export default function AssignmentPage() {
  const [view, setView] = useState<View>('list');
  const [assignments, setAssignments] = useState<ApiTemplateAssignment[]>([]);
  const [templates, setTemplates] = useState<ApiAssessmentTemplate[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [marksAssignment, setMarksAssignment] = useState<ApiTemplateAssignment | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string | null }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string; studentUid: string }>>([]);
  const [componentScores, setComponentScores] = useState<Record<string, Record<string, string>>>({});
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [resultsAssignment, setResultsAssignment] = useState<ApiTemplateAssignment | null>(null);
  const [results, setResults] = useState<ApiStudentResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignData, templateData, classData] = await Promise.all([
        listAssignments(), listAssessmentTemplates(), smListClasses(),
      ]);
      setAssignments(assignData ?? []);
      setTemplates(templateData ?? []);
      setClasses(classData ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (view !== 'list') return;
    setDrawerOpen(false);
  }, [view]);

  const filteredAssignments = assignments.filter((a) => {
    if (filterYear && a.academicYear !== filterYear) return false;
    if (filterTerm && a.term !== filterTerm) return false;
    return true;
  });

  const academicYears = [...new Set(assignments.map((a) => a.academicYear))].sort().reverse();
  const terms = [...new Set(assignments.map((a) => a.term))].sort();

  const handleCreateAssignment = async () => {
    if (!newTemplateId || !newClassId) return;
    setSubmitting(true);
    try {
      await assignTemplateToClass(newTemplateId, newClassId);
      setDrawerOpen(false);
      setNewTemplateId('');
      setNewClassId('');
      await fetchData();
    } catch {
      /* interceptor toasts the error */
    } finally {
      setSubmitting(false);
    }
  };

  const openMarksEntry = async (assignment: ApiTemplateAssignment) => {
    setMarksAssignment(assignment);
    setSelectedSubjectId('');
    setStudents([]);
    setComponentScores({});
    setView('marks');
    setLoadingMarks(true);
    try {
      const subjectData = await smListSubjects().catch(() => []);
      setSubjects(subjectData ?? []);
      const enrollRes = await api.get('/marks/students', { params: { classId: assignment.classId, academicYear: assignment.academicYear } });
      const enrolledStudents = enrollRes?.data?.data ?? [];
      setStudents(enrolledStudents);
      const template = templates.find((t) => t.id === assignment.templateId) ?? assignment.template;
      const comps = template?.components ?? [];
      const initial: Record<string, Record<string, string>> = {};
      enrolledStudents.forEach((s: { id: string }) => {
        initial[s.id] = {};
        comps.forEach((c) => { initial[s.id][c.id] = ''; });
      });
      setComponentScores(initial);
    } catch {
      setStudents([]);
    } finally {
      setLoadingMarks(false);
    }
  };

  const handleScoreChange = (studentId: string, componentId: string, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setComponentScores((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [componentId]: value } }));
  };

  const handleSaveMarks = async () => {
    if (!marksAssignment || !selectedSubjectId) return;
    setSavingMarks(true);
    try {
      const marks: Array<{ studentId: string; componentId: string; score: number }> = [];
      for (const [studentId, comps] of Object.entries(componentScores)) {
        for (const [componentId, scoreStr] of Object.entries(comps)) {
          if (scoreStr !== '') {
            marks.push({ studentId, componentId, score: parseFloat(scoreStr) });
          }
        }
      }
      await enterComponentMarks(marksAssignment.id, { subjectId: selectedSubjectId, marks });
    } catch {
      /* interceptor toasts the error */
    } finally {
      setSavingMarks(false);
    }
  };

  const handleCalculate = async (assignmentId: string) => {
    setCalculating(true);
    try {
      await calculateResults(assignmentId);
    } catch {
      /* interceptor toasts the error */
    } finally {
      setCalculating(false);
    }
  };

  const openResults = async (assignment: ApiTemplateAssignment) => {
    setResultsAssignment(assignment);
    setResults([]);
    setView('results');
    setLoadingResults(true);
    try {
      const data = await getClassResults(assignment.id);
      setResults(data ?? []);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Failed to load results'));
    } finally {
      setLoadingResults(false);
    }
  };

  const getTemplateName = (assignment: ApiTemplateAssignment) => assignment.template?.name ?? templates.find((t) => t.id === assignment.templateId)?.name ?? '—';
  const getClassName = (assignment: ApiTemplateAssignment) => assignment.class?.name ?? classes.find((c) => c.id === assignment.classId)?.name ?? '—';
  const getComponents = (assignment: ApiTemplateAssignment) => assignment.template?.components ?? templates.find((t) => t.id === assignment.templateId)?.components ?? [];

  if (view === 'marks' && marksAssignment) {
    const template = templates.find((t) => t.id === marksAssignment.templateId) ?? marksAssignment.template;
    const components = template?.components ?? [];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => { setView('list'); setMarksAssignment(null); }}><ArrowBackIcon sx={{ fontSize: 18 }} /></IconButton>
            <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 600, color: '#1e293b' }}>Enter Marks</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={savingMarks ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
              disabled={savingMarks || !selectedSubjectId}
              onClick={handleSaveMarks}
              sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {savingMarks ? 'Saving...' : 'Save Marks'}
            </Button>
            <Button
              variant="outlined"
              startIcon={calculating ? <CircularProgress size={14} /> : <CalculateIcon />}
              disabled={calculating}
              onClick={() => handleCalculate(marksAssignment.id)}
              sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderColor: '#FCB038', color: '#000435', '&:hover': { borderColor: '#e69a2e', bgcolor: 'rgba(252,176,56,0.04)' } }}
            >
              {calculating ? 'Calculating...' : 'Calculate'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.5, bgcolor: 'rgba(0,4,53,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <AssignmentIcon sx={{ color: '#000435', fontSize: 18 }} />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{getTemplateName(marksAssignment)}</Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>—</Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{getClassName(marksAssignment)}</Typography>
            <Chip label={marksAssignment.academicYear} size="small" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'rgba(0,4,53,0.06)', color: '#000435' }} />
            <Chip label={marksAssignment.term} size="small" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'rgba(252,176,56,0.12)', color: '#e69a2e' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ fontSize: '0.8125rem' }}>Subject</InputLabel>
              <Select
                value={selectedSubjectId}
                label="Subject"
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                sx={{ fontSize: '0.8125rem' }}
              >
                {subjects.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.code ? `${s.name} (${s.code})` : s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{students.length} students</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1.5, md: 2.5 } }}>
          {loadingMarks ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
          ) : !selectedSubjectId ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <AssignmentIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>Select a Subject</Typography>
              <Typography sx={{ fontSize: '0.875rem' }}>Choose a subject above to start entering marks for each component</Typography>
            </Box>
          ) : students.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>No Students Found</Typography>
              <Typography sx={{ fontSize: '0.875rem' }}>No students enrolled in this class for {marksAssignment.academicYear}</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...cellHeaderSx, width: 40 }}>#</TableCell>
                    <TableCell sx={cellHeaderSx}>Student Name</TableCell>
                    {components.map((comp) => (
                      <TableCell key={comp.id} sx={{ ...cellHeaderSx, textAlign: 'center' }}>
                        <Box>{comp.name}</Box>
                        <Typography sx={{ fontSize: '0.5625rem', fontWeight: 500, color: '#94a3b8', textTransform: 'none' }}>Max: {comp.maxMark}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, idx) => (
                    <TableRow key={student.id} sx={{ bgcolor: idx % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white', '&:hover': { bgcolor: 'rgba(0,31,63,0.04)' } }}>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid', borderColor: 'divider' }}>{idx + 1}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{student.firstName} {student.lastName}</Typography>
                        <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>{student.studentUid}</Typography>
                      </TableCell>
                      {components.map((comp) => (
                        <TableCell key={comp.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center', p: 0.5 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={componentScores[student.id]?.[comp.id] ?? ''}
                            onChange={(e) => handleScoreChange(student.id, comp.id, e.target.value)}
                            placeholder="—"
                            slotProps={{ htmlInput: { min: 0, max: comp.maxMark, step: 0.5, style: { textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600 } } }}
                            sx={{ width: 70, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    );
  }

  if (view === 'results' && resultsAssignment) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => { setView('list'); setResultsAssignment(null); }}><ArrowBackIcon sx={{ fontSize: 18 }} /></IconButton>
            <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 600, color: '#1e293b' }}>Class Results</Typography>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.5, bgcolor: 'rgba(0,4,53,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AssignmentIcon sx={{ color: '#000435', fontSize: 18 }} />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{getTemplateName(resultsAssignment)}</Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>—</Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{getClassName(resultsAssignment)}</Typography>
            <Chip label={resultsAssignment.academicYear} size="small" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'rgba(0,4,53,0.06)', color: '#000435' }} />
            <Chip label={resultsAssignment.term} size="small" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'rgba(252,176,56,0.12)', color: '#e69a2e' }} />
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1.5, md: 2.5 } }}>
          {loadingResults ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
          ) : results.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <CalculateIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>No Results</Typography>
              <Typography sx={{ fontSize: '0.875rem' }}>No results calculated yet. Enter marks and click Calculate first.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...cellHeaderSx, width: 40 }}>#</TableCell>
                    <TableCell sx={cellHeaderSx}>Student</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Subject</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Total</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Average</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Percentage</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Grade</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Rank</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((r, idx) => (
                    <TableRow key={r.id} sx={{ bgcolor: idx % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white', '&:hover': { bgcolor: 'rgba(0,31,63,0.04)' } }}>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid', borderColor: 'divider' }}>{idx + 1}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{r.student?.firstName} {r.student?.lastName}</Typography>
                        <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>{r.student?.studentUid}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>{r.subject?.name ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>{r.totalScore}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>{r.averageScore ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>{r.percentage != null ? `${r.percentage.toFixed(1)}%` : '—'}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                        {r.grade ? (
                          <Chip label={r.grade} size="small" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700, bgcolor: 'rgba(0,4,53,0.06)', color: '#000435' }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>{r.rank ?? '—'}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                        <Chip
                          label={r.status}
                          size="small"
                          sx={{
                            height: 20, fontSize: '0.6875rem', fontWeight: 700,
                            bgcolor: r.status === 'PASSED' ? '#d1fae5' : r.status === 'FAILED' ? '#fee2e2' : '#f1f5f9',
                            color: r.status === 'PASSED' ? '#059669' : r.status === 'FAILED' ? '#dc2626' : '#64748b',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssignmentIcon sx={{ color: '#000435', fontSize: 20 }} />
          <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 700, color: '#1e293b' }}>Assignments</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDrawerOpen(true)}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}
          >
            New Assignment
          </Button>
        </Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>{filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}</Typography>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ width: 224, borderRight: '1px solid', borderColor: 'divider', p: 1.5, overflow: 'auto', flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>ACADEMIC YEAR</Typography>
          <Box onClick={() => setFilterYear('')} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: filterYear === '' ? 'rgba(252,176,56,0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(252,176,56,0.12)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: filterYear === '' ? '#000435' : '#1e293b' }}>All Years</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: filterYear === '' ? '#000435' : '#64748b' }}>{assignments.length}</Typography>
          </Box>
          {academicYears.map((y) => (
            <Box key={y} onClick={() => setFilterYear(filterYear === y ? '' : y)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.4, borderRadius: 0.5, cursor: 'pointer', bgcolor: filterYear === y ? 'rgba(252,176,56,0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(252,176,56,0.12)' } }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: filterYear === y ? 600 : 500, color: filterYear === y ? '#000435' : '#475569' }}>{y}</Typography>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: filterYear === y ? '#000435' : '#94a3b8' }}>{assignments.filter((a) => a.academicYear === y).length}</Typography>
            </Box>
          ))}

          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 2, mb: 1.5 }}>TERM</Typography>
          <Box onClick={() => setFilterTerm('')} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: filterTerm === '' ? 'rgba(252,176,56,0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(252,176,56,0.12)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: filterTerm === '' ? '#000435' : '#1e293b' }}>All Terms</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: filterTerm === '' ? '#000435' : '#64748b' }}>{assignments.length}</Typography>
          </Box>
          {terms.map((t) => (
            <Box key={t} onClick={() => setFilterTerm(filterTerm === t ? '' : t)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.4, borderRadius: 0.5, cursor: 'pointer', bgcolor: filterTerm === t ? 'rgba(252,176,56,0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(252,176,56,0.12)' } }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: filterTerm === t ? 600 : 500, color: filterTerm === t ? '#000435' : '#475569' }}>{t}</Typography>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: filterTerm === t ? '#000435' : '#94a3b8' }}>{assignments.filter((a) => a.term === t).length}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}><CircularProgress size={24} /></Box>
          ) : (
            <TableContainer sx={{ boxShadow: 'none', borderRadius: 0 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...cellHeaderSx, width: 40 }}>#</TableCell>
                    <TableCell sx={cellHeaderSx}>Template Name</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', sm: 'table-cell' } }}>Class</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Year</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Term</TableCell>
                    <TableCell sx={cellHeaderSx}>Status</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', lg: 'table-cell' } }}>Components</TableCell>
                    <TableCell sx={{ ...cellHeaderSx, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
                        <AssignmentIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                        <Typography variant="body2" color="text.secondary">No assignments found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map((assignment, idx) => {
                      const colors = STATUS_COLORS[assignment.status] ?? STATUS_COLORS.DRAFT;
                      const comps = getComponents(assignment);
                      return (
                        <TableRow
                          key={assignment.id}
                          sx={{ bgcolor: idx % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white', '&:hover': { bgcolor: 'rgba(0,31,63,0.04)' } }}
                        >
                          <TableCell sx={{ fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid', borderColor: 'divider' }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(0,4,53,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AssignmentIcon sx={{ fontSize: 16, color: '#000435' }} />
                              </Box>
                              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{getTemplateName(assignment)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'table-cell' } }}>{getClassName(assignment)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{assignment.academicYear}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{assignment.term}</TableCell>
                          <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'inline-flex', px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: colors.bg }}>
                              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: colors.text, textTransform: 'uppercase' }}>{assignment.status}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', lg: 'table-cell' } }}>{comps.length}</TableCell>
                          <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <Button
                                size="small"
                                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                                onClick={() => openMarksEntry(assignment)}
                                sx={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#000435', '&:hover': { bgcolor: 'rgba(0,4,53,0.04)' } }}
                              >
                                Enter Marks
                              </Button>
                              <Button
                                size="small"
                                startIcon={<CalculateIcon sx={{ fontSize: 14 }} />}
                                disabled={calculating}
                                onClick={() => handleCalculate(assignment.id)}
                                sx={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#e69a2e', '&:hover': { bgcolor: 'rgba(252,176,56,0.08)' } }}
                              >
                                Calculate
                              </Button>
                              <Button
                                size="small"
                                startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                                onClick={() => openResults(assignment)}
                                sx={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#2563eb', '&:hover': { bgcolor: 'rgba(37,99,235,0.04)' } }}
                              >
                                View Results
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 }, p: 0 } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon sx={{ color: '#000435', fontSize: 20 }} />
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>New Assignment</Typography>
          </Box>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </Box>

        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
            Assign an assessment template to a class. The template defines the grading components (CAT, Final, etc.) for this assignment.
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '0.8125rem' }}>Assessment Template</InputLabel>
            <Select
              value={newTemplateId}
              label="Assessment Template"
              onChange={(e) => setNewTemplateId(e.target.value)}
              sx={{ fontSize: '0.8125rem' }}
            >
              {templates.filter((t) => t.status === 'ACTIVE').map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Box>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{t.name}</Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{t.academicYear} — {t.term} — {t.components?.length ?? 0} components</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '0.8125rem' }}>Class</InputLabel>
            <Select
              value={newClassId}
              label="Class"
              onChange={(e) => setNewClassId(e.target.value)}
              sx={{ fontSize: '0.8125rem' }}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{c.stream ? `${c.name} ${c.stream}` : c.name}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          <Button
            variant="contained"
            fullWidth
            disabled={!newTemplateId || !newClassId || submitting}
            onClick={handleCreateAssignment}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            sx={{ fontWeight: 700, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}
          >
            {submitting ? 'Assigning...' : 'Assign Template to Class'}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}

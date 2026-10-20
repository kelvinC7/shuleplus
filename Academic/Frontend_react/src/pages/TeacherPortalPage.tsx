import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Card, CardContent, LinearProgress,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PendingIcon from '@mui/icons-material/Pending';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import { getTeacherDashboard, smListClasses, smListStudents, smListSubjects } from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type { ApiAssessment } from '@/types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f1f5f9', color: '#64748b' },
  OPEN: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  MARK_ENTRY: { bg: 'rgba(59,130,246,0.08)', color: '#2563eb' },
  SUBMITTED: { bg: 'rgba(245,158,11,0.08)', color: '#d97706' },
  REVIEWED: { bg: 'rgba(139,92,246,0.08)', color: '#7c3aed' },
  APPROVED: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  LOCKED: { bg: 'rgba(0,4,53,0.05)', color: '#000435' },
};

interface CourseSummary {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  studentCount: number;
  assessments: ApiAssessment[];
}

export default function TeacherPortalPage() {
  const navigate = useNavigate();
  const { settings } = useAcademicSettings();
  const [filterYear, setFilterYear] = useState(settings?.currentAcademicYear || '');
  const [filterTerm, setFilterTerm] = useState(settings?.currentTerm || '');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Map<string, number>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, cls, subj] = await Promise.all([
        getTeacherDashboard().catch(() => null),
        smListClasses().catch(() => []),
        smListSubjects().catch(() => []),
      ]);
      setDashboard(dash);
      setClasses(cls);
      setSubjects(subj);

      if (cls.length > 0) {
        const counts = new Map<string, number>();
        for (const c of cls) {
          try {
            const students = await smListStudents({ classId: c.id });
            counts.set(c.id, students?.length ?? 0);
          } catch {
            counts.set(c.id, 0);
          }
        }
        setStudentCounts(counts);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (settings?.currentAcademicYear) setFilterYear(settings.currentAcademicYear);
    if (settings?.currentTerm) setFilterTerm(settings.currentTerm);
  }, [settings]);

  const filteredAssessments: ApiAssessment[] = useMemo(() => {
    if (!dashboard?.assessments) return [];
    return dashboard.assessments.filter((a: ApiAssessment) => {
      if (filterYear && a.academicYear !== filterYear) return false;
      if (filterTerm && a.term !== filterTerm) return false;
      return true;
    });
  }, [dashboard, filterYear, filterTerm]);

  const courses: CourseSummary[] = useMemo(() => {
    const map = new Map<string, CourseSummary>();
    for (const a of filteredAssessments) {
      const key = `${a.subjectId}-${a.classId}`;
      if (!map.has(key)) {
        const cls = classes.find((c: any) => c.id === a.classId);
        map.set(key, {
          subjectId: a.subjectId,
          subjectName: a.subject?.name || 'Unknown',
          classId: a.classId,
          className: cls ? (cls.stream ? `${cls.name} ${cls.stream}` : cls.name) : a.class?.name || 'Unknown',
          studentCount: studentCounts.get(a.classId) ?? 0,
          assessments: [],
        });
      }
      map.get(key)!.assessments.push(a);
    }
    return Array.from(map.values());
  }, [filteredAssessments, classes, studentCounts]);

  const totalAssessments = filteredAssessments.length;
  const completedAssessments = filteredAssessments.filter((a) => ['APPROVED', 'LOCKED'].includes(a.status)).length;
  const pendingAssessments = filteredAssessments.filter((a) => ['OPEN', 'MARK_ENTRY'].includes(a.status)).length;
  const draftAssessments = filteredAssessments.filter((a) => a.status === 'DRAFT').length;
  const completionRate = totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0;

  const academicYears = useMemo(() => {
    const set = new Set<string>();
    dashboard?.assessments?.forEach((a: any) => set.add(a.academicYear));
    if (settings?.academicYears) settings.academicYears.forEach((y) => set.add(y));
    return Array.from(set).sort().reverse();
  }, [dashboard, settings]);

  const terms = useMemo(() => {
    const set = new Set<string>();
    dashboard?.assessments?.forEach((a: any) => { if (a.term) set.add(a.term); });
    if (settings?.terms) settings.terms.forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [dashboard, settings]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}><CircularProgress size={24} /></Box>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f4f6f9' }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexShrink: 0, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleIcon sx={{ color: '#000435', fontSize: 22 }} />
          <Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#000435' }}>Teacher Portal</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>Manage your courses, assessments, and marks</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select label="Academic Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <MenuItem value=""><em>All Years</em></MenuItem>
              {academicYears.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Term</InputLabel>
            <Select label="Term" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
              <MenuItem value=""><em>All Terms</em></MenuItem>
              {terms.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/teacher/create-assessment')} sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
            Create Assessment
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AssignmentIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{totalAssessments}</Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Assessments</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{completedAssessments}</Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PendingIcon sx={{ fontSize: 18, color: '#d97706' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{pendingAssessments + draftAssessments}</Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{completionRate}%</Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Rate</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* My Courses */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', mb: 1.5 }}>My Courses</Typography>
          {courses.length === 0 ? (
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <PeopleIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>No courses found. Create an assessment to start.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fill, minmax(320px, 1fr))' }, gap: 2 }}>
              {courses.map((course) => {
                const completed = course.assessments.filter((a: ApiAssessment) => ['APPROVED', 'LOCKED'].includes(a.status)).length;
                const total = course.assessments.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <Card key={`${course.subjectId}-${course.classId}`} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }, transition: 'box-shadow 0.2s' }}
                    onClick={() => navigate(`/teacher/create-assessment?subjectId=${course.subjectId}&classId=${course.classId}`)}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>{course.subjectName}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{course.className} — {course.studentCount} students</Typography>
                        </Box>
                        <Chip label={`${completed}/${total}`} size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700, bgcolor: pct === 100 ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', color: pct === 100 ? '#16a34a' : '#d97706' }} />
                      </Box>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#f1f5f9', mb: 1.5, '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: pct === 100 ? '#16a34a' : '#d97706' } }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {course.assessments.slice(0, 4).map((a: ApiAssessment) => {
                          const sc = STATUS_COLORS[a.status] || STATUS_COLORS.DRAFT;
                          return (
                            <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography sx={{ fontSize: '0.75rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{a.title}</Typography>
                              <Chip label={a.status} size="small" sx={{ height: 18, fontSize: '0.5625rem', fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                            </Box>
                          );
                        })}
                        {course.assessments.length > 4 && (
                          <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', mt: 0.25 }}>+{course.assessments.length - 4} more</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Recent Assessments */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>Recent Assessments</Typography>
            {filteredAssessments.length > 0 && (
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}</Typography>
            )}
          </Box>
          {filteredAssessments.length === 0 ? (
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>No assessments found for the selected period.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              {filteredAssessments.slice(0, 10).map((a, idx) => {
                const sc = STATUS_COLORS[a.status] || STATUS_COLORS.DRAFT;
                const pct = a.maxMark > 0 ? Math.round((0 / a.maxMark) * 100) : 0;
                return (
                  <Box key={a.id}>
                    {idx > 0 && <Divider />}
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}
                      onClick={() => {
                        if (['MARK_ENTRY', 'OPEN'].includes(a.status)) navigate(`/teacher/mark-entry/${a.id}`);
                        else if (['APPROVED', 'LOCKED', 'REVIEWED', 'SUBMITTED'].includes(a.status)) navigate(`/teacher/analytics/${a.id}`);
                        else navigate(`/assessments/${a.id}`);
                      }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>{a.title}</Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                          {a.subject?.name} — {a.class?.stream ? `${a.class?.name} ${a.class?.stream}` : a.class?.name} · Max: {a.maxMark}
                        </Typography>
                      </Box>
                      <Chip label={a.status} size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700, bgcolor: sc.bg, color: sc.color, flexShrink: 0 }} />
                    </Box>
                  </Box>
                );
              })}
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
}

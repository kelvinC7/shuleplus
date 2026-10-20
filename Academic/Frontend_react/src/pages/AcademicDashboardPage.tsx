import { useState, useEffect } from 'react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, FormControl, InputLabel,
  Select, MenuItem,
} from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { getAcademicDashboard } from '@/services/api';
import type { AcademicDashboard } from '@/types';

const NAVY = '#000435';

export default function AcademicDashboardPage() {
  const { settings } = useAcademicSettings();
  const [academicYear, setAcademicYear] = useState(settings?.currentAcademicYear || '');
  const [term, setTerm] = useState(settings?.currentTerm || '');
  const [dashboard, setDashboard] = useState<AcademicDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings?.currentAcademicYear && !academicYear) setAcademicYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !term) setTerm(settings.currentTerm);
  }, [settings, academicYear, term]);

  useEffect(() => {
    if (!academicYear) return;
    setLoading(true);
    getAcademicDashboard(academicYear, term || undefined)
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [academicYear, term]);

  const stats = dashboard
    ? [
        { label: 'Total Students', value: String(dashboard.totalStudents), hint: 'Student Management', icon: <PeopleOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#2563eb' },
        { label: 'Classes', value: String(dashboard.totalClasses ?? 0), hint: 'Student Management', icon: <ClassOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#0f766e' },
        { label: 'Subjects', value: String(dashboard.totalSubjects ?? 0), hint: 'Curriculum', icon: <MenuBookOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#7c3aed' },
        { label: 'Assessments', value: String(dashboard.totalAssessments), hint: academicYear, icon: <AssessmentOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#d97706' },
        { label: 'Marks completed', value: `${dashboard.marksCompleted}%`, hint: 'Assessments with marks', icon: <TaskAltOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#16a34a' },
        { label: 'Results published', value: `${dashboard.resultsPublished}%`, hint: 'Published results', icon: <PublishedWithChangesOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#0284c7' },
        { label: 'School average', value: `${dashboard.schoolAverage}%`, hint: 'From published results', icon: <TrendingUpOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#db2777' },
        { label: 'Pass rate', value: `${dashboard.passRate}%`, hint: '50% and above', icon: <VerifiedOutlinedIcon sx={{ fontSize: 22 }} />, tone: '#059669' },
      ]
    : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: NAVY }}>Academic Dashboard</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live students from Student Management · results from Academic</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {(settings?.academicYears ?? []).map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Term</InputLabel>
            <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
              <MenuItem value="">All Terms</MenuItem>
              {(settings?.terms ?? []).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : dashboard ? (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
              {stats.map((item) => (
                <Box key={item.label} sx={{ p: 2.25, border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#ffffff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: '12px', bgcolor: `${item.tone}14`, color: item.tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.icon}
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '1.55rem', fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>{item.value}</Typography>
                  <Typography sx={{ mt: 0.6, fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>{item.hint}</Typography>
                </Box>
              ))}
            </Box>

            {dashboard.levelPerformance && dashboard.levelPerformance.length > 0 && (
              <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#ffffff' }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 2 }}>
                  Class performance
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc' }}>Class</TableCell>
                        <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', textAlign: 'center' }}>Average %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.levelPerformance.map((lp, idx) => (
                        <TableRow key={lp.classId} sx={{ bgcolor: idx % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white' }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{lp.className || lp.classId}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', color: NAVY }}>
                            {lp._avg?.percentage != null ? `${Math.round(lp._avg.percentage * 100) / 100}%` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>Select an academic year to view dashboard</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

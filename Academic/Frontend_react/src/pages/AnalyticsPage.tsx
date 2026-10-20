import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Chip,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { getAcademicDashboard, smListClasses } from '@/services/api';
import type { AcademicDashboard } from '@/types';

export default function AnalyticsPage() {
  const { settings } = useAcademicSettings();
  const [academicYear, setAcademicYear] = useState(settings?.currentAcademicYear || '');
  const [term, setTerm] = useState(settings?.currentTerm || '');

  useEffect(() => {
    if (settings?.currentAcademicYear && !academicYear) setAcademicYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !term) setTerm(settings.currentTerm);
  }, [settings, academicYear, term]);
  const [dashboard, setDashboard] = useState<AcademicDashboard | null>(null);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    smListClasses()
      .then((rows: any[]) => {
        const map: Record<string, string> = {};
        for (const c of rows ?? []) {
          map[c.id] = c.stream ? `${c.name} ${c.stream}` : c.name;
        }
        setClassNames(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!academicYear) return;
    setLoading(true);
    getAcademicDashboard(academicYear, term || undefined)
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [academicYear, term]);

  const kpis = dashboard
    ? [
        { label: 'Students', value: String(dashboard.totalStudents) },
        { label: 'Classes', value: String(dashboard.totalClasses ?? 0) },
        { label: 'Pass rate', value: `${dashboard.passRate}%` },
        { label: 'School average', value: `${dashboard.schoolAverage}%` },
      ]
    : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', gap: 1.5 }}>
        <InsightsIcon sx={{ color: '#000435', fontSize: 20 }} />
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>Academic Analytics</Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
          <Chip component={Link} to="/competency" clickable label="CBC competency" sx={{ fontWeight: 700 }} />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : dashboard ? (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
              {kpis.map((k) => (
                <Box key={k.label} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#fff', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#000435' }}>{k.value}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#fff' }}>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 2 }}>Class rank / average</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Class</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textAlign: 'center' }}>Average</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...(dashboard.levelPerformance ?? [])]
                        .sort((a, b) => Number(b._avg?.percentage ?? 0) - Number(a._avg?.percentage ?? 0))
                        .map((lp, idx) => (
                          <TableRow key={lp.classId}>
                            <TableCell sx={{ fontWeight: 600 }}>#{idx + 1} {lp.className || classNames[lp.classId] || lp.classId}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                              {lp._avg?.percentage != null ? `${Math.round(lp._avg.percentage * 100) / 100}%` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#fff' }}>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 2 }}>Subject comparison</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textAlign: 'center' }}>Average</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textAlign: 'center' }}>Students</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(dashboard.subjectAverages ?? []).map((s) => (
                        <TableRow key={s.subjectId}>
                          <TableCell sx={{ fontWeight: 600 }}>{s.subjectName}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>{s.averagePercentage}%</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{s.studentCount}</TableCell>
                        </TableRow>
                      ))}
                      {(dashboard.subjectAverages ?? []).length === 0 && (
                        <TableRow><TableCell colSpan={3} sx={{ color: '#94a3b8' }}>No subject results yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>

            {(dashboard.gradeDistribution ?? []).length > 0 && (
              <Box sx={{ mt: 2, p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#fff' }}>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 2 }}>Grade distribution</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {dashboard.gradeDistribution!.map((g) => (
                    <Chip key={g.grade} label={`${g.grade}: ${g.count} (${g.percentage}%)`} sx={{ fontWeight: 700 }} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 8 }}>Select an academic year to load analytics.</Typography>
        )}
      </Box>
    </Box>
  );
}

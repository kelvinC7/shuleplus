import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Autocomplete, Divider, Paper, Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SchoolIcon from '@mui/icons-material/School';
import { api, listClasses, getReportCard, getGrowthData } from '@/services/api';
import type { ReportCardData, GrowthData, ApiClass, Student } from '@/types';

const NAVY = '#000435';
const AMBER = '#FCB038';

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    #report-card-printable, #report-card-printable * { visibility: visible; }
    #report-card-printable {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 16px;
    }
    .no-print { display: none !important; }
    .print-break { page-break-before: always; }
  }
`;

function getGradeColor(grade: string | null): string {
  if (!grade) return '#757575';
  const g = grade.toUpperCase();
  if (g === 'A') return '#2e7d32';
  if (g === 'B') return '#1565c0';
  if (g === 'C') return AMBER;
  if (g === 'D') return '#e65100';
  return '#c62828';
}

function formatPercentage(val: number): string {
  return val.toFixed(1) + '%';
}

export default function ReportCardsPage() {
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [academicYear, setAcademicYear] = useState('');

  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingClasses(true);
    listClasses()
      .then((data: ApiClass[]) => setClasses(data))
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
  }, []);

  useEffect(() => {
    setLoadingStudents(true);
    api.get('/students')
      .then((res) => setStudents(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  const studentOptions = useMemo(() => {
    return students.map((s) => ({
      ...s,
      label: `${s.firstName} ${s.lastName} (${s.studentUid})`,
    }));
  }, [students]);

  const handleSearch = useCallback(async () => {
    if (!selectedStudent || !selectedClassId || !academicYear.trim()) return;
    setLoadingReport(true);
    setReportError(null);
    setReportCard(null);
    setGrowthData(null);
    try {
      const [rc, gd] = await Promise.all([
        getReportCard({
          studentId: selectedStudent.id,
          classId: selectedClassId,
          academicYear: academicYear.trim(),
        }),
        getGrowthData({
          studentId: selectedStudent.id,
          classId: selectedClassId,
        }),
      ]);
      setReportCard(rc);
      setGrowthData(gd);
    } catch {
      setReportError('Failed to load report card. Please check your selection and try again.');
    } finally {
      setLoadingReport(false);
    }
  }, [selectedStudent, selectedClassId, academicYear]);

  const handleBack = useCallback(() => {
    setReportCard(null);
    setGrowthData(null);
    setReportError(null);
  }, []);

  const componentNames = useMemo(() => {
    if (!reportCard || reportCard.subjects.length === 0) return [];
    const firstSubject = reportCard.subjects[0];
    return Object.keys(firstSubject.scores);
  }, [reportCard]);

  if (reportCard) {
    return (
      <>
        <style>{PRINT_STYLES}</style>
        <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', pb: 4 }}>
          <Box className="no-print" sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ color: NAVY, fontWeight: 600 }}>
              Back to Search
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: NAVY, fontWeight: 600 }}>
              Print
            </Button>
          </Box>

          <Box id="report-card-printable" sx={{ maxWidth: 900, mx: 'auto', mt: 3, bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <Box sx={{ bgcolor: NAVY, color: 'white', px: 4, py: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ width: 70, height: 70, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SchoolIcon sx={{ fontSize: 36, color: AMBER }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Report Card</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                  {reportCard.class?.name ?? 'N/A'} &middot; {reportCard.academicYear} &middot; Term {reportCard.term ?? 'N/A'}
                </Typography>
              </Box>
              {reportCard.student?.studentPhoto ? (
                <Box component="img" src={reportCard.student.studentPhoto} alt="Student" sx={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${AMBER}` }} />
              ) : (
                <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${AMBER}` }}>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: AMBER }}>
                    {reportCard.student?.firstName?.[0] ?? ''}{reportCard.student?.lastName?.[0] ?? ''}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ px: 4, py: 3, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Box>
                <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Student Name</Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: NAVY }}>{reportCard.student?.firstName} {reportCard.student?.lastName}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Student ID</Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: NAVY }}>{reportCard.student?.studentUid}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Average Score</Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: NAVY }}>{formatPercentage(reportCard.averagePercentage)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: NAVY }}>{formatPercentage(reportCard.totalPercentage)}</Typography>
              </Box>
            </Box>

            <Box sx={{ px: 4, py: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>Subject Performance</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <Box component="thead">
                    <Box component="tr">
                      <Box component="th" sx={{ textAlign: 'left', py: 1.5, px: 1, borderBottom: `2px solid ${NAVY}`, color: NAVY, fontWeight: 700, whiteSpace: 'nowrap' }}>Subject</Box>
                      {componentNames.map((name) => (
                        <Box key={name} component="th" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: `2px solid ${NAVY}`, color: NAVY, fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</Box>
                      ))}
                      <Box component="th" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: `2px solid ${NAVY}`, color: NAVY, fontWeight: 700 }}>Total</Box>
                      <Box component="th" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: `2px solid ${NAVY}`, color: NAVY, fontWeight: 700 }}>%</Box>
                      <Box component="th" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: `2px solid ${NAVY}`, color: NAVY, fontWeight: 700 }}>Grade</Box>
                      <Box component="th" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: `2px solid ${NAVY}`, color: NAVY, fontWeight: 700 }}>Rank</Box>
                      <Box component="th" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: `2px solid ${NAVY}`, color: NAVY, fontWeight: 700 }}>Class</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {reportCard.subjects.map((subj, idx) => (
                      <Box component="tr" key={subj.subjectId} sx={{ bgcolor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <Box component="td" sx={{ py: 1.5, px: 1, borderBottom: '1px solid #e0e0e0', fontWeight: 600, whiteSpace: 'nowrap' }}>{subj.subject}</Box>
                        {componentNames.map((name) => (
                          <Box key={name} component="td" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: '1px solid #e0e0e0', color: '#616161' }}>
                            {subj.scores[name] != null ? subj.scores[name] : '—'}
                          </Box>
                        ))}
                        <Box component="td" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>{subj.totalScore}</Box>
                        <Box component="td" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>{formatPercentage(subj.percentage)}</Box>
                        <Box component="td" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: '1px solid #e0e0e0' }}>
                          <Chip label={subj.grade ?? '—'} size="small" sx={{ bgcolor: getGradeColor(subj.grade), color: 'white', fontWeight: 700, minWidth: 36, fontSize: '0.75rem' }} />
                        </Box>
                        <Box component="td" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>{subj.rank ?? '—'}</Box>
                        <Box component="td" sx={{ textAlign: 'center', py: 1.5, px: 1, borderBottom: '1px solid #e0e0e0', color: '#757575' }}>{subj.classSize ?? '—'}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mx: 4 }} />

            <Box sx={{ px: 4, py: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>Overall Summary</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', fontWeight: 600, textTransform: 'uppercase' }}>Total Percentage</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: NAVY, mt: 0.5 }}>{formatPercentage(reportCard.totalPercentage)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', fontWeight: 600, textTransform: 'uppercase' }}>Average</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: NAVY, mt: 0.5 }}>{formatPercentage(reportCard.averagePercentage)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', fontWeight: 600, textTransform: 'uppercase' }}>Class Rank</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: NAVY, mt: 0.5 }}>
                    {reportCard.subjects[0]?.rank != null ? `${reportCard.subjects[0].rank} / ${reportCard.subjects[0].classSize ?? '?'}` : 'N/A'}
                  </Typography>
                </Paper>
              </Box>
            </Box>

            {growthData && growthData.termAverages.length > 0 && (
              <>
                <Divider sx={{ mx: 4 }} />
                <Box sx={{ px: 4, py: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ color: AMBER }} /> Termly Growth
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {growthData.termAverages.map((term, idx) => {
                      const maxAvg = Math.max(...growthData.termAverages.map((t) => t.averagePercentage), 100);
                      const barWidth = Math.min((term.averagePercentage / maxAvg) * 100, 100);
                      return (
                        <Box key={`${term.period}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ width: 100, fontSize: '0.8125rem', fontWeight: 600, color: NAVY, flexShrink: 0, textAlign: 'right' }}>{term.period}</Typography>
                          <Box sx={{ flex: 1, height: 28, bgcolor: '#f0f0f0', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                            <Box
                              sx={{
                                height: '100%',
                                width: `${barWidth}%`,
                                borderRadius: 1,
                                background: `linear-gradient(90deg, ${NAVY}, ${AMBER})`,
                                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                transitionDelay: `${idx * 100}ms`,
                              }}
                            />
                          </Box>
                          <Typography sx={{ width: 56, fontSize: '0.8125rem', fontWeight: 700, color: NAVY }}>{formatPercentage(term.averagePercentage)}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </>
            )}

            {growthData && Object.keys(growthData.subjectGrowth).length > 0 && (
              <>
                <Divider sx={{ mx: 4 }} />
                <Box sx={{ px: 4, py: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY, mb: 2 }}>Subject Growth</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
                    {Object.entries(growthData.subjectGrowth).map(([subject, entries]) => {
                      if (entries.length < 2) return null;
                      const first = entries[0].percentage;
                      const last = entries[entries.length - 1].percentage;
                      const change = last - first;
                      const isUp = change > 0;
                      const isFlat = Math.abs(change) < 0.1;
                      return (
                        <Paper key={subject} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY }}>{subject}</Typography>
                            <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e', mt: 0.25 }}>{formatPercentage(first)} &rarr; {formatPercentage(last)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {isFlat ? null : isUp ? (
                              <TrendingUpIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
                            ) : (
                              <TrendingDownIcon sx={{ fontSize: 18, color: '#c62828' }} />
                            )}
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: isFlat ? '#757575' : isUp ? '#2e7d32' : '#c62828' }}>
                              {isFlat ? '0.0' : (change > 0 ? '+' : '')}{change.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              </>
            )}

            <Box sx={{ px: 4, py: 2, bgcolor: '#fafafa', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.6875rem', color: '#9e9e9e' }}>
                Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </Box>
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f5f5f5' }}>
        <Box sx={{ px: 3, py: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>
            <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle', color: AMBER }} /> Report Cards
          </Typography>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Paper sx={{ width: '100%', maxWidth: 520, p: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: `${NAVY}10`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                <SchoolIcon sx={{ fontSize: 28, color: NAVY }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY }}>Report Cards</Typography>
              <Typography variant="body2" sx={{ color: '#9e9e9e', mt: 0.5 }}>Search for a student to generate their report card</Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Autocomplete
                options={studentOptions}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                onChange={(_, val) => setSelectedStudent(val as Student | null)}
                loading={loadingStudents}
                renderInput={(params) => (
                  <TextField {...params} label="Search Student" placeholder="Type a name or student ID..."
                    sx={{ '& .MuiInputLabel-root': { color: '#9e9e9e' } }}
                    InputProps={{ ...params.InputProps, endAdornment: (<>{loadingStudents ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id}>
                    <Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{option.firstName} {option.lastName}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#9e9e9e' }}>{option.studentUid}</Typography>
                    </Box>
                  </Box>
                )}
                size="small"
              />

              <TextField
                label="Academic Year"
                placeholder="e.g. 2025-2026"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                size="small"
                sx={{ '& .MuiInputLabel-root': { color: '#9e9e9e' } }}
              />

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ color: '#9e9e9e' }}>Class</InputLabel>
                <Select
                  value={selectedClassId}
                  label="Class"
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={loadingClasses}
                  startAdornment={loadingClasses ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                >
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>{cls.name}{cls.stream ? ` — ${cls.stream}` : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {reportError && (
                <Typography sx={{ fontSize: '0.8125rem', color: '#c62828', textAlign: 'center' }}>{reportError}</Typography>
              )}

              <Button
                variant="contained"
                fullWidth
                disabled={!selectedStudent || !selectedClassId || !academicYear.trim() || loadingReport}
                onClick={handleSearch}
                sx={{
                  bgcolor: NAVY,
                  color: 'white',
                  fontWeight: 700,
                  py: 1.25,
                  textTransform: 'none',
                  fontSize: '0.9375rem',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: '#000650' },
                  '&.Mui-disabled': { bgcolor: '#c0c0c0', color: '#666' },
                }}
              >
                {loadingReport ? <CircularProgress size={22} color="inherit" /> : 'Search Report Card'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    </>
  );
}

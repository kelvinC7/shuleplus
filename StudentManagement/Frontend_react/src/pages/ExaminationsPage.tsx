import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, IconButton, Checkbox, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Button, Drawer, Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import QuizIcon from '@mui/icons-material/Quiz';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventIcon from '@mui/icons-material/Event';
import FlagIcon from '@mui/icons-material/Flag';
import ScoreIcon from '@mui/icons-material/Score';
import { Link, useNavigate } from 'react-router-dom';
import { listExams, deleteExam, listExamAcademicYears } from '@/services/api';
import type { ApiExam } from '@/types';

const EXAM_TYPES: Record<string, string> = {
  MIDTERM: 'Mid-Term',
  FINAL: 'Final',
  ASSIGNMENT: 'Assignment',
  QUIZ: 'Quiz',
  CAT: 'CAT',
  HOMEWORK: 'Homework',
  PRACTICAL: 'Practical',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f1f5f9', text: '#64748b' },
  UPCOMING: { bg: '#dbeafe', text: '#2563eb' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#d97706' },
  COMPLETED: { bg: '#d1fae5', text: '#059669' },
  CANCELLED: { bg: '#fee2e2', text: '#dc2626' },
};

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
      <Box sx={{ color: '#94a3b8', mt: 0.25, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.3 }}>{value}</Typography>
      </Box>
    </Box>
  );
}

function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return (
    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', ...sx }}>
      {children}
    </Typography>
  );
}

const cellHeaderSx = { fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' };

export default function ExaminationsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [academicYears, setAcademicYears] = useState<{ academicYear: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileExam, setProfileExam] = useState<ApiExam | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [examData, yearData] = await Promise.all([
        listExams(),
        listExamAcademicYears(),
      ]);
      setExams(examData ?? []);
      setAcademicYears(yearData ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredExams = useMemo(() => {
    let list = exams;
    if (activeYear) list = list.filter(e => e.academicYear === activeYear);
    if (activeStatus) list = list.filter(e => e.status === activeStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (EXAM_TYPES[e.type] ?? e.type).toLowerCase().includes(q) ||
        (e.term ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [exams, activeYear, activeStatus, search]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of exams) counts.set(e.status, (counts.get(e.status) ?? 0) + 1);
    return counts;
  }, [exams]);

  const isAllSelected = filteredExams.length > 0 && filteredExams.every(e => selectedIds.has(e.id));
  const isIndeterminate = filteredExams.some(e => selectedIds.has(e.id)) && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredExams.map(e => e.id)));
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    const exam = exams.find(e => e.id === id);
    if (exam) setProfileExam(exam);
  };

  const handleClearSelection = () => { setSelectedIds(new Set()); setProfileExam(null); };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} exam(s)?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => deleteExam(id)));
      setExams(prev => prev.filter(e => !selectedIds.has(e.id)));
      handleClearSelection();
      const yearData = await listExamAcademicYears();
      setAcademicYears(yearData ?? []);
    } catch {}
  };

  const selectedCount = selectedIds.size;

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ display: { md: 'none' } }} onClick={() => setSidebarOpen(true)}><FilterListIcon sx={{ fontSize: 18 }} /></IconButton>
          <Box component={Link} to="/examinations/new" sx={{ bgcolor: 'primary.main', color: 'white', px: { xs: 1.5, md: 2 }, py: 0.75, borderRadius: 1, fontSize: { xs: '0.75rem', md: '0.875rem' }, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', '&:hover': { opacity: 0.9 } }}>New Exam</Box>
          <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 600, color: '#1e293b' }}>Examinations</Typography>
          <IconButton size="small"><SettingsIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'flex-end' }}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>, sx: { fontSize: '0.875rem', bgcolor: 'white', '& fieldset': { borderColor: '#cbd5e1' } } } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 }, maxWidth: { xs: 180, md: 280 }, width: '100%' }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}</Typography>
        </Box>
      </Box>

      {/* Selection Action Bar */}
      {selectedCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 0.75, bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedCount} selected</Typography>
            <IconButton size="small" onClick={handleClearSelection} sx={{ color: 'white' }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<EditIcon sx={{ fontSize: 14 }} />} disabled={selectedCount !== 1} onClick={() => navigate(`/examinations/${[...selectedIds][0]}/edit`)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.15)' } }} variant="outlined">Edit</Button>
            <Button size="small" startIcon={<DeleteOutlinedIcon sx={{ fontSize: 14 }} />} onClick={handleDelete}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined">Delete</Button>
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        <Box sx={{ width: 224, borderRight: '1px solid', borderColor: 'divider', p: 1.5, overflow: 'auto', display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>ACADEMIC YEAR</Typography>
          <Box onClick={() => setActiveYear(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: activeYear === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: activeYear === null ? '#f59e0b' : '#1e293b' }}>All Years</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeYear === null ? '#f59e0b' : '#64748b' }}>{exams.length}</Typography>
          </Box>
          {academicYears.map((y) => {
            const isActive = activeYear === y.academicYear;
            return (
              <Box key={y.academicYear} onClick={() => setActiveYear(isActive ? null : y.academicYear)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.4, borderRadius: 0.5, cursor: 'pointer', bgcolor: isActive ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#f59e0b' : '#475569' }}>{y.academicYear}</Typography>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: isActive ? '#f59e0b' : '#94a3b8' }}>{y.count}</Typography>
              </Box>
            );
          })}

          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 2, mb: 1.5 }}>STATUS</Typography>
          {['DRAFT', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => {
            const isActive = activeStatus === status;
            const count = statusCounts.get(status) ?? 0;
            const colors = STATUS_COLORS[status];
            return (
              <Box key={status} onClick={() => setActiveStatus(isActive ? null : status)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.4, borderRadius: 0.5, cursor: 'pointer', bgcolor: isActive ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors.text }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#f59e0b' : '#475569' }}>{status.replace('_', ' ')}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: isActive ? '#f59e0b' : '#94a3b8' }}>{count}</Typography>
              </Box>
            );
          })}
        </Box>

        {/* Mobile Sidebar Drawer */}
        <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)} slotProps={{ paper: { sx: { width: 264, p: 1.5 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</Typography>
            <IconButton size="small" onClick={() => setSidebarOpen(false)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
          <Box onClick={() => { setActiveYear(null); setActiveStatus(null); setSidebarOpen(false); }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: (!activeYear && !activeStatus) ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: (!activeYear && !activeStatus) ? '#f59e0b' : '#1e293b' }}>All Exams</Typography>
          </Box>
          {academicYears.map((y) => (
            <Box key={y.academicYear} onClick={() => { setActiveYear(activeYear === y.academicYear ? null : y.academicYear); setSidebarOpen(false); }}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: activeYear === y.academicYear ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.25 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: activeYear === y.academicYear ? 600 : 400, color: activeYear === y.academicYear ? '#f59e0b' : '#475569' }}>{y.academicYear}</Typography>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeYear === y.academicYear ? '#f59e0b' : '#94a3b8' }}>{y.count}</Typography>
            </Box>
          ))}
        </Drawer>

        {/* Main Table */}
        <TableContainer component={Paper} sx={{ flex: 1, boxShadow: 'none', borderRadius: 0, minWidth: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}><CircularProgress size={24} /></Box>
          ) : (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={cellHeaderSx}><Checkbox size="small" checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleToggleAll} /></TableCell>
                  <TableCell sx={cellHeaderSx}>Exam</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Term</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', lg: 'table-cell' } }}>Year</TableCell>
                  <TableCell sx={cellHeaderSx}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExams.length === 0 ? (
                  <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}><Typography variant="body2" color="text.secondary">No exams found</Typography></TableCell></TableRow>
                ) : (
                  filteredExams.map((exam, index) => {
                    const isSelected = selectedIds.has(exam.id);
                    const colors = STATUS_COLORS[exam.status] ?? STATUS_COLORS.DRAFT;
                    return (
                      <TableRow key={exam.id} hover selected={isSelected}
                        sx={{ cursor: 'pointer', bgcolor: isSelected ? 'rgba(25,118,210,0.04)' : index % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white', '&:hover': { bgcolor: isSelected ? 'rgba(25,118,210,0.08)' : 'rgba(0,31,63,0.04)' } }}
                        onClick={() => handleToggleRow(exam.id)}>
                        <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Checkbox size="small" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => handleToggleRow(exam.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <QuizIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>{exam.name}</Typography>
                              {exam.totalMarks && <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{exam.totalMarks} marks</Typography>}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'table-cell' } }}>{EXAM_TYPES[exam.type] ?? exam.type}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{exam.term ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', lg: 'table-cell' } }}>{exam.academicYear}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'inline-flex', px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: colors.bg }}>
                            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: colors.text, textTransform: 'uppercase' }}>{exam.status.replace('_', ' ')}</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {/* Profile Panel */}
        <Collapse in={!!profileExam} orientation="horizontal" timeout={250} slotProps={{ root: { sx: { height: '100%', flexShrink: 0 } } }}>
          <Box sx={{ width: { md: 300 }, height: '100%', borderLeft: '1px solid', borderColor: 'divider', overflow: 'auto', flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'white' }}>
            {profileExam && (<>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>Exam Details</Typography>
                <IconButton size="small" onClick={() => setProfileExam(null)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 1, bgcolor: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                  <QuizIcon sx={{ fontSize: 28, color: '#f59e0b' }} />
                </Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2, textAlign: 'center' }}>{profileExam.name}</Typography>
                <Box sx={{ mt: 0.5, px: 1, py: 0.25, borderRadius: 0.5, bgcolor: STATUS_COLORS[profileExam.status]?.bg }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: STATUS_COLORS[profileExam.status]?.text, textTransform: 'uppercase' }}>{profileExam.status.replace('_', ' ')}</Typography>
                </Box>
              </Box>
              <Box sx={{ px: 2, py: 1 }}>
                <SectionTitle>Information</SectionTitle>
                <ProfileRow icon={<QuizIcon sx={{ fontSize: 16 }} />} label="Type" value={EXAM_TYPES[profileExam.type] ?? profileExam.type} />
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Academic Year" value={profileExam.academicYear} />
                <ProfileRow icon={<EventIcon sx={{ fontSize: 16 }} />} label="Term" value={profileExam.term} />
                <ProfileRow icon={<ScoreIcon sx={{ fontSize: 16 }} />} label="Total Marks" value={profileExam.totalMarks?.toString()} />
                <ProfileRow icon={<FlagIcon sx={{ fontSize: 16 }} />} label="Passing Marks" value={profileExam.passingMarks?.toString()} />
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Start Date" value={formatDate(profileExam.startDate)} />
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="End Date" value={formatDate(profileExam.endDate)} />
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Created" value={formatDate(profileExam.createdAt)} />
                {profileExam.description && (
                  <Box sx={{ mt: 1 }}>
                    <SectionTitle>Description</SectionTitle>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>{profileExam.description}</Typography>
                  </Box>
                )}
              </Box>
            </>)}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}

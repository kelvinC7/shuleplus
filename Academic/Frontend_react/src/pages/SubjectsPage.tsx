import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, CircularProgress, FormControl,
  InputLabel, Select, MenuItem, Chip, Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { listTimetableClassConfig, type TimetableClassCatalog } from '@/services/api';

const NAVY = '#000435';
const AMBER = '#FCB038';

const STATUS_STYLE: Record<TimetableClassCatalog['status'], { bg: string; color: string; label: string }> = {
  ready: { bg: 'rgba(22,163,74,0.1)', color: '#15803d', label: 'Ready' },
  incomplete: { bg: 'rgba(217,119,6,0.1)', color: '#b45309', label: 'Incomplete' },
  missing: { bg: 'rgba(148,163,184,0.16)', color: '#64748b', label: 'No courses' },
};

export default function SubjectsPage() {
  const { settings } = useAcademicSettings();
  const [academicYear, setAcademicYear] = useState(settings?.currentAcademicYear || '');
  const [term, setTerm] = useState(settings?.currentTerm || '');
  const [classes, setClasses] = useState<TimetableClassCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string | null>(null);
  const [openClass, setOpenClass] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.currentAcademicYear && !academicYear) setAcademicYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !term) setTerm(settings.currentTerm);
  }, [settings, academicYear, term]);

  const load = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      const rows = await listTimetableClassConfig({ academicYear, term: term || undefined });
      setClasses(Array.isArray(rows) ? rows : []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term]);

  useEffect(() => { void load(); }, [load]);

  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const c of classes) if (c.section) set.add(c.section);
    return Array.from(set).sort();
  }, [classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes.filter((c) => {
      if (section && c.section !== section) return false;
      if (!q) return true;
      return (
        c.className.toLowerCase().includes(q) ||
        (c.level ?? '').toLowerCase().includes(q) ||
        c.courses.some((course) =>
          course.subjectName.toLowerCase().includes(q) ||
          course.teacherName.toLowerCase().includes(q) ||
          course.courseCode.toLowerCase().includes(q)
        )
      );
    });
  }, [classes, search, section]);

  const totals = useMemo(() => {
    const courseNames = new Set<string>();
    const teachers = new Set<string>();
    let students = 0;
    for (const c of filtered) {
      students += c.studentCount ?? 0;
      for (const course of c.courses) {
        courseNames.add(course.subjectName);
        if (course.teacherName && !/unassigned/i.test(course.teacherName)) teachers.add(course.teacherName);
      }
    }
    return { classes: filtered.length, courses: courseNames.size, teachers: teachers.size, students };
  }, [filtered]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: NAVY }}>Subjects</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            All classes from Timetable · assigned courses from Config Class
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {(settings?.academicYears ?? []).map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Term</InputLabel>
            <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
              {(settings?.terms ?? ['Term 1', 'Term 2', 'Term 3']).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Search class, course or teacher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
            sx={{ minWidth: { xs: 180, md: 260 }, bgcolor: '#fff' }}
          />
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, py: 2, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, flexShrink: 0 }}>
        <SummaryCard label="Classes" value={totals.classes} icon={<ClassOutlinedIcon sx={{ fontSize: 20 }} />} color="#2563eb" />
        <SummaryCard label="Assigned courses" value={totals.courses} icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />} color="#7c3aed" />
        <SummaryCard label="Teachers" value={totals.teachers} icon={<PersonOutlinedIcon sx={{ fontSize: 20 }} />} color="#d97706" />
        <SummaryCard label="Students" value={totals.students} icon={<PeopleOutlinedIcon sx={{ fontSize: 20 }} />} color="#0f766e" />
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', px: { xs: 2, md: 3 }, pb: 3, gap: 2 }}>
        {sections.length > 0 && (
          <Box sx={{ width: 200, flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', p: 1.5, overflow: 'auto' }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8', mb: 1.25 }}>SECTION</Typography>
            <FilterRow label="All classes" count={classes.length} active={section === null} onClick={() => setSection(null)} />
            {sections.map((s) => (
              <FilterRow
                key={s}
                label={s}
                count={classes.filter((c) => c.section === s).length}
                active={section === s}
                onClick={() => setSection(section === s ? null : s)}
              />
            ))}
          </Box>
        )}

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={26} /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ bgcolor: '#fff', border: '1px dashed #cbd5e1', borderRadius: '16px', py: 10, textAlign: 'center' }}>
              <ClassOutlinedIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
              <Typography sx={{ fontWeight: 600, color: '#64748b' }}>No timetable classes found</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', mt: 0.5 }}>
                Configure classes and assign courses in Timetable · Config Class
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {filtered.map((cls) => {
                const open = openClass === cls.className;
                const status = STATUS_STYLE[cls.status] ?? STATUS_STYLE.missing;
                return (
                  <Box key={cls.className} sx={{ bgcolor: '#fff', border: '1px solid', borderColor: open ? AMBER : '#e2e8f0', borderRadius: '18px', overflow: 'hidden', boxShadow: open ? '0 8px 24px rgba(0,4,53,0.08)' : '0 1px 2px rgba(15,23,42,0.04)' }}>
                    <Box
                      onClick={() => setOpenClass(open ? null : cls.className)}
                      sx={{ px: 2.25, py: 1.75, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}
                    >
                      <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: '#0004350d', color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ClassOutlinedIcon />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1rem' }}>{cls.className}</Typography>
                          <Chip size="small" label={status.label} sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700, bgcolor: status.bg, color: status.color }} />
                        </Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.25 }}>
                          {[cls.level, cls.stream, cls.section].filter(Boolean).join(' · ') || 'Class'}
                          {` · ${cls.studentCount} students · ${cls.courseCount} courses · ${cls.totalPeriods} periods/week`}
                        </Typography>
                      </Box>
                      <ExpandMoreIcon sx={{ color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </Box>

                    {!open && cls.courses.length > 0 && (
                      <Box sx={{ px: 2.25, pb: 1.75, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {cls.courses.slice(0, 8).map((course) => (
                          <Chip
                            key={course.id}
                            label={course.subjectName}
                            size="small"
                            sx={{ bgcolor: '#f1f5f9', fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        ))}
                        {cls.courses.length > 8 && (
                          <Chip size="small" label={`+${cls.courses.length - 8} more`} sx={{ bgcolor: `${AMBER}22`, color: NAVY, fontWeight: 700, fontSize: '0.7rem' }} />
                        )}
                      </Box>
                    )}

                    <Collapse in={open}>
                      <Box sx={{ px: 2.25, pb: 2.25, pt: 0.5, borderTop: '1px solid #f1f5f9' }}>
                        {cls.courses.length === 0 ? (
                          <Typography sx={{ py: 2, fontSize: '0.85rem', color: '#94a3b8' }}>
                            No courses assigned in Config Class yet.
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1.25, mt: 1.5 }}>
                            {cls.courses.map((course) => (
                              <Box key={course.id} sx={{ p: 1.5, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                                  <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.875rem' }}>{course.subjectName}</Typography>
                                  <Chip size="small" label={course.courseCode} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, fontFamily: 'monospace' }} />
                                </Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {course.teacherName || 'Unassigned teacher'}
                                </Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', mt: 0.4 }}>
                                  {course.periodsPerWeek} periods/week
                                  {course.defaultCourseMarks != null ? ` · Default marks: ${course.defaultCourseMarks}` : ''}
                                  {course.room ? ` · ${course.room}` : ''}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', p: 1.75, display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: '11px', bgcolor: `${color}14`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY, lineHeight: 1 }}>{value}</Typography>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
      </Box>
    </Box>
  );
}

function FilterRow({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 1, py: 0.7, borderRadius: 1, cursor: 'pointer', mb: 0.4,
        bgcolor: active ? 'rgba(252,176,56,0.16)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(252,176,56,0.1)' },
      }}
    >
      <Typography sx={{ fontSize: '0.78rem', fontWeight: active ? 700 : 500, color: active ? NAVY : '#475569' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: active ? NAVY : '#94a3b8' }}>{count}</Typography>
    </Box>
  );
}

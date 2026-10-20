import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Collapse,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  listTimetableClassConfig,
  listCourseDefaultMarks,
  type TimetableClassCatalog,
} from '@/services/api';

const NAVY = '#000435';
const AMBER = '#FCB038';

type CoreFilter = 'all' | 'core' | 'noncore';

const STATUS_STYLE: Record<TimetableClassCatalog['status'], { bg: string; color: string; label: string }> = {
  ready: { bg: 'rgba(22,163,74,0.1)', color: '#15803d', label: 'Ready' },
  incomplete: { bg: 'rgba(217,119,6,0.1)', color: '#b45309', label: 'Incomplete' },
  missing: { bg: 'rgba(148,163,184,0.16)', color: '#64748b', label: 'No courses' },
};

function normKey(classId: string | null, className: string, subjectName: string) {
  return `${classId || className}::${subjectName}`.toLowerCase();
}

function normSubject(name: string) {
  return name.trim().toLowerCase();
}

function buildSubjectDefaultMap(
  defaults: Array<{ subject?: { name?: string }; defaultCourseMarks: number }>,
) {
  const map = new Map<string, number>();
  for (const row of defaults) {
    const name = row.subject?.name;
    if (!name) continue;
    const key = normSubject(name);
    const v = Number(row.defaultCourseMarks);
    const prev = map.get(key);
    if (prev == null) map.set(key, v);
    else if (prev !== v) map.set(key, -1);
  }
  return map;
}

export default function CoursesPage() {
  const { settings } = useAcademicSettings();
  const [academicYear, setAcademicYear] = useState(settings?.currentAcademicYear || '');
  const [term, setTerm] = useState(settings?.currentTerm || '');
  const [classes, setClasses] = useState<TimetableClassCatalog[]>([]);
  const [defaultMap, setDefaultMap] = useState<Map<string, number>>(new Map());
  const [subjectDefaultMap, setSubjectDefaultMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string | null>(null);
  const [coreFilter, setCoreFilter] = useState<CoreFilter>('all');
  const [openClass, setOpenClass] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.currentAcademicYear && !academicYear) setAcademicYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !term) setTerm(settings.currentTerm);
  }, [settings, academicYear, term]);

  const load = useCallback(async () => {
    if (!academicYear || !term) return;
    setLoading(true);
    try {
      const [rows, defaults] = await Promise.all([
        listTimetableClassConfig({ academicYear, term }),
        listCourseDefaultMarks({ academicYear, term }),
      ]);
      setClasses(Array.isArray(rows) ? rows : []);
      const map = new Map<string, number>();
      for (const row of defaults || []) {
        const cn = [row.class?.name, row.class?.stream].filter(Boolean).join(' ') || row.class?.name || '';
        map.set(normKey(row.classId, cn, row.subject?.name || ''), Number(row.defaultCourseMarks));
      }
      setDefaultMap(map);
      setSubjectDefaultMap(buildSubjectDefaultMap(defaults ?? []));
    } catch {
      setClasses([]);
      setDefaultMap(new Map());
      setSubjectDefaultMap(new Map());
    } finally {
      setLoading(false);
    }
  }, [academicYear, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveDefault = (cls: TimetableClassCatalog, subjectName: string, timetableDefault: number | null | undefined) => {
    const key = normKey(cls.classId, cls.className, subjectName);
    if (defaultMap.has(key)) return defaultMap.get(key)!;
    const subj = subjectDefaultMap.get(normSubject(subjectName));
    if (subj != null && subj > 0) return subj;
    if (timetableDefault != null && Number.isFinite(Number(timetableDefault))) return Number(timetableDefault);
    return 40;
  };

  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const c of classes) if (c.section) set.add(c.section);
    return Array.from(set).sort();
  }, [classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes
      .map((c) => {
        let courses = c.courses;
        if (coreFilter === 'core') courses = courses.filter((co) => co.isCore !== false);
        if (coreFilter === 'noncore') courses = courses.filter((co) => co.isCore === false);
        return { ...c, courses };
      })
      .filter((c) => {
        if (section && c.section !== section) return false;
        if (!q) return c.courses.length > 0 || coreFilter === 'all';
        const classHit =
          c.className.toLowerCase().includes(q) ||
          (c.level ?? '').toLowerCase().includes(q);
        const courseHit = c.courses.some(
          (course) =>
            course.subjectName.toLowerCase().includes(q) ||
            course.teacherName.toLowerCase().includes(q) ||
            course.courseCode.toLowerCase().includes(q),
        );
        return classHit || courseHit;
      });
  }, [classes, search, section, coreFilter]);

  const totals = useMemo(() => {
    const courseNames = new Set<string>();
    const teachers = new Set<string>();
    let core = 0;
    let nonCore = 0;
    let students = 0;
    for (const c of filtered) {
      students += c.studentCount ?? 0;
      for (const course of c.courses) {
        courseNames.add(course.subjectName);
        if (course.isCore === false) nonCore += 1;
        else core += 1;
        if (course.teacherName && !/unassigned/i.test(course.teacherName)) teachers.add(course.teacherName);
      }
    }
    return { classes: filtered.length, courses: courseNames.size, teachers: teachers.size, students, core, nonCore };
  }, [filtered]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2.5,
          bgcolor: '#fff',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: NAVY }}>By class</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.5 }}>
              {academicYear || '—'} · {term || '—'}
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/courses/catalog"
            size="small"
            variant="outlined"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}
          >
            Edit course totals
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center', mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {(settings?.academicYears ?? []).map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Term</InputLabel>
            <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
              {(settings?.terms ?? ['Term 1', 'Term 2', 'Term 3']).map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={coreFilter}
            onChange={(_, v) => v && setCoreFilter(v)}
            sx={{ bgcolor: '#f8fafc' }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="core">Core</ToggleButton>
            <ToggleButton value="noncore">Non-core</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            placeholder="Search class, course, teacher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: { xs: '100%', sm: 260 }, flex: 1, bgcolor: '#fff' }}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Box
          sx={{
            width: { xs: 0, md: 220 },
            display: { xs: 'none', md: 'block' },
            borderRight: '1px solid #e2e8f0',
            bgcolor: '#fff',
            p: 2,
            overflowY: 'auto',
          }}
        >
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', mb: 1 }}>
            Sections
          </Typography>
          <FilterRow label="All sections" count={classes.length} active={!section} onClick={() => setSection(null)} />
          {sections.map((s) => (
            <FilterRow
              key={s}
              label={s}
              count={classes.filter((c) => c.section === s).length}
              active={section === s}
              onClick={() => setSection(s)}
            />
          ))}
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
            <SummaryCard label="Classes" value={totals.classes} icon={<ClassOutlinedIcon fontSize="small" />} color={NAVY} />
            <SummaryCard label="Courses" value={totals.courses} icon={<MenuBookOutlinedIcon fontSize="small" />} color={AMBER} />
            <SummaryCard label="Core / Non-core" value={`${totals.core} / ${totals.nonCore}`} icon={<MenuBookOutlinedIcon fontSize="small" />} color="#6366f1" />
            <SummaryCard label="Students" value={totals.students} icon={<PeopleOutlinedIcon fontSize="small" />} color="#0ea5e9" />
          </Box>

          {loading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} sx={{ color: AMBER }} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#fff', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
              <Typography sx={{ fontWeight: 700, color: NAVY }}>No courses match this view</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8', mt: 1 }}>
                Configure classes in Timetable → Config Class, then return here to set default marks.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filtered.map((cls) => {
                const open = openClass === cls.className;
                const status = STATUS_STYLE[cls.status];
                return (
                  <Box
                    key={cls.className}
                    sx={{
                      bgcolor: '#fff',
                      borderRadius: '18px',
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,4,53,0.04)',
                    }}
                  >
                    <Box
                      onClick={() => setOpenClass(open ? null : cls.className)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.25, py: 2, cursor: 'pointer' }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '14px',
                          bgcolor: '#0004350d',
                          color: NAVY,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ClassOutlinedIcon />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1rem' }}>{cls.className}</Typography>
                          <Chip size="small" label={status.label} sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700, bgcolor: status.bg, color: status.color }} />
                        </Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.25 }}>
                          {[cls.level, cls.stream, cls.section].filter(Boolean).join(' · ') || 'Class'}
                          {` · ${cls.studentCount} students · ${cls.courses.length} courses`}
                        </Typography>
                      </Box>
                      <ExpandMoreIcon sx={{ color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </Box>

                    <Collapse in={open}>
                      <Box sx={{ px: 2.25, pb: 2.25, pt: 0.5, borderTop: '1px solid #f1f5f9' }}>
                        {cls.courses.length === 0 ? (
                          <Typography sx={{ py: 2, fontSize: '0.85rem', color: '#94a3b8' }}>No courses in this filter.</Typography>
                        ) : (
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25, mt: 1.5 }}>
                            {cls.courses.map((course) => {
                              const totalMarks = resolveDefault(cls, course.subjectName, course.defaultCourseMarks);
                              const isCore = course.isCore !== false;
                              return (
                                <Box
                                  key={course.id}
                                  sx={{
                                    p: 1.75,
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: isCore ? '#f8fafc' : '#fffbeb',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                                    <Box>
                                      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9rem' }}>{course.subjectName}</Typography>
                                      <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.25 }}>
                                        <PersonOutlinedIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle' }} />
                                        {course.teacherName || 'Unassigned'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                      <Chip label={course.courseCode} size="small" sx={{ height: 18, fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 800 }} />
                                      <Chip
                                        size="small"
                                        label={isCore ? 'Core' : 'Non-core'}
                                        sx={{
                                          height: 18,
                                          fontSize: '0.6rem',
                                          fontWeight: 700,
                                          bgcolor: isCore ? 'rgba(0,4,53,0.08)' : 'rgba(245,158,11,0.15)',
                                          color: isCore ? NAVY : '#b45309',
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                  <Box
                                    sx={{
                                      mt: 1.25,
                                      py: 1,
                                      px: 1.25,
                                      borderRadius: '12px',
                                      bgcolor: '#fff',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                                      Course total
                                    </Typography>
                                    <Chip
                                      label={`/${totalMarks}`}
                                      size="small"
                                      sx={{
                                        height: 26,
                                        fontWeight: 900,
                                        fontSize: '0.85rem',
                                        bgcolor: `${AMBER}33`,
                                        color: NAVY,
                                      }}
                                    />
                                  </Box>
                                  <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', mt: 0.75 }}>
                                    {course.periodsPerWeek} periods/week
                                    {course.room ? ` · ${course.room}` : ''}
                                  </Typography>
                                </Box>
                              );
                            })}
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

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', p: 1.75, display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: '11px', bgcolor: `${color}14`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: NAVY, lineHeight: 1 }}>{value}</Typography>
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        py: 0.7,
        borderRadius: 1,
        cursor: 'pointer',
        mb: 0.4,
        bgcolor: active ? 'rgba(252,176,56,0.16)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(252,176,56,0.1)' },
      }}
    >
      <Typography sx={{ fontSize: '0.78rem', fontWeight: active ? 700 : 500, color: active ? NAVY : '#475569' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: active ? NAVY : '#94a3b8' }}>{count}</Typography>
    </Box>
  );
}

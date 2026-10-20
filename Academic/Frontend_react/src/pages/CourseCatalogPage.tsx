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
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  listTimetableClassConfig,
  listTimetableCourseCatalog,
  listCourseDefaultMarks,
  upsertCourseDefaultMarksBySubject,
  type TimetableClassCatalog,
  type TimetableCourseCatalogRow,
} from '@/services/api';

const NAVY = '#000435';
const AMBER = '#FCB038';

type CoreFilter = 'all' | 'core' | 'noncore';

function normSubject(name: string) {
  return name.trim().toLowerCase();
}

type RowMeta = {
  classCount: number;
  defaultMarks: number;
  varies: boolean;
};

function buildClassUsage(classes: TimetableClassCatalog[]) {
  const map = new Map<string, Set<string>>();
  for (const cls of classes) {
    for (const c of cls.courses ?? []) {
      const key = normSubject(c.subjectName);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(cls.className);
    }
  }
  return map;
}

function buildDefaultMarksMap(
  defaults: Array<{ subject?: { name?: string }; defaultCourseMarks: number }>,
) {
  const map = new Map<string, Set<number>>();
  for (const row of defaults) {
    const name = row.subject?.name;
    if (!name) continue;
    const key = normSubject(name);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(Number(row.defaultCourseMarks));
  }
  return map;
}

export default function CourseCatalogPage() {
  const { settings } = useAcademicSettings();
  const [academicYear, setAcademicYear] = useState(settings?.currentAcademicYear || '');
  const [term, setTerm] = useState(settings?.currentTerm || '');
  const [courses, setCourses] = useState<TimetableCourseCatalogRow[]>([]);
  const [classes, setClasses] = useState<TimetableClassCatalog[]>([]);
  const [classUsage, setClassUsage] = useState<Map<string, Set<string>>>(new Map());
  const [defaultsBySubject, setDefaultsBySubject] = useState<Map<string, Set<number>>>(new Map());
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [coreFilter, setCoreFilter] = useState<CoreFilter>('all');

  useEffect(() => {
    if (settings?.currentAcademicYear && !academicYear) setAcademicYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !term) setTerm(settings.currentTerm);
  }, [settings, academicYear, term]);

  const load = useCallback(async () => {
    if (!academicYear || !term) return;
    setLoading(true);
    try {
      const [catalog, classRows, defaults] = await Promise.all([
        listTimetableCourseCatalog(),
        listTimetableClassConfig({ academicYear, term }),
        listCourseDefaultMarks({ academicYear, term }),
      ]);
      setCourses(Array.isArray(catalog) ? catalog : []);
      const cls = Array.isArray(classRows) ? classRows : [];
      setClasses(cls);
      setClassUsage(buildClassUsage(cls));
      setDefaultsBySubject(buildDefaultMarksMap(defaults ?? []));
      setDraftMarks({});
    } catch {
      setCourses([]);
      setClasses([]);
      setClassUsage(new Map());
      setDefaultsBySubject(new Map());
    } finally {
      setLoading(false);
    }
  }, [academicYear, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const metaFor = useCallback(
    (subjectName: string): RowMeta => {
      const key = normSubject(subjectName);
      const classCount = classUsage.get(key)?.size ?? 0;
      const values = defaultsBySubject.get(key);
      if (!values || values.size === 0) return { classCount, defaultMarks: 40, varies: false };
      const arr = [...values];
      if (values.size === 1) return { classCount, defaultMarks: arr[0], varies: false };
      return { classCount, defaultMarks: arr[0], varies: true };
    },
    [classUsage, defaultsBySubject],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (coreFilter === 'core' && c.isCore === false) return false;
      if (coreFilter === 'noncore' && c.isCore !== false) return false;
      if (!q) return true;
      return (
        c.subjectName.toLowerCase().includes(q) ||
        (c.courseCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [courses, search, coreFilter]);

  const totals = useMemo(() => {
    let core = 0;
    let nonCore = 0;
    for (const c of filtered) {
      if (c.isCore === false) nonCore += 1;
      else core += 1;
    }
    return { total: filtered.length, core, nonCore };
  }, [filtered]);

  const pendingChanges = useMemo(() => {
    const list: Array<{ course: TimetableCourseCatalogRow; value: number }> = [];
    for (const course of courses) {
      const raw = draftMarks[course.id];
      if (raw == null || raw === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue;
      const meta = metaFor(course.subjectName);
      if (n !== meta.defaultMarks) list.push({ course, value: n });
    }
    return list;
  }, [courses, draftMarks, metaFor]);

  const hasInvalidDraft = useMemo(() => {
    for (const course of courses) {
      const raw = draftMarks[course.id];
      if (raw == null || raw === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return true;
    }
    return false;
  }, [courses, draftMarks]);

  function discardChanges() {
    setDraftMarks({});
  }

  async function saveAllChanges() {
    if (hasInvalidDraft) {
      toast.error('Fix invalid marks before saving (use a number greater than 0)');
      return;
    }
    if (pendingChanges.length === 0) return;
    setSavingAll(true);
    let classesUpdated = 0;
    let failures = 0;
    try {
      for (const { course, value } of pendingChanges) {
        const result = await upsertCourseDefaultMarksBySubject({
          subjectName: course.subjectName,
          academicYear,
          term,
          defaultCourseMarks: value,
        });
        classesUpdated += result.classesUpdated ?? 0;
        if (result.failures?.length) failures += result.failures.length;
        setDefaultsBySubject((prev) => {
          const next = new Map(prev);
          next.set(normSubject(course.subjectName), new Set([value]));
          return next;
        });
      }
      setDraftMarks({});
      if (failures > 0) {
        toast.warning(`Saved ${pendingChanges.length} course(s). Some class rows failed.`);
      } else {
        toast.success(`Saved ${pendingChanges.length} course(s) · applied across ${classesUpdated} class assignment(s)`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: NAVY }}>Course catalog</Typography>
        <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.5 }}>
          Set course totals here once per subject · {academicYear || '—'} · {term || '—'}
        </Typography>
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
            placeholder="Search course or code…"
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
            sx={{ minWidth: { xs: '100%', sm: 240 }, flex: 1, bgcolor: '#fff' }}
          />
          <Button
            component={RouterLink}
            to="/courses/by-class"
            size="small"
            endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: 'none', fontWeight: 700, color: NAVY }}
          >
            By class
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
          <StatCard label="Registered courses" value={totals.total} />
          <StatCard label="Core" value={totals.core} />
          <StatCard label="Non-core" value={totals.nonCore} />
        </Box>

        {loading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} sx={{ color: AMBER }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center', bgcolor: '#fff', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
            <Typography sx={{ fontWeight: 700, color: NAVY }}>No courses in catalog</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8', mt: 1 }}>
              Add courses in Smart Timetable → Courses, then refresh this page.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,4,53,0.04)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, color: NAVY }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: NAVY }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: NAVY }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: NAVY }} align="center">
                    Periods/wk
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: NAVY }} align="center">
                    Classes ({classes.length})
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: NAVY, minWidth: 140, width: 160 }} align="right">
                    Total marks
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((course) => {
                  const meta = metaFor(course.subjectName);
                  const draft = draftMarks[course.id];
                  const displayVal = draft != null ? draft : String(meta.defaultMarks);
                  const isCore = course.isCore !== false;
                  const classNames = [...(classUsage.get(normSubject(course.subjectName)) ?? [])].sort();
                  const rowDirty =
                    draft != null &&
                    draft !== '' &&
                    Number(draft) !== meta.defaultMarks &&
                    Number.isFinite(Number(draft)) &&
                    Number(draft) > 0;
                  return (
                    <TableRow
                      key={course.id}
                      hover
                      sx={{
                        '&:last-child td': { border: 0 },
                        bgcolor: rowDirty ? 'rgba(252,176,56,0.08)' : undefined,
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {course.color ? (
                            <Box sx={{ width: 8, height: 32, borderRadius: 1, bgcolor: course.color, flexShrink: 0 }} />
                          ) : (
                            <MenuBookOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                          )}
                          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.875rem' }}>{course.subjectName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={course.courseCode || '-'}
                          size="small"
                          sx={{ height: 22, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.65rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={isCore ? 'Core' : 'Non-core'}
                          sx={{
                            height: 22,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: isCore ? 'rgba(0,4,53,0.08)' : 'rgba(245,158,11,0.15)',
                            color: isCore ? NAVY : '#b45309',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">{course.periodsPerWeek}</TableCell>
                      <TableCell align="center">
                        {classNames.length ? (
                          <Tooltip title={classNames.join(', ')}>
                            <Chip size="small" label={classNames.length} sx={{ fontWeight: 800, minWidth: 36 }} />
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>0</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 1, max: 200, step: 1 }}
                          value={displayVal}
                          onChange={(e) => setDraftMarks((p) => ({ ...p, [course.id]: e.target.value }))}
                          error={
                            draft != null &&
                            draft !== '' &&
                            (!Number.isFinite(Number(draft)) || Number(draft) <= 0)
                          }
                          sx={{
                            width: 96,
                            '& .MuiInputBase-root': { bgcolor: '#fff', fontWeight: 800 },
                            '& input': { textAlign: 'right' },
                          }}
                        />
                        {meta.varies && !rowDirty ? (
                          <Typography sx={{ fontSize: '0.65rem', color: '#b45309', mt: 0.5 }}>
                            Mixed across classes
                          </Typography>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {(pendingChanges.length > 0 || hasInvalidDraft) && (
          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              mt: 2,
              mx: { xs: -2, md: -3 },
              px: { xs: 2, md: 3 },
              py: 1.5,
              bgcolor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              zIndex: 2,
            }}
          >
            <Typography sx={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
              {hasInvalidDraft
                ? 'Some marks are invalid'
                : `${pendingChanges.length} unsaved change${pendingChanges.length === 1 ? '' : 's'}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                disabled={savingAll}
                onClick={discardChanges}
                sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}
              >
                Discard
              </Button>
              <Button
                variant="contained"
                disabled={savingAll || pendingChanges.length === 0 || hasInvalidDraft}
                onClick={() => void saveAllChanges()}
                startIcon={savingAll ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  bgcolor: AMBER,
                  color: NAVY,
                  px: 2.5,
                  boxShadow: '0 4px 14px rgba(252,176,56,0.45)',
                  '&:hover': { bgcolor: '#e5a032' },
                }}
              >
                Save changes
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', p: 1.75 }}>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</Typography>
    </Box>
  );
}

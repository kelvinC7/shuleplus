import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem,
  Select, Switch, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FormStepper from '@/components/FormStepper';
import { useAcademicSettings, useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import {
  createExamSession, examApiError, fetchExamCatalog, generateExamTimetable, getExamSession, saveExamSetup,
} from '@/modules/exams/exam-api';
import { isAxiosError, toast } from '@/lib/toast';
import type { ExamCatalogClass, ExamDay, ExamRoom, ExamSession, ExamTimeSlot } from '@/modules/exams/exam-types';
import { AMBER, NAVY, dateLabel, datesBetween } from '@/modules/exams/exam-ui';

const STEPS = ['Exam info', 'Classes', 'Courses', 'Rooms', 'Exam days', 'Time sessions', 'Generate'];
const EXAM_TYPES = ['End of Term', 'Mid-Term', 'Mock', 'National', 'CAT', 'Practical'];

function normClass(s: string) {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function findCatalogClass(catalog: ExamCatalogClass[], classId: string, className: string) {
  return catalog.find((x) => x.classId === classId || normClass(x.className) === normClass(className));
}

export default function ExamWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAcademicSettings();
  const { ready, academicYear, term, setAcademicYear, setTerm } = useOrgAcademicPeriod();
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [catalog, setCatalog] = useState<ExamCatalogClass[]>([]);
  const [catalogWarning, setCatalogWarning] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('End of Term 1 Examination');
  const [examType, setExamType] = useState('End of Term');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoGen, setAutoGen] = useState(true);
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [majorGap, setMajorGap] = useState(1);

  const [classes, setClasses] = useState<Array<{ classId: string; className: string; studentCount: number; selected: boolean; courses: ExamCatalogClass['courses'] }>>([]);
  const [courses, setCourses] = useState<Array<{ classId: string; subjectName: string; durationMinutes: number; selected: boolean; isMajor?: boolean }>>([]);
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [useClassDefault, setUseClassDefault] = useState(true);
  const [roomCount, setRoomCount] = useState(0);
  const [defaultCapacity, setDefaultCapacity] = useState(50);
  const [days, setDays] = useState<ExamDay[]>([]);
  const [slots, setSlots] = useState<ExamTimeSlot[]>([
    { code: 'MORNING', label: 'Morning', startTime: '08:00', endTime: '10:00', durationMinutes: 120 },
    { code: 'AFTERNOON', label: 'Afternoon', startTime: '14:00', endTime: '16:00', durationMinutes: 120 },
  ]);

  useEffect(() => {
    if (!ready || !academicYear || !term) return;
    fetchExamCatalog({ academicYear, term })
      .then((d) => {
        setCatalog(d.classes);
        setCatalogWarning(d.warning || '');
        if (d.academicYear && d.academicYear !== academicYear) setAcademicYear(d.academicYear);
        if (d.term && d.term !== term) setTerm(d.term);
      })
      .catch((e) => {
        setCatalog([]);
        setCatalogWarning(examApiError(e) || 'Could not load class courses from Smart Timetable.');
      });
  }, [ready, academicYear, term, setAcademicYear, setTerm]);

  useEffect(() => {
    if (!catalog.length) return;
    setClasses((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((c) => {
        if (c.courses?.length) return c;
        const cat = findCatalogClass(catalog, c.classId, c.className);
        if (!cat?.courses?.length) return c;
        changed = true;
        return { ...c, courses: cat.courses, studentCount: c.studentCount || cat.studentCount };
      });
      return changed ? next : prev;
    });
    setCourses((prev) => {
      if (prev.length) return prev;
      const fromCat = catalog.flatMap((c) =>
        c.courses.map((course) => ({
          classId: c.classId,
          subjectName: course.subjectName,
          durationMinutes: course.durationMinutes,
          selected: true,
          isMajor: course.isMajor,
        }))
      );
      return fromCat.length ? fromCat : prev;
    });
  }, [catalog, classes.length]);

  useEffect(() => {
    if (!id) return;
    getExamSession(id).then((s) => {
      setSession(s);
      hydrate(s);
    }).catch((e) => setError(examApiError(e)));
  }, [id]);

  function hydrate(s: ExamSession) {
    setName(s.name);
    setAcademicYear(s.academicYear);
    setTerm(s.term);
    setExamType(s.examType);
    const start = s.startDate.slice(0, 10);
    const end = s.endDate.slice(0, 10);
    setStartDate(start);
    setEndDate(end);
    setAutoGen(s.generateAutomatically);
    setMaxPerDay(s.maxExamsPerDay);
    setMajorGap(s.majorGapSessions);
    setClasses(s.classes.map((c) => ({
      classId: c.classId,
      className: c.className,
      studentCount: c.studentCount,
      selected: c.selected,
      courses: s.courses.filter((x) => x.classId === c.classId).map((x) => ({
        subjectName: x.subjectName,
        durationMinutes: x.durationMinutes,
        isMajor: x.isMajor,
      })),
    })));
    setCourses(s.courses.map((c) => ({
      classId: c.classId, subjectName: c.subjectName, durationMinutes: c.durationMinutes, selected: c.selected, isMajor: c.isMajor,
    })));
    setRooms(s.rooms ?? []);
    setRoomCount((s.rooms ?? []).length);
    const savedDays = s.days ?? [];
    const range = datesBetween(start, end);
    const byDate = new Map(savedDays.map((d) => [d.date, d]));
    setDays(range.length
      ? range.map((date) => byDate.get(date) ?? { date, morning: true, afternoon: true })
      : savedDays);
    if (s.timeSlots?.length) setSlots(s.timeSlots);
  }

  const selectedClasses = classes.filter((c) => c.selected);
  const totalStudents = selectedClasses.reduce((n, c) => n + c.studentCount, 0);
  const totalCapacity = rooms.reduce((n, r) => n + r.capacity, 0);
  const neededRooms = defaultCapacity ? Math.ceil(totalStudents / defaultCapacity) : 0;

  function applyRoomCount(count: number, capacity = defaultCapacity) {
    const next: ExamRoom[] = Array.from({ length: Math.max(1, count) }, (_, i) => rooms[i] ?? {
      name: `Room ${String(i + 1).padStart(2, '0')}`,
      capacity,
      rows: 5,
      cols: 10,
    });
    setRooms(next.map((r, i) => ({ ...r, name: r.name || `Room ${String(i + 1).padStart(2, '0')}` })));
    setRoomCount(next.length);
  }

  useEffect(() => {
    if (!startDate || !endDate) return;
    setDays((prev) => {
      const range = datesBetween(startDate, endDate);
      if (!range.length) return prev;
      const existing = new Map(prev.map((d) => [d.date, d]));
      const next = range.map((date) => existing.get(date) ?? { date, morning: true, afternoon: true });
      const same = next.length === prev.length && next.every((d, i) => d.date === prev[i]?.date);
      return same ? prev : next;
    });
  }, [startDate, endDate]);

  function syncDays() {
    if (!startDate || !endDate) return;
    const existing = new Map(days.map((d) => [d.date, d]));
    setDays(datesBetween(startDate, endDate).map((date) => existing.get(date) ?? { date, morning: true, afternoon: true }));
  }

  async function persist(partial?: Parameters<typeof saveExamSetup>[1]) {
    const payload = {
      name,
      examType,
      startDate,
      endDate,
      maxExamsPerDay: maxPerDay,
      majorGapSessions: majorGap,
      classes: classes.map(({ classId, className, studentCount, selected }) => ({ classId, className, studentCount, selected })),
      courses,
      rooms,
      timeSlots: slots,
      days,
      ...partial,
    };
    if (!session) return null;
    const next = await saveExamSetup(session.id, payload);
    setSession(next);
    localStorage.setItem('academic.examSessionId', next.id);
    return next;
  }

  async function nextStep() {
    setError('');
    setBusy(true);
    try {
      if (step === 0) {
        if (!name.trim() || !academicYear || !term || !startDate || !endDate) {
          throw new Error('Fill examination name, year, term and dates');
        }
        if (!session) {
          const created = await createExamSession({
            name: name.trim(),
            academicYear,
            term,
            examType,
            startDate,
            endDate,
            generateAutomatically: autoGen,
          });
          setSession(created);
          hydrate(created);
          if (!created.classes.length && catalog.length) {
            const mapped = catalog.map((c) => ({ ...c, selected: true, courses: c.courses }));
            setClasses(mapped);
            setCourses(mapped.flatMap((c) => c.courses.map((course) => ({
              classId: c.classId, subjectName: course.subjectName, durationMinutes: course.durationMinutes, selected: true, isMajor: course.isMajor,
            }))));
            applyRoomCount(mapped.length);
          }
          localStorage.setItem('academic.examSessionId', created.id);
          navigate(`/exams/sessions/${created.id}/setup`, { replace: true });
        } else {
          await persist();
        }
      }
      if (step === 1) {
        if (!classes.length && catalog.length) {
          const mapped = catalog.map((c) => ({ ...c, selected: true, courses: c.courses }));
          setClasses(mapped);
        }
        const selected = (classes.length ? classes : catalog.map((c) => ({ ...c, selected: true }))).filter((c) => c.selected);
        const nextCourses = selected.flatMap((c) => {
          const existing = courses.filter((x) => x.classId === c.classId);
          if (existing.length) return existing;
          const src = findCatalogClass(catalog, c.classId, c.className)?.courses ?? c.courses ?? [];
          return src.map((course) => ({
            classId: c.classId, subjectName: course.subjectName, durationMinutes: course.durationMinutes, selected: true, isMajor: course.isMajor,
          }));
        });
        setCourses(nextCourses);
        if (useClassDefault) applyRoomCount(selected.length);
        await persist({
          classes: (classes.length ? classes : catalog.map((c) => ({ classId: c.classId, className: c.className, studentCount: c.studentCount, selected: true }))).map(({ classId, className, studentCount, selected }) => ({ classId, className, studentCount, selected })),
          courses: nextCourses,
        });
      }
      if (step === 2) await persist();
      if (step === 3) {
        if (totalCapacity < totalStudents) {
          // warning only
        }
        await persist({ rooms });
      }
      if (step === 4) {
        if (!days.length) syncDays();
        await persist({ days: days.length ? days : datesBetween(startDate, endDate).map((date) => ({ date, morning: true, afternoon: true })) });
      }
      if (step === 5) await persist({ timeSlots: slots, maxExamsPerDay: maxPerDay, majorGapSessions: majorGap });
      if (step === 6) {
        const current = await persist();
        if (!current) throw new Error('Save the examination first');
        const generated = await generateExamTimetable(current.id);
        setSession(generated);
        navigate('/exams/timetable');
        return;
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e) {
      const msg = examApiError(e);
      setError(msg);
      if (!isAxiosError(e)) toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const classSource = (classes.length ? classes : catalog.map((c) => ({ ...c, selected: true, courses: c.courses }))).map((c) => {
    if (c.courses?.length) return c;
    const cat = findCatalogClass(catalog, c.classId, c.className);
    return cat ? { ...c, courses: cat.courses, studentCount: c.studentCount || cat.studentCount } : c;
  });

  const previewDays = useMemo(() => days.length ? days : (startDate && endDate ? datesBetween(startDate, endDate).map((date) => ({ date, morning: true, afternoon: true })) : []), [days, startDate, endDate]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.25, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/exams/sessions')}><ArrowBackIcon /></IconButton>
          <Box>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Create Examination</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>Academic Year → Exam Session → Classes → Courses → Rooms → Days → Generate</Typography>
          </Box>
        </Box>
        <FormStepper steps={STEPS} activeStep={step} onStepClick={setStep} />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {catalogWarning && !error ? <Alert severity="warning" sx={{ mb: 2 }}>{catalogWarning}</Alert> : null}

        {step === 0 && (
          <Box sx={{ maxWidth: 720, p: 3, bgcolor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontWeight: 800, mb: 2, color: NAVY }}>Exam information</Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField label="Exam Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <FormControl>
                  <InputLabel>Academic Year</InputLabel>
                  <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                    {(settings?.academicYears ?? []).map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel>Term</InputLabel>
                  <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
                    {(settings?.terms ?? []).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel>Exam Type</InputLabel>
                  <Select label="Exam Type" value={examType} onChange={(e) => setExamType(e.target.value)}>
                    {EXAM_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField type="date" label="Start Date" slotProps={{ inputLabel: { shrink: true } }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <TextField type="date" label="End Date" slotProps={{ inputLabel: { shrink: true } }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Box>
              <FormControlLabel control={<Checkbox checked={autoGen} onChange={(e) => setAutoGen(e.target.checked)} />} label="Generate timetable automatically" />
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: NAVY }}>Select classes</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Classes come from Student Management. Courses come from Smart Timetable → Config Class.</Typography>
              </Box>
              <Box>
                <Button onClick={() => setClasses(classSource.map((c) => ({ ...c, selected: true })))} sx={{ textTransform: 'none' }}>Select all classes</Button>
                <Button onClick={() => setClasses(classSource.map((c) => ({ ...c, selected: false })))} sx={{ textTransform: 'none' }}>Clear</Button>
              </Box>
            </Box>
            {classSource.map((c) => (
              <Box key={c.classId} sx={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px', py: 1.1, borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700 }}>{c.className}</Typography>
                <Typography sx={{ color: '#64748b' }}>{c.studentCount} students</Typography>
                <Typography sx={{ color: '#64748b' }}>{c.courses?.length ?? 0} courses</Typography>
                <Checkbox checked={c.selected} onChange={(e) => setClasses(classSource.map((x) => x.classId === c.classId ? { ...x, selected: e.target.checked } : x))} />
              </Box>
            ))}
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b' }}>
              Tick a course to include it in this exam. Tick <b>Major</b> for papers that should be spaced apart in the timetable.
            </Typography>
            {selectedClasses.map((cls) => {
              const list = courses.filter((c) => c.classId === cls.classId);
              return (
                <Box key={cls.classId} sx={{ p: 2.5, bgcolor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontWeight: 800, color: NAVY }}>{cls.className}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 1.5 }}>{list.length} courses · {cls.studentCount} students</Typography>
                  {list.map((course) => (
                    <Box key={course.subjectName} sx={{ display: 'grid', gridTemplateColumns: '40px 1fr auto 120px', alignItems: 'center', gap: 1.5, py: 0.6 }}>
                      <Checkbox checked={course.selected} onChange={(e) => setCourses(courses.map((x) => x.classId === cls.classId && x.subjectName === course.subjectName ? { ...x, selected: e.target.checked } : x))} />
                      <Typography sx={{ fontWeight: 600 }}>{course.subjectName}{course.isMajor ? ' ★' : ''}</Typography>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!course.isMajor}
                            onChange={(e) => setCourses(courses.map((x) => x.classId === cls.classId && x.subjectName === course.subjectName ? { ...x, isMajor: e.target.checked } : x))}
                          />
                        }
                        label="Major"
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Minutes"
                        value={course.durationMinutes}
                        onChange={(e) => setCourses(courses.map((x) => x.classId === cls.classId && x.subjectName === course.subjectName ? { ...x, durationMinutes: Number(e.target.value) } : x))}
                        sx={{ width: 120 }}
                      />
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        )}

        {step === 3 && (
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Examination rooms</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 2 }}>Classes are who takes the exam. Rooms are where students sit.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}><Typography sx={{ fontSize: '0.7rem' }}>Total classes</Typography><Typography sx={{ fontWeight: 800, fontSize: '1.4rem' }}>{selectedClasses.length}</Typography></Box>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}><Typography sx={{ fontSize: '0.7rem' }}>Default rooms</Typography><Typography sx={{ fontWeight: 800, fontSize: '1.4rem' }}>{selectedClasses.length}</Typography></Box>
              <TextField type="number" label="Actual exam rooms" value={roomCount} onChange={(e) => applyRoomCount(Number(e.target.value) || 1)} />
              <TextField type="number" label="Capacity per room" value={defaultCapacity} onChange={(e) => { const v = Number(e.target.value) || 50; setDefaultCapacity(v); setRooms(rooms.map((r) => ({ ...r, capacity: v }))); }} />
            </Box>
            <FormControlLabel control={<Switch checked={useClassDefault} onChange={(e) => { setUseClassDefault(e.target.checked); if (e.target.checked) applyRoomCount(selectedClasses.length); }} />} label="Use number of classes as default" />
            {neededRooms > rooms.length ? (
              <Alert severity="warning" sx={{ my: 2 }}>
                {totalStudents} students require approximately {neededRooms} rooms. You currently have {rooms.length} rooms.
              </Alert>
            ) : null}
            {rooms.map((room, i) => (
              <Box key={room.name + i} sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 90px 90px', gap: 1, py: 1 }}>
                <TextField size="small" label="Room" value={room.name} onChange={(e) => setRooms(rooms.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))} />
                <TextField size="small" type="number" label="Capacity" value={room.capacity} onChange={(e) => setRooms(rooms.map((r, idx) => idx === i ? { ...r, capacity: Number(e.target.value) } : r))} />
                <TextField size="small" type="number" label="Rows" value={room.rows ?? 5} onChange={(e) => setRooms(rooms.map((r, idx) => idx === i ? { ...r, rows: Number(e.target.value) } : r))} />
                <TextField size="small" type="number" label="Cols" value={room.cols ?? 10} onChange={(e) => setRooms(rooms.map((r, idx) => idx === i ? { ...r, cols: Number(e.target.value) } : r))} />
              </Box>
            ))}
          </Box>
        )}

        {step === 4 && (
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Exam period</Typography>
            <Typography sx={{ mb: 2, color: '#64748b' }}>{dateLabel(startDate)} – {dateLabel(endDate)} · {previewDays.length} examination days</Typography>
            <Button onClick={syncDays} sx={{ mb: 2, textTransform: 'none' }}>Recalculate days</Button>
            {previewDays.map((day, i) => (
              <Box key={day.date} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Typography sx={{ width: 200, fontWeight: 700 }}>{dateLabel(day.date, { weekday: 'long', day: 'numeric', month: 'short' })}</Typography>
                <FormControlLabel control={<Checkbox checked={day.morning} onChange={(e) => setDays(previewDays.map((d, idx) => idx === i ? { ...d, morning: e.target.checked } : d))} />} label="Morning" />
                <FormControlLabel control={<Checkbox checked={day.afternoon} onChange={(e) => setDays(previewDays.map((d, idx) => idx === i ? { ...d, afternoon: e.target.checked } : d))} />} label="Afternoon" />
              </Box>
            ))}
          </Box>
        )}

        {step === 5 && (
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', maxWidth: 720 }}>
            <Typography sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>Time sessions</Typography>
            {slots.map((slot, i) => (
              <Box key={slot.code} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 1.5 }}>
                <TextField label="Session" value={slot.label} onChange={(e) => setSlots(slots.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s))} />
                <TextField type="time" label="Start" slotProps={{ inputLabel: { shrink: true } }} value={slot.startTime} onChange={(e) => setSlots(slots.map((s, idx) => idx === i ? { ...s, startTime: e.target.value } : s))} />
                <TextField type="time" label="End" slotProps={{ inputLabel: { shrink: true } }} value={slot.endTime} onChange={(e) => setSlots(slots.map((s, idx) => idx === i ? { ...s, endTime: e.target.value } : s))} />
              </Box>
            ))}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
              <TextField type="number" label="Maximum exams per class per day" value={maxPerDay} onChange={(e) => setMaxPerDay(Number(e.target.value) || 1)} />
              <TextField type="number" label="Minimum gap between major exams (sessions)" value={majorGap} onChange={(e) => setMajorGap(Number(e.target.value) || 0)} />
            </Box>
          </Box>
        )}

        {step === 6 && (
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>Generate smart timetable</Typography>
            <Typography sx={{ color: '#64748b', mb: 2 }}>The generator prevents student, room and invigilator conflicts, respects duration and capacity, spaces major subjects, and splits large classes across rooms.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}><Typography sx={{ fontSize: '0.7rem' }}>Classes</Typography><Typography sx={{ fontWeight: 800, fontSize: '1.5rem' }}>{selectedClasses.length}</Typography></Box>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}><Typography sx={{ fontSize: '0.7rem' }}>Courses</Typography><Typography sx={{ fontWeight: 800, fontSize: '1.5rem' }}>{courses.filter((c) => c.selected).length}</Typography></Box>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}><Typography sx={{ fontSize: '0.7rem' }}>Rooms</Typography><Typography sx={{ fontWeight: 800, fontSize: '1.5rem' }}>{rooms.length}</Typography></Box>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3 }}><Typography sx={{ fontSize: '0.7rem' }}>Days</Typography><Typography sx={{ fontWeight: 800, fontSize: '1.5rem' }}>{previewDays.length}</Typography></Box>
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 3, py: 1.5, bgcolor: '#fff', borderTop: '1px solid #e2e8f0' }}>
        <Button disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)} sx={{ textTransform: 'none' }}>Back</Button>
        <Button
          variant="contained"
          disabled={busy}
          startIcon={step === 6 ? <AutoAwesomeIcon /> : undefined}
          onClick={nextStep}
          sx={{ bgcolor: step === 6 ? AMBER : NAVY, color: step === 6 ? NAVY : '#fff', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: step === 6 ? '#fdd067' : '#0a0a5a' } }}
        >
          {step === 6 ? 'Generate Smart Timetable' : 'Continue'}
        </Button>
      </Box>
    </Box>
  );
}

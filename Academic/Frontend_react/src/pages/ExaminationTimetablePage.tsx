// @ts-nocheck - MUI9 Stack/TextField overload typing; runtime-correct
﻿import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import type { AxiosError } from 'axios';
import { toast } from '@/lib/toast';
import {
  getExaminationTimetableContext,
  generateExaminationTimetable,
  listExaminationTimetables,
  listExaminationTypes,
  createExaminationType,
  saveExaminationTimetable,
  deleteExaminationTimetable,
  smListClasses,
  type ClassExaminationTimetable,
  type ExaminationSessionDefinition,
  type ExaminationSessionPeriod,
  type ExaminationType,
} from '@/services/api';

const NAVY = '#000435';
const AMBER = '#FCB038';

type SlotDraft = {
  examDate: string;
  session: ExaminationSessionPeriod;
  sessionCode: string;
  sessionName: string;
  courseName: string;
  startTime: string;
  endTime: string;
};

const DEFAULT_SESSIONS: ExaminationSessionDefinition[] = [
  { id: 'MORNING', name: 'Morning', startTime: '08:00', endTime: '10:00' },
  { id: 'AFTERNOON', name: 'Afternoon', startTime: '14:00', endTime: '16:00' },
];

type ClassOption = { id: string; label: string; classIds: string[] };
type ClassApiRow = { id: string; name?: string | null; label?: string | null; stream?: string | null };
type TimetableMode = 'MANUAL' | 'GENERATED';
type SavedTimetableGroup = { key: string; label: string; classIds: string[]; records: ClassExaminationTimetable[] };
type ApiErrorPayload = {
  message?: string;
  details?: { requiresConfirmation?: boolean; warnings?: string[] };
  error?: { message?: string; details?: { requiresConfirmation?: boolean; warnings?: string[] } };
};

function classGroupName(row: ClassApiRow) {
  const name = String(row.name || row.label || row.id || '').trim();
  const stream = String(row.stream || '').trim();
  if (!name || !stream) return name;
  const suffix = new RegExp(`\\s+${stream.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return name.replace(suffix, '').trim() || name;
}

function toDateKey(value?: string | null) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDays(start: string, end: string, excludeWeekends: boolean) {
  const s = toDateKey(start);
  const e = toDateKey(end);
  if (!s || !e) return [] as string[];
  const [sy, sm, sd] = s.split('-').map(Number);
  const [ey, em, ed] = e.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  if (last < cur) return [] as string[];
  const out: string[] = [];
  while (cur <= last) {
    const dow = cur.getDay();
    if (!excludeWeekends || (dow !== 0 && dow !== 6)) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      out.push(`${y}-${m}-${d}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function fmtDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function parseMins(t: string) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((t || '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function sessionPeriod(startTime: string): ExaminationSessionPeriod {
  return (parseMins(startTime) ?? 0) < 12 * 60 ? 'MORNING' : 'AFTERNOON';
}

function validateSessionDefinitions(sessionDefinitions: ExaminationSessionDefinition[]) {
  if (!sessionDefinitions.length) return 'Add at least one examination session';
  if (sessionDefinitions.length > 12) return 'A timetable can have at most 12 examination sessions';
  const names = new Set<string>();
  const sorted = [...sessionDefinitions].sort((a, b) => (parseMins(a.startTime) ?? 0) - (parseMins(b.startTime) ?? 0));
  for (const session of sorted) {
    const name = session.name.trim().toLocaleLowerCase();
    const start = parseMins(session.startTime);
    const end = parseMins(session.endTime);
    if (!name) return 'Enter a name for every examination session';
    if (names.has(name)) return `Session name "${session.name.trim()}" is used more than once`;
    names.add(name);
    if (start == null || end == null || end <= start) return `Set a valid time range for ${session.name.trim()}`;
  }
  for (let index = 1; index < sorted.length; index += 1) {
    if (parseMins(sorted[index - 1].endTime)! > parseMins(sorted[index].startTime)!) {
      return `${sorted[index - 1].name} and ${sorted[index].name} sessions overlap`;
    }
  }
  return '';
}

export default function ExaminationTimetablePage() {
  const { settings, ready, academicYear: orgYear, term: orgTerm } = useOrgAcademicPeriod();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [editorClassIds, setEditorClassIds] = useState<string[]>([]);
  const [editorReloadToken, setEditorReloadToken] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorExamTypeId, setEditorExamTypeId] = useState<string>('');
  const [editorReadOnly, setEditorReadOnly] = useState(false);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [timetableId, setTimetableId] = useState<string | null>(null);
  const [examinationCode, setExaminationCode] = useState<string | null>(null);
  const [courses, setCourses] = useState<Array<{ subjectName: string; courseCode?: string | null }>>([]);
  const [sessions, setSessions] = useState<ExaminationSessionDefinition[]>(DEFAULT_SESSIONS);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [savedTimetables, setSavedTimetables] = useState<ClassExaminationTimetable[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<TimetableMode>('MANUAL');
  const [createClassIds, setCreateClassIds] = useState<string[]>([]);
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createExcludeWeekends, setCreateExcludeWeekends] = useState(false);
  const [createSessions, setCreateSessions] = useState<ExaminationSessionDefinition[]>(DEFAULT_SESSIONS);
  const [createProgress, setCreateProgress] = useState('');
  const [savedSearch, setSavedSearch] = useState('');
  const [examinationTypes, setExaminationTypes] = useState<ExaminationType[]>([]);
  const [createTypeId, setCreateTypeId] = useState('');
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [creatingType, setCreatingType] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [dialogSessionCode, setDialogSessionCode] = useState('MORNING');
  const [dialogCourse, setDialogCourse] = useState('');
  const [dialogStart, setDialogStart] = useState('08:00');
  const [dialogEnd, setDialogEnd] = useState('10:00');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || initialized) return;
    setAcademicYear(orgYear || settings?.currentAcademicYear || settings?.academicYears?.[0] || '');
    setTerm(orgTerm || settings?.currentTerm || settings?.terms?.[0] || '');
    setInitialized(true);
  }, [ready, initialized, orgYear, orgTerm, settings]);

  useEffect(() => {
    let cancelled = false;
    setLoadingClasses(true);
    smListClasses()
      .then((rows: ClassApiRow[]) => {
        if (cancelled) return;
        const grouped = new Map<string, ClassOption>();
        for (const row of Array.isArray(rows) ? rows : []) {
          const label = classGroupName(row) || String(row.id);
          const key = label.toLocaleLowerCase();
          const group = grouped.get(key) || { id: key, label, classIds: [] };
          if (row.id && !group.classIds.includes(String(row.id))) group.classIds.push(String(row.id));
          grouped.set(key, group);
        }
        const mapped = Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label));
        setClasses(mapped);
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!academicYear || !term) { setExaminationTypes([]); return; }
    let cancelled = false;
    listExaminationTypes({ academicYear, term })
      .then((rows) => { if (!cancelled) setExaminationTypes(rows || []); })
      .catch(() => { if (!cancelled) setExaminationTypes([]); });
    return () => { cancelled = true; };
  }, [academicYear, term]);

  useEffect(() => {
    if (!initialized || !academicYear || !term) return;
    let cancelled = false;
    listExaminationTimetables({ academicYear, term })
      .then((rows) => {
        if (!cancelled) setSavedTimetables(rows);
      })
      .catch(() => {
        if (!cancelled) setSavedTimetables([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSaved(false);
      });
    return () => { cancelled = true; };
  }, [initialized, academicYear, term]);

  useEffect(() => {
    if (!classId || !academicYear || !term) {
      setCourses([]);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    const classIds = editorClassIds.length ? editorClassIds : [classId];
    Promise.all(classIds.map((id) => getExaminationTimetableContext({ classId: id, academicYear, term, examinationTypeId: editorExamTypeId || undefined })))
      .then((contexts) => {
        if (cancelled) return;
        const ctx = contexts.find((context) => context.classId === classId) || contexts[0];
        setCourses(Array.from(new Map(contexts.flatMap((context) => context.courses || []).map((course) => [
          course.subjectName.trim().toLocaleLowerCase(),
          { subjectName: course.subjectName, courseCode: course.courseCode ?? null },
        ])).values()));
        if (ctx.timetable) {
          setTimetableId(ctx.timetable.id);
          setExaminationCode(ctx.timetable.examinationCode || null);
          setEditorExamTypeId(String((ctx.timetable as any).examinationTypeId || (ctx.timetable as any).examinationType?.id || editorExamTypeId || ''));
          setStartDate(toDateKey(ctx.timetable.startDate));
          setEndDate(toDateKey(ctx.timetable.endDate));
          setExcludeWeekends(!!ctx.timetable.excludeWeekends);
          setSessions(Array.isArray(ctx.timetable.sessions) && ctx.timetable.sessions.length
            ? ctx.timetable.sessions
            : DEFAULT_SESSIONS);
          setSlots((ctx.timetable.slots || []).map((s) => ({
            examDate: toDateKey(s.examDate),
            session: s.session,
            sessionCode: s.sessionCode || s.session,
            sessionName: s.sessionName || (s.session === 'MORNING' ? 'Morning' : 'Afternoon'),
            courseName: s.courseName,
            startTime: s.startTime,
            endTime: s.endTime,
          })));
        } else {
          setTimetableId(null);
          setExaminationCode(null);
          setSessions(DEFAULT_SESSIONS);
          setSlots([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCourses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
  }, [classId, editorClassIds, editorReloadToken, academicYear, term, editorExamTypeId]);

  const days = useMemo(() => buildDays(startDate, endDate, excludeWeekends), [startDate, endDate, excludeWeekends]);
  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => (parseMins(a.startTime) ?? 0) - (parseMins(b.startTime) ?? 0)),
    [sessions],
  );

  const slotMap = useMemo(() => {
    const m = new Map<string, SlotDraft>();
    for (const s of slots) m.set(`${s.examDate}|${s.sessionCode}`, s);
    return m;
  }, [slots]);

  const scheduledCourseNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      if (editingKey && editingKey === `${s.examDate}|${s.sessionCode}`) continue;
      set.add(s.courseName.trim().toLowerCase());
    }
    return set;
  }, [slots, editingKey]);

  const selectedClass = classes.find((c) => c.classIds.includes(classId));
  const savedGroups = useMemo(() => {
    const groups = new Map<string, SavedTimetableGroup>();
    for (const timetable of savedTimetables) {
      const classGroup = classes.find((item) => item.classIds.includes(timetable.classId));
      const label = classGroup?.label || timetable.className;
      const key = classGroup?.id || label.toLocaleLowerCase();
      const group = groups.get(key) || {
        key,
        label,
        classIds: classGroup?.classIds || [timetable.classId],
        records: [],
      };
      group.records.push(timetable);
      groups.set(key, group);
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [classes, savedTimetables]);

  function openCreateDialog() {
    setCreateMode('MANUAL');
    setCreateClassIds([]);
    setCreateStartDate('');
    setCreateEndDate('');
    setCreateExcludeWeekends(false);
    setCreateSessions(DEFAULT_SESSIONS);
    setCreateProgress('');
    setCreateOpen(true);
  }

  async function handleCreateType() {
    const name = newTypeName.trim();
    if (!name) { toast.error('Enter examination type name'); return; }
    if (!academicYear || !term) { toast.error('Select academic year and term first'); return; }
    setCreatingType(true);
    try {
      const created = await createExaminationType({ name, academicYear, term });
      setExaminationTypes((prev) => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)));
      setCreateTypeId(created.id);
      setTypeModalOpen(false);
      setNewTypeName('');
      toast.success('Examination type created');
    } catch (e) {
      // handled
    } finally {
      setCreatingType(false);
    }
  }

  function openEditor(group: SavedTimetableGroup, preferredClassId?: string, readOnly = false) {
    const existingId = preferredClassId || group.records[0]?.classId;
    const typeId = String((group.records[0] as any)?.examinationTypeId || (group.records[0] as any)?.examinationType?.id || '');
    setEditorExamTypeId(typeId);
    setEditorReadOnly(readOnly);
    setEditorClassIds(group.classIds);
    setClassId(existingId || group.classIds[0] || '');
    setEditorReloadToken((token) => token + 1);
    setEditorOpen(true);
  }

  async function handleDeleteTimetable(group: SavedTimetableGroup) {
    const records = group.records.filter((r) => r?.id);
    if (!records.length) return;
    const label = group.label || 'this timetable';
    const ok = window.confirm(`Delete examination timetable for ${label}?`);
    if (!ok) return;
    try {
      for (const rec of records) {
        try {
          await deleteExaminationTimetable(rec.id);
        } catch (err) {
          const ax = err as AxiosError<ApiErrorPayload>;
          const details = ax?.response?.data?.details || ax?.response?.data?.error?.details;
          if (ax?.response?.status === 409 && details?.requiresConfirmation) {
            const warnings = Array.isArray(details.warnings) && details.warnings.length ? details.warnings.join('\n') : 'This timetable has dependent records.';
            const ok2 = window.confirm(`${warnings}\n\nDelete anyway?`);
            if (!ok2) continue;
            await deleteExaminationTimetable(rec.id, true);
          } else {
            throw err;
          }
        }
      }
      toast.success('Examination timetable deleted');
      const refreshed = await listExaminationTimetables({ academicYear, term });
      setSavedTimetables(refreshed);
      if (editorOpen && editorClassIds.some((id) => group.classIds.includes(id))) {
        setEditorOpen(false);
      }
    } catch (e) {
      // handled by interceptor
    }
  }

  async function handleCreateTimetables() {
    const selectedGroups = classes.filter((item) => createClassIds.includes(item.id));
    const daysInRange = buildDays(createStartDate, createEndDate, createExcludeWeekends);
    const sessionError = validateSessionDefinitions(createSessions);
    if (sessionError) {
      toast.error(sessionError);
      return;
    }
    if (!createTypeId) {
      toast.error('Select an examination type first');
      return;
    }
    if (!selectedGroups.length) {
      toast.error('Select at least one class');
      return;
    }
    if (!academicYear || !term || !createStartDate || !createEndDate || !daysInRange.length) {
      toast.error('Select a valid examination date range');
      return;
    }

    const targets = selectedGroups.flatMap((group) => group.classIds.map((id) => ({ group, id })));
    setGenerating(true);
    setCreateProgress('Loading selected classes...');
    const failed: string[] = [];
    let completed = 0;
    try {
      const contexts = await Promise.all(targets.map(({ id }) =>
        getExaminationTimetableContext({ classId: id, academicYear, term, examinationTypeId: createTypeId })
      ));
      const existingCount = contexts.filter((context) => context.timetable).length;
      if (createMode === 'GENERATED' && existingCount > 0) {
        const proceed = window.confirm(
          `This will replace ${existingCount} existing stream schedule(s) for the selected classes. Continue?`
        );
        if (!proceed) return;
      }

      for (let index = 0; index < targets.length; index += 1) {
        const { group, id } = targets[index];
        const context = contexts[index];
        setCreateProgress(`Preparing ${group.label} (${index + 1} of ${targets.length})...`);
        try {
          if (createMode === 'MANUAL') {
            if (!context.timetable) {
              await saveExaminationTimetable({
                classId: id,
                className: group.label,
                examinationTypeId: createTypeId,
                academicYear,
                term,
                startDate: createStartDate,
                endDate: createEndDate,
                excludeWeekends: createExcludeWeekends,
                sessions: createSessions,
                slots: [],
              });
            }
          } else {
            const proposal = await generateExaminationTimetable({
              classId: id,
              academicYear,
              term,
              examinationTypeId: createTypeId,
              startDate: createStartDate,
              endDate: createEndDate,
              excludeWeekends: createExcludeWeekends,
              sessions: createSessions,
            });
            const saveProposal = (confirmImpact = false) => saveExaminationTimetable({
              id: proposal.id || undefined,
              classId: id,
              className: group.label,
              examinationTypeId: createTypeId,
              academicYear,
              term,
              startDate: createStartDate,
              endDate: createEndDate,
              excludeWeekends: createExcludeWeekends,
              sessions: proposal.sessions || createSessions,
              confirmImpact,
              slots: proposal.slots,
            });
            try {
              await saveProposal();
            } catch (error) {
              const ax = error as AxiosError<ApiErrorPayload>;
              const details = ax?.response?.data?.details || ax?.response?.data?.error?.details;
              if (ax?.response?.status !== 409 || !details?.requiresConfirmation) throw error;
              const warnings = Array.isArray(details.warnings) && details.warnings.length
                ? details.warnings.join('\n')
                : 'This schedule has dependent examination records.';
              if (!window.confirm(`${warnings}\n\nContinue and replace this schedule?`)) {
                failed.push(`${group.label}: update cancelled`);
                continue;
              }
              await saveProposal(true);
            }
          }
          completed += 1;
        } catch (error) {
          const ax = error as AxiosError<ApiErrorPayload>;
          const message = ax?.response?.data?.message || ax?.response?.data?.error?.message || ax.message || 'Request failed';
          failed.push(`${group.label}: ${message}`);
        }
      }
      const refreshed = await listExaminationTimetables({ academicYear, term });
      setSavedTimetables(refreshed);
      if (completed > 0) {
        setCreateOpen(false);
        const firstGroup = selectedGroups[0];
        const firstRecord = refreshed.find((item) => firstGroup.classIds.includes(item.classId));
        if (firstRecord) openEditor(firstGroup, firstRecord.classId);
        toast.success(`${completed} class schedule${completed === 1 ? '' : 's'} prepared`);
      }
      if (failed.length) toast.error(`Could not prepare ${failed.length} schedule(s). ${failed[0]}`);
    } catch (error) {
      const ax = error as AxiosError<ApiErrorPayload>;
      toast.error(ax?.response?.data?.message || ax?.response?.data?.error?.message || 'Could not load the selected class schedules');
    } finally {
      setGenerating(false);
      setCreateProgress('');
    }
  }

  function openSlotDialog(day: string, session: ExaminationSessionDefinition) {
    const key = `${day}|${session.id}`;
    const existing = slotMap.get(key);
    setDialogDate(day);
    setDialogSessionCode(session.id);
    setEditingKey(existing ? key : null);
    setDialogCourse(existing?.courseName || courses[0]?.subjectName || '');
    setDialogStart(existing?.startTime || session.startTime);
    setDialogEnd(existing?.endTime || session.endTime);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingKey(null);
  }

  function applySlot() {
    if (!dialogCourse.trim()) {
      toast.error('Select a course');
      return;
    }
    const s = parseMins(dialogStart);
    const e = parseMins(dialogEnd);
    if (s == null || e == null || e <= s) {
      toast.error('End time must be after start time');
      return;
    }
    const dialogSession = sessions.find((session) => session.id === dialogSessionCode);
    if (!dialogSession) {
      toast.error('Select a valid examination session');
      return;
    }
    const duplicateCourse = slots.some((slot) =>
      !(slot.examDate === dialogDate && slot.sessionCode === dialogSessionCode) &&
      slot.courseName.trim().toLowerCase() === dialogCourse.trim().toLowerCase()
    );
    if (duplicateCourse) {
      toast.error('This course is already scheduled on another examination date');
      return;
    }
    const next: SlotDraft = {
      examDate: dialogDate,
      session: sessionPeriod(dialogStart),
      sessionCode: dialogSession.id,
      sessionName: dialogSession.name,
      courseName: dialogCourse.trim(),
      startTime: dialogStart,
      endTime: dialogEnd,
    };
    const overlaps = slots.some((other) => {
      if (other.examDate !== dialogDate || other.sessionCode === dialogSession.id) return false;
      const otherStart = parseMins(other.startTime);
      const otherEnd = parseMins(other.endTime);
      return otherStart != null && otherEnd != null && s < otherEnd && otherStart < e;
    });
    if (overlaps) {
      toast.error('This session overlaps another session on the same day');
      return;
    }
    setSlots((prev) => {
      const filtered = prev.filter((x) => !(x.examDate === dialogDate && x.sessionCode === dialogSession.id));
      return [...filtered, next];
    });
    closeDialog();
  }

  function removeSlot(day: string, sessionCode: string) {
    setSlots((prev) => prev.filter((x) => !(x.examDate === day && x.sessionCode === sessionCode)));
  }

  function updateSessionDefinition(
    current: ExaminationSessionDefinition[],
    setCurrent: (next: ExaminationSessionDefinition[]) => void,
    id: string,
    changes: Partial<ExaminationSessionDefinition>,
  ) {
    setCurrent(current.map((session) => session.id === id ? { ...session, ...changes } : session));
  }

  function addSessionDefinition(
    current: ExaminationSessionDefinition[],
    setCurrent: (next: ExaminationSessionDefinition[]) => void,
  ) {
    let suffix = current.length + 1;
    while (current.some((session) => session.id === `SESSION_${suffix}`)) suffix += 1;
    const id = `SESSION_${suffix}`;
    setCurrent([...current, {
      id,
      name: current.length === 2 ? 'Second session' : `Session ${current.length + 1}`,
      startTime: '10:30',
      endTime: '12:30',
    }]);
  }

  function renderSessionSettings(
    current: ExaminationSessionDefinition[],
    setCurrent: (next: ExaminationSessionDefinition[]) => void,
    lockedSessionCodes: Set<string> = new Set(),
  ) {
    return (
      <Stack spacing={1.25}>
        {[...current].sort((a, b) => (parseMins(a.startTime) ?? 0) - (parseMins(b.startTime) ?? 0)).map((session) => (
          <Box
            key={session.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr auto' },
              gap: 1,
              alignItems: 'center',
              p: 1.25,
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              bgcolor: '#fff',
            }}
          >
            <TextField
              size="small"
              label="Session name"
              value={session.name}
              onChange={(event) => updateSessionDefinition(current, setCurrent, session.id, { name: event.target.value })}
              fullWidth
            />
            <TextField
              size="small"
              label="From"
              type="time"
              value={session.startTime}
              onChange={(event) => updateSessionDefinition(current, setCurrent, session.id, { startTime: event.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              size="small"
              label="To"
              type="time"
              value={session.endTime}
              onChange={(event) => updateSessionDefinition(current, setCurrent, session.id, { endTime: event.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <Tooltip title={lockedSessionCodes.has(session.id) ? 'Remove this session’s scheduled courses first' : 'Remove session'}>
              <span>
                <IconButton
                  aria-label={`Remove ${session.name} session`}
                  color="error"
                  disabled={current.length <= 1 || lockedSessionCodes.has(session.id)}
                  onClick={() => setCurrent(current.filter((item) => item.id !== session.id))}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => addSessionDefinition(current, setCurrent)}
          disabled={current.length >= 12}
          sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 2 }}
        >
          Add session
        </Button>
        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
          Set each session’s label and time range. Sessions are shown in time order and cannot overlap.
        </Typography>
      </Stack>
    );
  }

  async function handleSave() {
    const targetClassIds = editorClassIds.length ? editorClassIds : [classId];
    if (!targetClassIds.length || !targetClassIds[0] || !academicYear || !term || !startDate || !endDate) {
      toast.error('Select a class and valid date range');
      return;
    }
    if (!days.length) {
      toast.error('Select a valid date range');
      return;
    }
    const sessionError = validateSessionDefinitions(sessions);
    if (sessionError) {
      toast.error(sessionError);
      return;
    }
    setSaving(true);
    try {
      const contexts = await Promise.all(targetClassIds.map((id) =>
        getExaminationTimetableContext({ classId: id, academicYear, term, examinationTypeId: editorExamTypeId || undefined })
      ));
      const results: ClassExaminationTimetable[] = [];
      for (const context of contexts) {
        const save = (allowImpact = false) => saveExaminationTimetable({
          id: context.timetable?.id,
          classId: context.classId,
          className: selectedClass?.label || context.className,
          examinationTypeId: editorExamTypeId || undefined,
          academicYear,
          term,
          startDate,
          endDate,
          excludeWeekends,
          sessions,
          confirmImpact: allowImpact,
          slots,
        });
        try {
          results.push(await save());
        } catch (err) {
          const ax = err as AxiosError<ApiErrorPayload>;
          const details = ax?.response?.data?.details || ax?.response?.data?.error?.details;
          if (ax?.response?.status === 409 && details?.requiresConfirmation) {
            const warnings = Array.isArray(details.warnings) && details.warnings.length
              ? details.warnings.join('\n')
              : 'This schedule has dependent examination records.';
            const ok = window.confirm(`${warnings}\n\nSaving may affect linked examination lists or invigilator assignments. Continue?`);
            if (!ok) {
              toast.info('Schedule save cancelled');
              break;
            }
            results.push(await save(true));
          } else {
            throw err;
          }
        }
      }
      if (!results.length) return;
      setTimetableId(results[0].id);
      setExaminationCode(results[0].examinationCode || null);
      const refreshed = await listExaminationTimetables({ academicYear, term });
      setSavedTimetables(refreshed);
      toast.success(`${results.length} class schedule${results.length === 1 ? '' : 's'} saved`);
    } catch (err) {
      const ax = err as AxiosError<ApiErrorPayload>;
      toast.error(ax?.response?.data?.message || ax?.response?.data?.error?.message || 'Could not save the examination timetable');
    } finally {
      setSaving(false);
    }
  }

  const sessionCell = (day: string, session: ExaminationSessionDefinition) => {
    const slot = slotMap.get(`${day}|${session.id}`);
    if (!slot) {
      return (
        <Box
          onClick={() => { if (!editorReadOnly) openSlotDialog(day, session); }}
          sx={{
            minHeight: 92,
            border: '1px dashed #cbd5e1',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: editorReadOnly ? 'default' : 'pointer',
            bgcolor: '#fff',
            transition: 'all .15s ease',
            '&:hover': editorReadOnly ? {} : { borderColor: AMBER, bgcolor: '#fffbf2' },
          }}
        >
          <Stack spacing={0.5} alignItems="center">
            {!editorReadOnly ? <AddIcon sx={{ color: '#94a3b8' }} /> : null}
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{editorReadOnly ? 'No exam' : 'Add exam'}</Typography>
          </Stack>
        </Box>
      );
    }
    return (
      <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: '#dbe4f0', bgcolor: '#f8fbff', minHeight: 92 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: NAVY, lineHeight: 1.3 }}>{slot.courseName}</Typography>
        <Typography sx={{ mt: 0.4, fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{session.name}</Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
          {slot.startTime} - {slot.endTime}
        </Typography>
        {!editorReadOnly ? (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
            <IconButton size="small" aria-label={`Edit ${slot.courseName} examination session`} onClick={() => openSlotDialog(day, session)} sx={{ color: '#0369a1' }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={`Delete ${slot.courseName} examination session`} onClick={() => removeSlot(day, session.id)} sx={{ color: '#dc2626' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ) : null}
      </Paper>
    );
  };

  const filteredSavedGroups = savedGroups.filter((group) => {
    const query = savedSearch.trim().toLocaleLowerCase();
    return !query || group.label.toLocaleLowerCase().includes(query) ||
      group.records.some((record) => (record.examinationCode || '').toLocaleLowerCase().includes(query));
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: '100%' }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' } as any} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' } as any} spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY }}>Examination Timetable</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
              Create and manage examination schedules by class for the selected academic period.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' } as any} spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>Academic year</InputLabel>
              <Select label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {(settings?.academicYears?.length ? settings.academicYears : (academicYear ? [academicYear] : [])).map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
              <InputLabel>Term</InputLabel>
              <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
                {(settings?.terms?.length ? settings.terms : (term ? [term] : [])).map((currentTerm) => (
                  <MenuItem key={currentTerm} value={currentTerm}>{currentTerm}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => { setNewTypeName(''); setTypeModalOpen(true); }}
                disabled={!academicYear || !term}
                sx={{ whiteSpace: 'nowrap', textTransform: 'none', borderRadius: 2 }}
              >
                Add Exam Type
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
                disabled={!academicYear || !term || loadingClasses}
                sx={{ whiteSpace: 'nowrap', textTransform: 'none', bgcolor: NAVY, borderRadius: 2, '&:hover': { bgcolor: '#001f5c' } }}
              >
                New timetable
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', sm: 'row' } as any} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' } as any} spacing={1.5} sx={{ p: 2.25, borderBottom: '1px solid #e2e8f0' }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Saved examination schedules</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Schedules are grouped by class; stream records are managed together.</Typography>
          </Box>
          <TextField size="small" label="Search class or exam code" value={savedSearch} onChange={(e) => setSavedSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 260 } }} />
        </Stack>
        {loadingSaved ? (
          <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {['Class', 'Exam Type', 'Examination code', 'Date range', 'Sessions', 'Linked schedules', 'Status', 'Actions'].map((heading) => (
                    <TableCell key={heading} align={heading === 'Actions' ? 'right' : 'left'} sx={{ fontWeight: 800, color: '#475569', bgcolor: '#f8fafc', fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{heading}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSavedGroups.length ? filteredSavedGroups.map((group) => {
                  const record = group.records[0];
                  const sessionCount = record?.sessions?.length || new Set((record?.slots || []).map((slot) => slot.sessionCode || slot.session)).size;
                  const dateRange = record?.startDate && record?.endDate
                    ? `${toDateKey(record.startDate)} – ${toDateKey(record.endDate)}`
                    : '—';
                  const complete = group.records.length >= group.classIds.length && group.records.every((item) => item.slots?.length);
                  return (
                    <TableRow key={group.key} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ minWidth: 160 }}>
                        <Typography sx={{ fontWeight: 750, color: NAVY }}>{group.label}</Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        {(() => { const t = (record as any)?.examinationType?.name || (record as any)?.examinationTypeName; return t ? <Chip size="small" label={t} sx={{ bgcolor: '#eef2ff', color: NAVY, fontWeight: 700 }} /> : <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</Typography>; })()}
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        {group.records.map((item) => item.examinationCode).filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateRange}</TableCell>
                      <TableCell>{sessionCount}</TableCell>
                      <TableCell>{group.records.length} of {group.classIds.length}</TableCell>
                      <TableCell>
                        <Chip size="small" label={complete ? 'Ready' : 'Draft'} color={complete ? 'success' : 'warning'} />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View schedule">
                            <IconButton size="small" onClick={() => openEditor(group, undefined, true)} sx={{ color: '#0ea5e9', bgcolor: '#f0f9ff', '&:hover': { bgcolor: '#e0f2fe' } }}>
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit schedule">
                            <IconButton size="small" onClick={() => openEditor(group, undefined, false)} sx={{ color: NAVY, bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete schedule">
                            <IconButton size="small" onClick={() => void handleDeleteTimetable(group)} sx={{ color: '#dc2626', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 7, textAlign: 'center' }}>
                      <CalendarMonthOutlinedIcon sx={{ color: '#94a3b8', fontSize: 32, mb: 1 }} />
                      <Typography sx={{ fontWeight: 700, color: NAVY }}>No examination schedules yet</Typography>
                      <Typography sx={{ mt: 0.5, fontSize: '0.82rem', color: '#64748b' }}>Create a manual or generated schedule for one or more classes.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog fullScreen open={editorOpen} onClose={() => setEditorOpen(false)} PaperProps={{ sx: { bgcolor: '#f1f5f9' } }}>
        <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
          <Stack direction={{ xs: 'column', md: 'row' } as any} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' } as any} spacing={1.5}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.15rem' }}>{editorReadOnly ? 'View Examination Schedule' : 'Exam Schedule Editor'}</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                {selectedClass?.label || 'Class'} ? {academicYear} {term} ? {courses.length} course{courses.length === 1 ? '' : 's'} available
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {editorReadOnly ? <Chip size="small" color="info" label="View only" /> : null}
              {timetableId ? <Chip size="small" color="success" label="Saved schedule" /> : <Chip size="small" label="Draft" />}
              {examinationCode ? <Chip size="small" color="primary" label={`Exam: ${examinationCode}`} /> : null}
              <Button variant="outlined" onClick={() => setEditorOpen(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>{editorReadOnly ? 'Close' : 'Back to Table'}</Button>
              {!editorReadOnly ? (
                <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                  onClick={() => void handleSave()} disabled={saving || generating || loadingContext || !startDate || !endDate}
                  sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>
                  Save Schedule
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1800, mx: 'auto', width: '100%' }}>
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#fff' }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Schedule Settings</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
              <TextField select size="small" label="Examination Type" value={editorExamTypeId} onChange={(e) => setEditorExamTypeId(e.target.value)} disabled={editorReadOnly} fullWidth>
                <MenuItem value="">No type</MenuItem>
                {examinationTypes.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth disabled={editorReadOnly} />
              <TextField size="small" label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth disabled={editorReadOnly} />
              <FormControlLabel
                control={<Checkbox checked={excludeWeekends} onChange={(e) => setExcludeWeekends(e.target.checked)} disabled={editorReadOnly} />}
                label="Exclude weekends"
                sx={{ ml: 0, '& .MuiTypography-root': { fontSize: '0.875rem', fontWeight: 600, color: '#334155' } }}
              />
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              {slots.length ? <Chip size="small" label={`${slots.length} scheduled exam${slots.length === 1 ? '' : 's'}`} /> : null}
              <Chip size="small" label={`${sessions.length} session${sessions.length === 1 ? '' : 's'} configured`} variant="outlined" />
              {loadingClasses || loadingContext ? <CircularProgress size={16} /> : null}
            </Stack>
            {!editorReadOnly ? (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25 }}>
                  Examination sessions
                </Typography>
                {renderSessionSettings(sessions, setSessions, new Set(slots.map((slot) => slot.sessionCode)))}
              </Box>
            ) : null}
          </Paper>

          {(!classId || !academicYear || !term) ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>Select a class and academic period to edit its examination schedule.</Alert>
          ) : (!startDate || !endDate) ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>Set the examination dates to build the timetable grid.</Alert>
          ) : !days.length ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>No valid exam days in the selected range. Adjust dates or weekend settings.</Alert>
          ) : (
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <CalendarMonthOutlinedIcon sx={{ color: NAVY }} />
                <Typography sx={{ fontWeight: 700, color: NAVY }}>Exam Schedule</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>All configured sessions appear for every exam day. Click a cell to add or edit a course.</Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', minWidth: 220 }}>Date</TableCell>
                      {orderedSessions.map((session) => (
                        <TableCell key={session.id} sx={{ fontWeight: 800, bgcolor: '#f8fafc', minWidth: 260 }}>
                          <Typography sx={{ fontWeight: 800, color: NAVY }}>{session.name}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {session.startTime} – {session.endTime}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {days.map((day) => (
                      <TableRow key={day} hover>
                        <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.9rem' }}>{fmtDate(day)}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{day}</Typography>
                        </TableCell>
                        {orderedSessions.map((session) => (
                          <TableCell key={`${day}-${session.id}`} sx={{ verticalAlign: 'top', py: 1.25 }}>
                            {sessionCell(day, session)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => { if (!generating) setCreateOpen(false); }}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 }, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>Create examination timetable</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>
            Choose a setup method, classes and examination dates.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2.5, bgcolor: '#f8fafc' }}>
          <Stack spacing={2.25}>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Examination Type
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => { setNewTypeName(''); setTypeModalOpen(true); }} sx={{ textTransform: 'none' }}>Add Type</Button>
              </Stack>
              <TextField
                select
                size="small"
                fullWidth
                label="Select examination type"
                value={createTypeId}
                onChange={(e) => setCreateTypeId(e.target.value)}
              >
                <MenuItem value="">Select type...</MenuItem>
                {examinationTypes.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
              {!examinationTypes.length ? <Typography sx={{ mt: 0.75, fontSize: '0.75rem', color: '#64748b' }}>No exam types for this year/term yet. Add one (e.g. End of Term 1).</Typography> : null}
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                Setup method
              </Typography>
              <RadioGroup value={createMode} onChange={(e) => setCreateMode(e.target.value as TimetableMode)} sx={{ gap: 1 }}>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: createMode === 'MANUAL' ? NAVY : '#e2e8f0', bgcolor: '#fff' }}>
                  <FormControlLabel
                    value="MANUAL"
                    control={<Radio />}
                    sx={{ alignItems: 'flex-start', m: 0 }}
                    label={<Box sx={{ pt: 0.25 }}>
                      <Typography sx={{ fontWeight: 700, color: NAVY }}>Manual timetable</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Open an empty schedule and add each course and session yourself.</Typography>
                    </Box>}
                  />
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: createMode === 'GENERATED' ? NAVY : '#e2e8f0', bgcolor: '#fff' }}>
                  <FormControlLabel
                    value="GENERATED"
                    control={<Radio />}
                    sx={{ alignItems: 'flex-start', m: 0 }}
                    label={<Box sx={{ pt: 0.25 }}>
                      <Typography sx={{ fontWeight: 700, color: NAVY }}>Generate automatically</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Use each class’s assigned courses and distribute them across the selected dates.</Typography>
                    </Box>}
                  />
                </Paper>
              </RadioGroup>
            </Box>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.25 }}>
                Session setup
              </Typography>
              {renderSessionSettings(createSessions, setCreateSessions)}
            </Paper>

            <Autocomplete
              multiple
              options={classes}
              value={classes.filter((item) => createClassIds.includes(item.id))}
              getOptionLabel={(item) => item.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, selected) => setCreateClassIds(selected.map((item) => item.id))}
              disableCloseOnSelect
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <Typography sx={{ fontSize: '0.9rem' }}>{option.label}</Typography>
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Select classes" placeholder="Choose one or more classes" />}
            />
            {classes.length === 0 && !loadingClasses ? (
              <Alert severity="warning">No classes were returned by Student Management.</Alert>
            ) : null}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField size="small" label="Start date" type="date" value={createStartDate} onChange={(e) => setCreateStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField size="small" label="End date" type="date" value={createEndDate} onChange={(e) => setCreateEndDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            </Box>
            <FormControlLabel
              control={<Checkbox checked={createExcludeWeekends} onChange={(e) => setCreateExcludeWeekends(e.target.checked)} />}
              label="Exclude weekends"
              sx={{ ml: 0, '& .MuiTypography-root': { fontSize: '0.875rem', fontWeight: 600, color: '#334155' } }}
            />
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Academic year and term follow the current selection. Each selected class includes all its sections; section names are hidden.
            </Alert>
            {createProgress ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#475569' }}>
                <CircularProgress size={17} />
                <Typography sx={{ fontSize: '0.82rem' }}>{createProgress}</Typography>
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={generating} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleCreateTimetables()}
            disabled={generating || loadingClasses || createClassIds.length === 0}
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : createMode === 'GENERATED' ? <AutoAwesomeOutlinedIcon /> : <AddIcon />}
            sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}
          >
            {generating ? 'Preparing...' : createMode === 'GENERATED' ? 'Generate schedules' : 'Create manual schedules'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>
            {editingKey ? 'Edit Examination Session' : 'Add Examination Session'}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>
            {dialogDate ? fmtDate(dialogDate) : ''} · {sessions.find((session) => session.id === dialogSessionCode)?.name || 'Examination'} session
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3, bgcolor: '#f8fafc' }}>
          <Stack spacing={2.5}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Session Details</Typography>
              <Stack spacing={2}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={courses.map((c) => c.subjectName).filter((name) => !scheduledCourseNames.has(name.trim().toLowerCase()))}
                  value={dialogCourse}
                  onChange={(_, v) => setDialogCourse(v || '')}
                  onInputChange={(_, v) => setDialogCourse(v)}
                  renderInput={(params) => <TextField {...params} label="Course / Subject" placeholder="Select or type course name" helperText="Already-scheduled courses are hidden from other slots." />}
                />
                <Stack direction={{ xs: 'column', sm: 'row' } as any} spacing={1.5}>
                  <TextField label="Start time" type="time" size="small" value={dialogStart} onChange={(e) => setDialogStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                  <TextField label="End time" type="time" size="small" value={dialogEnd} onChange={(e) => setDialogEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </Stack>
              </Stack>
            </Paper>
            {!courses.length ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>No courses were retrieved from the class timetable. You can still type a course name manually.</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', gap: 1 }}>
          <Button onClick={closeDialog} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Button variant="contained" onClick={applySlot} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5, '&:hover': { bgcolor: '#0a1650' } }}>{editingKey ? 'Update Session' : 'Add Session'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={typeModalOpen} onClose={() => !creatingType && setTypeModalOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>Add Examination Type</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>Create a type for {academicYear} {term}, e.g. End of Term 1.</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3, bgcolor: '#f8fafc' }}>
          <Stack spacing={2}>
            <TextField label="Type name" size="small" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="e.g. End of Term 1" fullWidth autoFocus />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', gap: 1 }}>
          <Button onClick={() => setTypeModalOpen(false)} disabled={creatingType} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateType} disabled={creatingType || !newTypeName.trim()} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}>{creatingType ? 'Saving...' : 'Save Type'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

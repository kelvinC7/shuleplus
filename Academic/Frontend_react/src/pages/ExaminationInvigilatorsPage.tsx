// @ts-nocheck - MUI9 Stack/TextField overload typing; runtime-correct
import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Alert,
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
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { toast } from '@/lib/toast';
import {
  getExaminationInvigilatorsContext,
  generateExaminationInvigilators,
  updateExaminationInvigilatorAssignment,
  getAvailableInvigilatorTeachers,
  addExaminationInvigilatorAssignment,
  clearExaminationInvigilatorAssignments,
  type ExaminationInvigilatorAssignment,
  type ExaminationInvigilatorTeacher,
} from '@/services/api';

const NAVY = '#000435';
const steps = ['Select Examination', 'Select Teachers', 'Configure Assignment', 'Review & Generate'];

function StatCard({ label, value, icon, tone }: { label: string; value: number | string; icon: React.ReactNode; tone: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#fff', minWidth: 170, flex: 1 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${tone}18`, color: tone, display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function toDateKey(value?: string) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : String(value).slice(0, 10);
}

function sessionCodeOf(record: any) {
  return record?.sessionCode || record?.session || 'MORNING';
}

function sessionNameOf(record: any) {
  return record?.sessionName || (record?.session === 'AFTERNOON' ? 'Afternoon' : 'Morning');
}

function fmtDate(value?: string) {
  const k = toDateKey(value);
  if (!k) return '—';
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function printHtml(title: string, bodyHtml: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
    h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:18px 0 6px}
    .meta{color:#475569;margin-bottom:12px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{border:1px solid #cbd5e1;padding:7px;font-size:12px;text-align:left}
    th{background:#f1f5f9}
    .block{page-break-inside:avoid;margin-bottom:18px}
  </style></head><body>${bodyHtml}</body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 300);
}

export default function ExaminationInvigilatorsPage() {
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<ExaminationInvigilatorTeacher[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedExamTypeId, setSelectedExamTypeId] = useState('');
  const [examTypes, setExamTypes] = useState<Array<{ id: string; name: string; academicYear: string; term: string }>>([]);
  const [typeTimetables, setTypeTimetables] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [assignments, setAssignments] = useState<ExaminationInvigilatorAssignment[]>([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [_wizardLoading, _setWizardLoading] = useState(false); void _wizardLoading; void _setWizardLoading;
  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [rotationMode, setRotationMode] = useState<'PER_SESSION' | 'DAILY' | 'NONE'>('PER_SESSION');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterSession, setFilterSession] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [filterInvigilator, setFilterInvigilator] = useState<string>('');
  const [roomView, setRoomView] = useState<any | null>(null);
  const [defaultPerRoom, setDefaultPerRoom] = useState(1);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [pickedTeacherIds, setPickedTeacherIds] = useState<string[]>([]);
  const [manualCounts, setManualCounts] = useState<Record<string, number>>({}); // roomId -> count
  const [generating, setGenerating] = useState(false);
  const [unassigned, setUnassigned] = useState<Array<{ roomName: string; date: string; session: string; sessionCode?: string; needed: number; assigned: number }>>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<ExaminationInvigilatorAssignment | null>(null);
  const [editTeacherId, setEditTeacherId] = useState('');
  const [addInvigOpen, setAddInvigOpen] = useState(false);
  const [addInvigCtx, setAddInvigCtx] = useState<{ examinationListId: string; roomId: string; roomName: string; examDate: string; session: 'MORNING' | 'AFTERNOON'; sessionCode: string; sessionName: string } | null>(null);
  const [availableInvigilators, setAvailableInvigilators] = useState<Array<{ id: string; name: string; email?: string | null }>>([]);
  const [addInvigTeacherId, setAddInvigTeacherId] = useState('');
  const [addInvigLoading, setAddInvigLoading] = useState(false);

  async function load(examListId?: string, examTypeId?: string) {
    setLoading(true);
    try {
      const ctx = await getExaminationInvigilatorsContext({ examinationListId: examListId || selectedListId || undefined, examinationTypeId: examTypeId ?? selectedExamTypeId ?? undefined });
      setLists(ctx.lists || []);
      setTeachers(ctx.teachers || []);
      setExamTypes(ctx.examinationTypes || []);
      setTypeTimetables((ctx as any).typeTimetables || []);
      setSelected(ctx.selected);
      setAssignments(ctx.selected?.assignments || []);
      setCoverage((ctx.selected as any)?.coverage || []);
    } catch {
      setLists([]); setTeachers([]); setExamTypes([]); setTypeTimetables([]); setSelected(null); setAssignments([]); setCoverage([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load('', ''); }, []);

  useEffect(() => {
    if (!selectedListId) { setSelected(null); setAssignments([]); return; }
    load(selectedListId, selectedExamTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListId, selectedExamTypeId]);

  const stats = useMemo(() => {
    if (!selected) return null;
    const daySet = new Set((selected.sessions || []).map((s: any) => toDateKey(s.examDate)));
    const roomSessionKeys = new Set<string>();
    for (const s of selected.sessions || []) for (const r of selected.rooms || []) roomSessionKeys.add(`${toDateKey(s.examDate)}|${sessionCodeOf(s)}|${r.id}`);
    const assignedKeys = new Set(assignments.map((a) => `${toDateKey(a.examDate)}|${sessionCodeOf(a)}|${a.roomId}`));
    const unassignedRooms = [...roomSessionKeys].filter((k) => !assignedKeys.has(k)).length;
    const teacherSet = new Set(assignments.map((a) => a.teacherUserId));
    return {
      totalExaminationDays: daySet.size,
      totalExaminationRooms: (selected.rooms || []).length,
      availableTeachers: teachers.filter((t) => t.active !== false).length,
      assignedInvigilators: teacherSet.size,
      unassignedRooms,
    };
  }, [selected, assignments, teachers]);

  const grouped = useMemo(() => {
    const map = new Map<string, { date: string; sessionCode: string; sessionName: string; startTime: string; items: ExaminationInvigilatorAssignment[] }>();
    for (const a of assignments) {
      const sessionCode = sessionCodeOf(a);
      const key = `${toDateKey(a.examDate)}|${sessionCode}`;
      if (!map.has(key)) map.set(key, { date: toDateKey(a.examDate), sessionCode, sessionName: sessionNameOf(a), startTime: a.startTime || '', items: [] });
      map.get(key)!.items.push(a);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [assignments]);

  const filteredGrouped = useMemo(() => grouped.filter((g) => (!filterDate || g.date === filterDate) && (!filterSession || g.sessionCode === filterSession)), [grouped, filterDate, filterSession]);
  const filterDates = useMemo(() => [...new Set([...grouped.map((g) => g.date), ...coverage.map((c: any) => c.examDate)])].sort(), [grouped, coverage]);
  const filterSessions = useMemo(() => {
    const sessions = new Map<string, { code: string; name: string; startTime: string }>();
    for (const record of [...grouped, ...coverage]) {
      const code = sessionCodeOf(record);
      if (!sessions.has(code)) sessions.set(code, { code, name: sessionNameOf(record), startTime: record.startTime || '' });
    }
    return [...sessions.values()].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name));
  }, [grouped, coverage]);

  const filteredCoverage = useMemo(() => coverage.filter((c: any) => (!filterDate || c.examDate === filterDate) && (!filterSession || sessionCodeOf(c) === filterSession)), [coverage, filterDate, filterSession]);
  const coverageBySlot = useMemo(() => {
    const map = new Map<string, { date: string; sessionCode: string; sessionName: string; startTime: string; endTime: string; rows: any[] }>();
    for (const c of filteredCoverage) {
      const sessionCode = sessionCodeOf(c);
      const key = `${c.examDate}|${sessionCode}`;
      if (!map.has(key)) map.set(key, { date: c.examDate, sessionCode, sessionName: sessionNameOf(c), startTime: c.startTime, endTime: c.endTime, rows: [] });
      map.get(key)!.rows.push(c);
    }
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
  }, [filteredCoverage]);
  const freeTeachersBySlot = useMemo(() => {
    const m = new Map<string, any[]>();
    const active = teachers.filter((t: any) => t.active !== false);
    for (const slot of coverageBySlot) {
      const key = `${slot.date}|${slot.sessionCode}`;
      const busy = new Set(assignments.filter((a: any) => toDateKey(a.examDate) === slot.date && sessionCodeOf(a) === slot.sessionCode).map((a: any) => a.teacherUserId));
      m.set(key, active.filter((t: any) => !busy.has(t.id)));
    }
    return m;
  }, [coverageBySlot, teachers, assignments]);

  const roomSummaries = useMemo(() => {
    const map = new Map<string, any>();
    const filteredCov = coverage.filter((c: any) => (!filterDate || c.examDate === filterDate) && (!filterSession || sessionCodeOf(c) === filterSession));
    for (const c of filteredCov) {
      if (!map.has(c.roomId)) map.set(c.roomId, { roomId: c.roomId, roomName: c.roomName, roomNumber: c.roomNumber || '', classAssigned: new Set<string>(), classWithExamSlots: new Set<string>(), invigilators: new Set<string>(), totalSlots: 0, coveredSlots: 0, missingDates: new Set<string>(), details: [] });
      const r = map.get(c.roomId);
      (c.classNames || []).forEach((n: string) => { r.classAssigned.add(n); r.classWithExamSlots.add(n); });
      r.totalSlots += 1;
      if (c.status === 'COVERED') r.coveredSlots += 1; else r.missingDates.add(`${c.examDate} ${sessionNameOf(c)}`);
      (c.invigilators || []).forEach((i: any) => r.invigilators.add(i.teacherName));
      r.details.push(c);
    }
    // also include rooms from selected.rooms that may have no coverage rows in filter
    for (const room of (selected?.rooms || [])) {
      if (!map.has(room.id)) map.set(room.id, { roomId: room.id, roomName: room.roomName, roomNumber: room.roomNumber || '', classAssigned: new Set<string>(), classWithExamSlots: new Set<string>(), invigilators: new Set<string>(), totalSlots: 0, coveredSlots: 0, missingDates: new Set<string>(), details: [] });
    }
    let rows = [...map.values()].map((r) => {
      const status = r.totalSlots === 0 ? 'NO_EXAM_SLOTS' : r.coveredSlots === r.totalSlots ? 'COVERED' : r.coveredSlots === 0 ? 'MISSING' : 'PARTIAL';
      return {
        ...r,
        classAssigned: [...r.classAssigned].sort(),
        classWithExamSlots: [...r.classWithExamSlots].sort(),
        invigilators: [...r.invigilators].sort(),
        missingDates: [...r.missingDates].sort(),
        status,
      };
    });
    if (filterRoom) rows = rows.filter((r) => r.roomName.toLowerCase().includes(filterRoom.toLowerCase()) || String(r.roomNumber || '').toLowerCase().includes(filterRoom.toLowerCase()));
    if (filterInvigilator) rows = rows.filter((r) => r.invigilators.some((n: string) => n.toLowerCase().includes(filterInvigilator.toLowerCase())));
    rows.sort((a,b)=>a.roomName.localeCompare(b.roomName));
    return rows;
  }, [coverage, selected, filterDate, filterSession, filterRoom, filterInvigilator]);

  async function openWizard() {
    if (!selectedListId && !selectedExamTypeId) { toast.error('Select an examination type or list first'); return; }
    setWizardOpen(true);
    setWizardStep(0);
    setMode('AUTO');
    setDefaultPerRoom(1);
    setPickedTeacherIds([]);
    setTeacherSearch('');
    setUnassigned([]);
    const counts: Record<string, number> = {};
    for (const r of selected?.rooms || []) counts[r.id] = 1;
    setManualCounts(counts);
  }

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    const base = teachers.filter((t) => t.active !== false);
    if (!q) return base;
    return base.filter((t) => `${t.name} ${t.email || ''} ${(t.roles || []).join(' ')}`.toLowerCase().includes(q));
  }, [teachers, teacherSearch]);

  const canNext = useMemo(() => {
    if (wizardStep === 0) return !!selectedListId || !!selectedExamTypeId;
    if (wizardStep === 1) return pickedTeacherIds.length > 0;
    if (wizardStep === 2) return defaultPerRoom >= 1;
    return pickedTeacherIds.length > 0 && (!!selectedListId || !!selectedExamTypeId);
  }, [wizardStep, selectedListId, selectedExamTypeId, pickedTeacherIds, defaultPerRoom]);

  async function submitGenerate() {
    if (!selectedListId && !selectedExamTypeId) return;
    setGenerating(true);
    try {
      const manual = mode === 'MANUAL' && selected?.rooms ? {
        rooms: (selected.rooms || []).map((r: any) => ({ roomId: r.id, defaultCount: Math.max(1, manualCounts[r.id] || defaultPerRoom) })),
      } : undefined;
      const res = await generateExaminationInvigilators({
        examinationListId: selectedListId || undefined,
        examinationTypeId: !selectedListId ? selectedExamTypeId || undefined : undefined,
        teacherIds: pickedTeacherIds,
        mode,
        rotationMode,
        defaultPerRoom,
        manual,
        replaceExisting: true,
      });
      setAssignments(res.assignments || []);
      setUnassigned(res.unassigned || []);
      setWizardOpen(false);
      toast.success(`Invigilator assignments generated (${res.created})${(res as any).generatedLists ? ` across ${(res as any).generatedLists} lists` : ''}`);
      await load(selectedListId, selectedExamTypeId);
    } catch {
      // toast handled by api
    } finally {
      setGenerating(false);
    }
  }

  async function handleClear() {
    const scopeLabel = selectedListId ? 'this examination list' : selectedExamTypeId ? 'all lists in this examination type' : '';
    if (!scopeLabel) return;
    if (!window.confirm(`Clear all invigilator assignments for ${scopeLabel}? This cannot be undone.`)) return;
    try {
      const res = await clearExaminationInvigilatorAssignments({ examinationListId: selectedListId || undefined, examinationTypeId: !selectedListId ? selectedExamTypeId || undefined : undefined });
      toast.success(`Cleared ${res.deleted} assignment(s)`);
      await load(selectedListId, selectedExamTypeId);
    } catch { /* handled */ }
  }

  async function saveReplacement() {
    if (!editAssignment || !editTeacherId) return;
    try {
      await updateExaminationInvigilatorAssignment(editAssignment.id, { teacherUserId: editTeacherId });
      toast.success('Invigilator updated');
      setEditOpen(false);
      setEditAssignment(null);
      setEditTeacherId('');
      await load(selectedListId);
    } catch {
      // handled
    }
  }

  async function openAddInvigilator(ctx: { examinationListId: string; roomId: string; roomName: string; examDate: string; session: 'MORNING' | 'AFTERNOON'; sessionCode: string; sessionName: string }) {
    setAddInvigCtx(ctx);
    setAddInvigTeacherId('');
    setAddInvigOpen(true);
    setAddInvigLoading(true);
    try {
      const rows = await getAvailableInvigilatorTeachers({ examinationListId: ctx.examinationListId, examDate: ctx.examDate, session: ctx.session, sessionCode: ctx.sessionCode });
      setAvailableInvigilators(rows);
    } catch {
      setAvailableInvigilators([]);
    } finally {
      setAddInvigLoading(false);
    }
  }

  async function submitAddInvigilator() {
    if (!addInvigCtx || !addInvigTeacherId) return;
    setAddInvigLoading(true);
    try {
      await addExaminationInvigilatorAssignment({ ...addInvigCtx, teacherUserId: addInvigTeacherId });
      toast.success('Invigilator added');
      setAddInvigOpen(false);
      setAddInvigCtx(null);
      setAddInvigTeacherId('');
      await load(selectedListId, selectedExamTypeId);
    } catch {
      // handled
    } finally {
      setAddInvigLoading(false);
    }
  }

  function exportAssignments() {
    if (!selected) return;
    const rows: string[][] = [['Date', 'Session', 'Room', 'Invigilator', 'Email', 'Type', 'Status']];
    for (const a of assignments) {
      rows.push([toDateKey(a.examDate), sessionNameOf(a), a.roomName, a.teacherName, a.teacherEmail || '', a.assignmentType, a.status]);
    }
    downloadCsv(`invigilators-${selected.list.listCode || selected.list.id}.csv`, rows);
  }

  function printAssignments() {
    if (!selected) return;
    const blocks = grouped.map((g) => {
      const byRoom = new Map<string, ExaminationInvigilatorAssignment[]>();
      for (const a of g.items) {
        const k = a.roomName;
        if (!byRoom.has(k)) byRoom.set(k, []);
        byRoom.get(k)!.push(a);
      }
      const rows = [...byRoom.entries()].map(([room, items]) => `<tr><td>${room}</td><td>${items.map((i) => i.teacherName).join(', ') || '—'}</td><td>${items[0]?.status || ''}</td></tr>`).join('');
      return `<div class="block"><h2>${fmtDate(g.date)} · ${g.sessionName}</h2><table><thead><tr><th>Room</th><th>Invigilator(s)</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No assignments</td></tr>'}</tbody></table></div>`;
    }).join('');
    printHtml('Invigilator Assignments', `<h1>Invigilator Assignments</h1><div class="meta"><b>${selected.list.examinationName || 'Examination'}</b> · Exam: ${selected.list.examinationCode || '—'} · List: ${selected.list.listCode || '—'} · ${selected.list.academicYear} ${selected.list.term}</div>${blocks || '<p>No assignments generated.</p>'}`);
  }

  async function downloadInvigilatorPdf() {
    if (!selected) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 36;
    const navy: [number,number,number] = [0,4,53];
    const amber: [number,number,number] = [252,176,56];
    doc.setFillColor(...navy); doc.rect(0,0,pageWidth,64,'F'); doc.setFillColor(...amber); doc.rect(0,64,pageWidth,3,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(14);
    doc.text('Examination Invigilator Room Overview', margin, 28);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(226,232,240);
    doc.text(`${selected.list.examinationName || 'Examination'} • ${selected.list.examinationCode || ''} / ${selected.list.listCode || ''} • ${selected.list.academicYear} ${selected.list.term}`, margin, 46);
    const rows = roomSummaries.map((r: any) => [r.roomName + (r.roomNumber ? ` (${r.roomNumber})` : ''), (r.classAssigned||[]).join(', ') || '—', (r.classWithExamSlots||[]).join(', ') || '—', String(r.invigilators?.length||0), r.status === 'COVERED' ? 'Covered (all dates)' : r.status === 'PARTIAL' ? 'Missing some dates' : r.status === 'MISSING' ? 'Missing invigilators' : 'No exam slots']);
    autoTable(doc, { startY: 84, head: [['Room','Class assigned','Class with exam slots','Invigilators','Coverage status']], body: rows.length ? rows : [['—','—','—','0','No data']], styles: { fontSize: 8.5, cellPadding: 5 }, headStyles: { fillColor: navy, textColor: [255,255,255] }, alternateRowStyles: { fillColor: [248,250,252] }, margin: { left: margin, right: margin } });
    const py = doc.internal.pageSize.getHeight() - 24;
    doc.setFontSize(8); doc.setTextColor(100,116,139); doc.text('Generated by Shule+', margin, py);
    doc.save(`invigilator-overview-${selected.list.listCode || selected.list.id}.pdf`);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid #e2e8f0', borderRadius: 3, background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ lg: 'flex-end' }}>
            <Box>
              <Typography sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' }, fontWeight: 800, color: NAVY, letterSpacing: '-0.02em' }}>Examination Invigilators</Typography>
              <Typography sx={{ fontSize: '0.9rem', color: '#64748b', mt: 0.5, maxWidth: 720 }}>
                Generate and manage invigilators by exam type, timetable slot, room and session. Assignments follow actual timetable dates/times.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', lg: 'auto' } }}>
              <Button variant="contained" startIcon={<AutorenewOutlinedIcon />} disabled={!selectedExamTypeId && !selectedListId} onClick={openWizard}
                sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5, py: 1, fontWeight: 700, boxShadow: '0 6px 18px rgba(0,4,53,0.18)', '&:hover': { bgcolor: '#0b1a4a' } }}>
                {assignments.length > 0 ? 'Regenerate Invigilators' : 'Generate Invigilators'}
              </Button>
              <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} disabled={!selected} onClick={() => void downloadInvigilatorPdf()} sx={{ textTransform: 'none', borderRadius: 2, px: 2.5, py: 1, fontWeight: 600, bgcolor: '#fff' }}>
                Download PDF
              </Button>
              <Button variant="outlined" color="error" disabled={!selectedExamTypeId && !selectedListId} onClick={() => void handleClear()}
                sx={{ textTransform: 'none', borderRadius: 2, px: 2.5, py: 1, fontWeight: 600, borderColor: '#fecaca', color: '#dc2626', bgcolor: '#fff', '&:hover': { borderColor: '#f87171', bgcolor: '#fef2f2' } }}>
                Clear Assignments
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Examination Type</InputLabel>
              <Select label="Examination Type" value={selectedExamTypeId} onChange={(e) => { setSelectedExamTypeId(e.target.value); setSelectedListId(''); }} sx={{ bgcolor: '#fff', borderRadius: 2 }}>
                <MenuItem value="">All types</MenuItem>
                {examTypes.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({t.academicYear} {t.term})</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Examination List</InputLabel>
              <Select label="Examination List" value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)} sx={{ bgcolor: '#fff', borderRadius: 2 }}>
                <MenuItem value="">Select examination list</MenuItem>
                {lists.map((l) => (
                  <MenuItem key={l.id} value={l.id}>{(l.examinationCode || 'EX')} / {(l.listCode || 'EL')} · {l.examinationName || l.academicYear} · {l.academicYear} {l.term}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Paper>

      {loading ? <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : null}

      {!selectedListId && !selectedExamTypeId ? <Alert severity="info">Select an Examination Type to view all class timetables, or select a specific examination list to view room assignments and coverage.</Alert> : null}

      {selectedExamTypeId && typeTimetables.length > 0 ? (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, px: 2.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Class Examination Timetables</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>All classes under the selected examination type. Invigilators are generated only where a class has an exam slot on the timetable.</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Class', 'Exam Code', 'Start Date', 'End Date', 'Exam Slots', 'Sessions'].map((h) => <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {typeTimetables.map((tt: any) => {
                  const slots = tt.slots || [];
                  const dates = [...new Set(slots.map((s: any) => s.examDate))].sort();
                  return (
                    <TableRow key={tt.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: NAVY }}>{tt.className}</TableCell>
                      <TableCell><Chip size="small" label={tt.examinationCode || '—'} /></TableCell>
                      <TableCell>{tt.startDate}</TableCell>
                      <TableCell>{tt.endDate}</TableCell>
                      <TableCell>{slots.length} slot(s) / {dates.length} day(s)</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {slots.slice(0, 6).map((sl: any, i: number) => (
                            <Chip key={i} size="small" variant="outlined" label={`${sl.examDate} ${sl.sessionName || (sl.session === 'MORNING' ? 'Morning' : 'Afternoon')} ${sl.startTime || ''}-${sl.endTime || ''}`} sx={{ fontSize: '0.68rem' }} />
                          ))}
                          {slots.length > 6 ? <Chip size="small" label={`+${slots.length - 6} more`} /> : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      {selected && stats ? (
        <>
          <Stack direction={{ xs: 'column', md: 'row' } as any} spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <StatCard label="Exam Days" value={stats.totalExaminationDays} icon={<EventNoteOutlinedIcon />} tone="#2563eb" />
            <StatCard label="Exam Rooms" value={stats.totalExaminationRooms} icon={<MeetingRoomOutlinedIcon />} tone="#0891b2" />
            <StatCard label="Available Teachers" value={stats.availableTeachers} icon={<PersonSearchOutlinedIcon />} tone="#059669" />
            <StatCard label="Assigned Invigilators" value={stats.assignedInvigilators} icon={<GroupsOutlinedIcon />} tone="#7c3aed" />
            <StatCard label="Unassigned Room-Sessions" value={stats.unassignedRooms} icon={<WarningAmberOutlinedIcon />} tone="#d97706" />
          </Stack>

          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, px: 2.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ lg: 'center' }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: NAVY }}>Room Invigilation Overview</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Rooms, assigned classes, exam slots, invigilator coverage status across exam dates.</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Date</InputLabel>
                    <Select label="Date" value={filterDate} onChange={(e)=>setFilterDate(e.target.value)}><MenuItem value="">All dates</MenuItem>{filterDates.map((d)=><MenuItem key={d} value={d}>{d}</MenuItem>)}</Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Session</InputLabel>
                    <Select label="Session" value={filterSession} onChange={(e)=>setFilterSession(e.target.value)}><MenuItem value="">All</MenuItem>{filterSessions.map((session) => <MenuItem key={session.code} value={session.code}>{session.name}{session.startTime ? ` · ${session.startTime}` : ''}</MenuItem>)}</Select>
                  </FormControl>
                  <TextField size="small" label="Room" value={filterRoom} onChange={(e)=>setFilterRoom(e.target.value)} sx={{ minWidth: 140 }} />
                  <TextField size="small" label="Invigilator name" value={filterInvigilator} onChange={(e)=>setFilterInvigilator(e.target.value)} sx={{ minWidth: 170 }} />
                </Stack>
              </Stack>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Rooms','Class assigned','Class with exam slots','Invigilators assigned','Coverage status','Actions'].map((h)=>(
                      <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', bgcolor: '#fff' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roomSummaries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>No room data for selected filters.</TableCell></TableRow>
                  ) : roomSummaries.map((r: any) => {
                    const statusLabel = r.status === 'COVERED' ? 'Covered (all dates)' : r.status === 'PARTIAL' ? 'Missing some dates' : r.status === 'MISSING' ? 'Missing invigilators' : 'No exam slots';
                    const statusColor = r.status === 'COVERED' ? 'success' : r.status === 'PARTIAL' ? 'warning' : r.status === 'MISSING' ? 'error' : 'default';
                    return (
                      <TableRow key={r.roomId} hover>
                        <TableCell sx={{ fontWeight: 700, color: NAVY }}>{r.roomName}{r.roomNumber ? ` (${r.roomNumber})` : ''}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: '0.8rem' }}>{r.classAssigned.length ? r.classAssigned.join(', ') : '—'}</Typography></TableCell>
                        <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: '0.8rem' }}>{r.classWithExamSlots.length ? r.classWithExamSlots.join(', ') : '—'}</Typography></TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{r.invigilators.length}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{r.invigilators.slice(0,2).join(', ')}{r.invigilators.length > 2 ? ` +${r.invigilators.length-2}` : ''}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={statusColor as any} label={statusLabel} />
                          {r.missingDates.length ? <Typography sx={{ fontSize: '0.7rem', color: '#b45309', mt: 0.5 }}>Missing: {r.missingDates.slice(0,2).join(', ')}{r.missingDates.length>2?` +${r.missingDates.length-2}`:''}</Typography> : null}
                        </TableCell>
                        <TableCell><Button size="small" variant="outlined" onClick={() => setRoomView(r)} sx={{ textTransform: 'none', borderRadius: 1.5 }}>View</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : null}

      <Dialog open={!!roomView} onClose={() => setRoomView(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>Room Invigilation Details</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>{roomView?.roomName}{roomView?.roomNumber ? ` (${roomView.roomNumber})` : ''} · All exam days, classes and invigilators</Typography>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#f8fafc', px: 3, py: 3 }}>
          {roomView ? (
            <Stack spacing={2}>
              <Alert severity={roomView.status === 'COVERED' ? 'success' : roomView.status === 'PARTIAL' ? 'warning' : roomView.status === 'MISSING' ? 'error' : 'info'}>
                Status: {roomView.status === 'COVERED' ? 'Covered for all exam dates' : roomView.status === 'PARTIAL' ? 'Some exam dates missing invigilators' : roomView.status === 'MISSING' ? 'Missing invigilators' : 'No exam slots in selected filter'}
              </Alert>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead><TableRow>{['Date','Session','Time','Classes with Exam','Invigilator(s)','Status'].map(h=><TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {(roomView.details || []).sort((a:any,b:any)=>a.examDate.localeCompare(b.examDate)||String(a.startTime || '').localeCompare(String(b.startTime || ''))).map((d:any, i:number) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{fmtDate(d.examDate)}</TableCell>
                        <TableCell>{sessionNameOf(d)}</TableCell>
                        <TableCell>{d.startTime} - {d.endTime}</TableCell>
                        <TableCell>{(d.classNames||[]).join(', ') || '—'}</TableCell>
                        <TableCell>{(d.invigilators||[]).map((x:any)=>x.teacherName).join(', ') || <Typography component="span" sx={{ color: '#dc2626', fontSize: '0.8rem' }}>Missing</Typography>}</TableCell>
                        <TableCell><Chip size="small" color={d.status === 'COVERED' ? 'success' : 'error'} label={d.status === 'COVERED' ? 'Covered' : 'Missing'} /></TableCell>
                      </TableRow>
                    ))}
                    {!(roomView.details||[]).length ? <TableRow><TableCell colSpan={6} sx={{ py: 3, textAlign: 'center', color: '#64748b' }}>No exam slots for this room in selected filters.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Button onClick={() => setRoomView(null)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={wizardOpen} onClose={() => !generating && setWizardOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.15rem' }}>Generate Invigilator Assignments</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>Select examination, teachers, and assignment mode to generate balanced invigilation.</Typography>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#f8fafc', px: 3, py: 3 }}>
          <Stepper activeStep={wizardStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
            {steps.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>

          {wizardStep === 0 && (
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Selected Examination Scope</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedExamTypeId && !selectedListId ? (
                  <>
                    <b>Examination Type:</b> {examTypes.find((t) => t.id === selectedExamTypeId)?.name || 'Selected type'}<br />
                    <b>Academic Year / Term:</b> {(() => { const t = examTypes.find((x) => x.id === selectedExamTypeId); return t ? `${t.academicYear} ${t.term}` : '—'; })()}<br />
                    <b>Exam timetables in type:</b> {typeTimetables.length} · <b>Exam lists:</b> {lists.length}<br />
                    Generation creates invigilators only for room sessions where classes have exams on the timetable. Regenerating replaces existing assignments in scope.
                  </>
                ) : selected ? (
                  <>
                    <b>{selected.list.examinationName || 'Examination'}</b><br />
                    Examination Code: {selected.list.examinationCode || '—'} · Examination List Code: {selected.list.listCode || '—'}<br />
                    {selected.list.academicYear} {selected.list.term} · {selected.list.startDate ? String(selected.list.startDate).slice(0,10) : ''} to {selected.list.endDate ? String(selected.list.endDate).slice(0,10) : ''}<br />
                    Sessions: {selected.sessions.length} · Rooms: {selected.rooms.length}
                  </>
                ) : 'Select an examination type or list on the page, then open Generate Invigilators.'}
              </Alert>
              {selectedExamTypeId && !selectedListId ? (
                <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                  {typeTimetables.length ? <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mb: 0.5 }}>Class Timetables</Typography> : null}
                  {typeTimetables.map((tt: any) => (
                    <Box key={tt.id} sx={{ py: 0.6, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: NAVY }}>{tt.className} · {tt.examinationCode || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{tt.startDate} to {tt.endDate} · {(tt.slots||[]).length} slot(s)</Typography>
                    </Box>
                  ))}
                  {lists.length ? <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mt: 1, mb: 0.5 }}>Examination Lists</Typography> : null}
                  {lists.map((l) => (
                    <Box key={l.id} sx={{ py: 0.6, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: NAVY }}>{l.examinationCode || 'EX'} / {l.listCode || 'EL'} · {l.examinationName || l.academicYear}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{l.roomCount} rooms · {l.studentCount} students · {l.academicYear} {l.term}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : selected ? (
                <Typography sx={{ fontSize: '0.85rem', color: '#334155' }}>Planned rooms: {selected.rooms.map((r: any) => r.roomName).join(', ') || '—'}</Typography>
              ) : null}
            </Paper>
          )}

          {wizardStep === 1 && (
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' } as any} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: NAVY }}>Select Teachers / Invigilators</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Source: existing IAM/organization user records.</Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap>
                  <Button size="small" variant="outlined" onClick={() => setPickedTeacherIds(filteredTeachers.map((t) => t.id))} sx={{ textTransform: 'none' }}>Select all</Button>
                  <Button size="small" variant="outlined" onClick={() => setPickedTeacherIds([])} sx={{ textTransform: 'none' }}>Deselect</Button>
                </Stack>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' } as any} spacing={1.5} sx={{ mb: 1.5 }}>
                <TextField size="small" placeholder="Search teachers" value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} fullWidth />
                <Chip label={`${pickedTeacherIds.length} selected`} />
              </Stack>
              <Box sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fff' }}>
                {filteredTeachers.map((t) => {
                  const checked = pickedTeacherIds.includes(t.id);
                  return (
                    <Box key={t.id} sx={{ px: 1.5, py: 1, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox checked={checked} onChange={(e) => setPickedTeacherIds((prev) => e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id))} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: NAVY }}>{t.name}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{t.email || '—'}{t.isTeacher ? ' · Teacher' : ''}</Typography>
                      </Box>
                    </Box>
                  );
                })}
                {!filteredTeachers.length ? <Box sx={{ p: 3, color: '#64748b', textAlign: 'center' }}>No teachers/users found.</Box> : null}
              </Box>
            </Paper>
          )}

          {wizardStep === 2 && (selected || selectedExamTypeId) && (
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Configure Invigilator Assignment</Typography>
              {selectedExamTypeId && !selectedListId ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <b>Exam Type scope:</b> {examTypes.find((t) => t.id === selectedExamTypeId)?.name || 'Selected type'} · {lists.length} exam list(s)/timetable(s) will be generated.
                  <Box sx={{ mt: 1, maxHeight: 180, overflow: 'auto' }}>
                    {typeTimetables.length ? <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mb: 0.25 }}>Class Timetables ({typeTimetables.length})</Typography> : null}
                    {typeTimetables.map((tt: any) => <Typography key={tt.id} sx={{ fontSize: '0.76rem', color: '#334155' }}>• {tt.className} — {tt.startDate} to {tt.endDate} ({(tt.slots||[]).length} slots)</Typography>)}
                    {lists.length ? <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mt: 0.75, mb: 0.25 }}>Exam Lists ({lists.length})</Typography> : null}
                    {lists.map((l) => <Typography key={l.id} sx={{ fontSize: '0.76rem', color: '#334155' }}>• {l.examinationCode || 'EX'} / {l.listCode || 'EL'} — {l.examinationName || l.academicYear} ({l.roomCount} rooms)</Typography>)}
                  </Box>
                </Alert>
              ) : null}
              <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as 'AUTO' | 'MANUAL')}>
                <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                  <FormControlLabel value="AUTO" control={<Radio />} label={<Box><Typography sx={{ fontWeight: 700 }}>Automatic assignment</Typography><Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Distribute selected teachers across all rooms and sessions, balancing load and avoiding same-session conflicts.</Typography></Box>} />
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <FormControlLabel value="MANUAL" control={<Radio />} label={<Box><Typography sx={{ fontWeight: 700 }}>Manual configuration</Typography><Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{selected ? 'Set invigilators required per room (default applied; override per room below).' : 'Manual per-room counts are available when a single exam list is selected. For type-wide generation, use Automatic with default per room.'}</Typography></Box>} />
                </Paper>
              </RadioGroup>
              <Stack direction={{ xs: 'column', sm: 'row' } as any} spacing={1.5} sx={{ mt: 2, mb: 2 }}>
                <TextField size="small" type="number" label="Default invigilators per room" value={defaultPerRoom} onChange={(e) => setDefaultPerRoom(Math.max(1, Number(e.target.value) || 1))} sx={{ width: 260 }} />
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Invigilator rotation</InputLabel>
                  <Select label="Invigilator rotation" value={rotationMode} onChange={(e) => setRotationMode(e.target.value as any)}>
                    <MenuItem value="PER_SESSION">Change every session</MenuItem>
                    <MenuItem value="DAILY">Change every day</MenuItem>
                    <MenuItem value="NONE">Do not change (same invigilator)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              {mode === 'MANUAL' && selected ? (
                <TableContainer sx={{ maxHeight: 280 }}>
                  <Table size="small" stickyHeader>
                    <TableHead><TableRow><TableCell sx={{ fontWeight: 800 }}>Room</TableCell><TableCell sx={{ fontWeight: 800 }}>Invigilators required</TableCell></TableRow></TableHead>
                    <TableBody>
                      {(selected.rooms || []).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.roomName}{r.roomNumber ? ` (${r.roomNumber})` : ''}</TableCell>
                          <TableCell><TextField size="small" type="number" value={manualCounts[r.id] ?? defaultPerRoom} onChange={(e) => setManualCounts((prev) => ({ ...prev, [r.id]: Math.max(1, Number(e.target.value) || 1) }))} sx={{ width: 120 }} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : mode === 'MANUAL' && !selected ? (
                <Alert severity="warning">Manual per-room counts require selecting a specific examination list. Switch to Automatic for type-wide generation, or pick a list on the main page.</Alert>
              ) : null}
            </Paper>
          )}

          {wizardStep === 3 && (selected || selectedExamTypeId) && (
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Review & Generate</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Examination</Typography>
                  {selected ? (
                    <>
                      <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{selected.list.examinationCode || '—'} / {selected.list.listCode || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: '#334155' }}>{selected.list.examinationName || ''}</Typography>
                    </>
                  ) : (
                    <>
                      <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{examTypes.find((t) => t.id === selectedExamTypeId)?.name || 'Exam Type'}</Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: '#334155' }}>{lists.length} list(s)/timetable(s) in scope</Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Assignment scope</Typography>
                  <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{selected ? `${selected.sessions.length} sessions · ${selected.rooms.length} rooms` : `${lists.length} lists`} · {pickedTeacherIds.length} teachers</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: '#334155' }}>Mode: {mode} · Default per room: {defaultPerRoom} · Rotation: {rotationMode}</Typography>
                </Box>
              </Box>
              {selectedExamTypeId && !selectedListId ? (
                <Alert severity="info" sx={{ mt: 1.5 }}>All exam lists under this type will be generated. Invigilators are assigned only where timetable slots exist for allocated classes.</Alert>
              ) : null}
              {unassigned.length ? <Alert severity="warning" sx={{ mt: 1.5 }}>Some rooms were not fully assigned in previous generation: {unassigned.map((u) => `${u.roomName} ${u.date} ${u.session}`).join(', ')}</Alert> : null}
              <Alert severity="info" sx={{ mt: 1.5 }}>Generation avoids assigning the same teacher to overlapping/same sessions and report any unassigned room sessions.</Alert>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Button onClick={() => setWizardOpen(false)} disabled={generating} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Stack direction="row" spacing={1}>
            <Button disabled={wizardStep === 0 || generating} onClick={() => setWizardStep((s) => s - 1)} sx={{ textTransform: 'none', color: '#475569' }}>Back</Button>
            {wizardStep < steps.length - 1 ? (
              <Button variant="contained" disabled={!canNext} onClick={() => setWizardStep((s) => s + 1)} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>Continue</Button>
            ) : (
              <Button variant="contained" disabled={!canNext || generating} onClick={submitGenerate} startIcon={generating ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>
                {generating ? 'Generating...' : 'Generate Assignments'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>Replace Invigilator</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>Assign a different teacher to this invigilation slot.</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3, bgcolor: '#f8fafc' }}>
          {editAssignment ? (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Alert severity="info">{editAssignment.roomName} · {toDateKey(editAssignment.examDate)} · {sessionNameOf(editAssignment)}<br />Current: <b>{editAssignment.teacherName}</b></Alert>
              <FormControl fullWidth size="small">
                <InputLabel>Teacher</InputLabel>
                <Select label="Teacher" value={editTeacherId} onChange={(e) => setEditTeacherId(e.target.value)}>
                  {teachers.filter((t) => t.active !== false).map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}{t.email ? ` (${t.email})` : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Button variant="contained" disabled={!editTeacherId} onClick={saveReplacement} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addInvigOpen} onClose={() => !addInvigLoading && setAddInvigOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>Add Invigilator</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>Add another invigilator to this room/session. Only teachers not occupied in this session are listed.</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3, bgcolor: '#f8fafc' }}>
          {addInvigCtx ? (
            <Stack spacing={2}>
              <Alert severity="info">{addInvigCtx.roomName} · {addInvigCtx.examDate} · {addInvigCtx.sessionName}</Alert>
              <FormControl fullWidth size="small">
                <InputLabel>Available teacher</InputLabel>
                <Select label="Available teacher" value={addInvigTeacherId} onChange={(e) => setAddInvigTeacherId(e.target.value)} disabled={addInvigLoading}>
                  <MenuItem value="">Select teacher...</MenuItem>
                  {availableInvigilators.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}{t.email ? ` (${t.email})` : ''}</MenuItem>)}
                </Select>
              </FormControl>
              {!addInvigLoading && availableInvigilators.length === 0 ? <Alert severity="warning">No available teachers for this session (all are occupied or inactive).</Alert> : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', gap: 1 }}>
          <Button onClick={() => setAddInvigOpen(false)} disabled={addInvigLoading} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Button variant="contained" disabled={!addInvigTeacherId || addInvigLoading} onClick={() => void submitAddInvigilator()} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>{addInvigLoading ? 'Saving...' : 'Add Invigilator'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

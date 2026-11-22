// @ts-nocheck - MUI9 Stack/TextField overload typing; runtime-correct
import { useEffect, useMemo, useState } from 'react';
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
  InputAdornment,
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
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import { toast } from '@/lib/toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { AxiosError } from 'axios';
import {
  getExaminationListsDashboard,
  getExaminationListsContext,
  getExaminationList,
  generateExaminationList,
  deleteExaminationList,
  moveExaminationListStudent,
  addExaminationListStudent,
  removeExaminationListAllocation,
  getExaminationListAvailableStudents,
  publishExaminationList,
  unpublishExaminationList,
  listExaminationTypes,
  type ExaminationList,
  type ExaminationListRoom,
  type ExaminationAllocation,
  type ExaminationDistributionMethod,
} from '@/services/api';

const NAVY = '#000435';
const steps = ['Room Configuration', 'Select Participating Classes', 'Student Distribution', 'Review & Generate'];

type WizardRoom = {
  key: string;
  selected: boolean;
  sourceRoomId?: string | null;
  roomName: string;
  roomNumber?: string | null;
  capacity: number;
  isUniqueCapacity: boolean;
  manual?: boolean;
};

function StatCard({ label, value, icon, tone }: { label: string; value: number | string; icon: React.ReactNode; tone: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#fff', minWidth: 180, flex: 1 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${tone}18`, color: tone, display: 'grid', placeItems: 'center' }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printHtml(title: string, bodyHtml: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
    h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:20px 0 8px}
    .meta{color:#475569;margin-bottom:16px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left}
    th{background:#f1f5f9}
    .room{page-break-inside:avoid;margin-bottom:24px}
    @media print{body{padding:0}}
  </style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export default function ExaminationListsPage() {
  const { settings, ready, academicYear: orgYear, term: orgTerm } = useOrgAcademicPeriod();
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getExaminationListsDashboard>> | null>(null);
  const [detail, setDetail] = useState<ExaminationList | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roomSearch, setRoomSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardRooms, setWizardRooms] = useState<WizardRoom[]>([]);
  const [wizardClasses, setWizardClasses] = useState<Array<{ id: string; label: string; studentCount: number; selected: boolean }>>([]);
  const [wizardTimetables, setWizardTimetables] = useState<Array<{ id: string; examinationCode?: string | null; examinationTypeId?: string | null; examinationTypeName?: string | null; name: string; classId: string; className: string; academicYear: string; term: string; startDate?: string | null; endDate?: string | null }>>([]);
  const [wizardExamTypes, setWizardExamTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedExamTimetableId, setSelectedExamTimetableId] = useState('');
  const [wizardExamTypeId, setWizardExamTypeId] = useState('');
  const [defaultCapacity, setDefaultCapacity] = useState(40);
  const [distribution, setDistribution] = useState<ExaminationDistributionMethod>('KEEP_CLASS');
  const [mixMode, setMixMode] = useState<'AUTO' | 'CUSTOM'>('AUTO');
  const [mixQuantity, setMixQuantity] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [regenConfirm, setRegenConfirm] = useState(false);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveAlloc, setMoveAlloc] = useState<ExaminationAllocation | null>(null);
  const [moveTargetRoom, setMoveTargetRoom] = useState('');

  const [viewRoom, setViewRoom] = useState<ExaminationListRoom | null>(null);
  const [filterExamTypeId, setFilterExamTypeId] = useState('');
  const [examTypes, setExamTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [roomEditMode, setRoomEditMode] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; studentCode?: string | null; fullName: string; className: string }>>([]);
  const [addStudentId, setAddStudentId] = useState<string | null>(null);
  const [roomSaving, setRoomSaving] = useState(false);

  useEffect(() => {
    if (!ready || initialized) return;
    setAcademicYear(orgYear || settings?.currentAcademicYear || settings?.academicYears?.[0] || '');
    setTerm(orgTerm || settings?.currentTerm || settings?.terms?.[0] || '');
    setInitialized(true);
  }, [ready, initialized, orgYear, orgTerm, settings]);

  async function loadDashboard(selectListId?: string | null, typeId = filterExamTypeId) {
    if (!academicYear || !term) return;
    setLoading(true);
    try {
      const data = await getExaminationListsDashboard({ academicYear, term, examinationTypeId: typeId || undefined });
      setDashboard(data);
      const targetId = selectListId ?? data.latestList?.id ?? data.lists[0]?.id ?? null;
      if (targetId) {
        setDetailLoading(true);
        try {
          const d = await getExaminationList(targetId);
          setDetail(d);
        } finally {
          setDetailLoading(false);
        }
      } else {
        setDetail(null);
      }
    } catch {
      setDashboard(null);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  async function viewListDetail(id: string) {
    setDetailLoading(true);
    try {
      const d = await getExaminationList(id);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!academicYear || !term) { setExamTypes([]); return; }
    let cancelled = false;
    listExaminationTypes({ academicYear, term }).then((rows) => { if (!cancelled) setExamTypes((rows || []).map((t: any) => ({ id: t.id, name: t.name }))); }).catch(() => { if (!cancelled) setExamTypes([]); });
    return () => { cancelled = true; };
  }, [academicYear, term]);

  useEffect(() => {
    if (!initialized || !academicYear || !term) return;
    loadDashboard(null, filterExamTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, academicYear, term, filterExamTypeId]);

  useEffect(() => {
    if (!viewRoom || !detail) return;
    const fresh = (detail.rooms || []).find((r) => r.id === viewRoom.id);
    if (fresh) setViewRoom(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  async function loadWizardContext(examId?: string, typeId?: string) {
    const ctx = await getExaminationListsContext({ academicYear, term, examinationTimetableId: examId || undefined, examinationTypeId: typeId || undefined });
    const rooms: WizardRoom[] = (ctx.rooms || []).map((r, i) => ({
      key: r.sourceRoomId || `r-${i}`,
      selected: true,
      sourceRoomId: r.sourceRoomId,
      roomName: r.roomName,
      roomNumber: r.roomNumber ?? '',
      capacity: r.capacity || 40,
      isUniqueCapacity: false,
    }));
    const selectedExam = ctx.selectedExamination;
    const classes = (ctx.classes || []).map((c) => ({
      id: c.id,
      label: c.label,
      studentCount: c.studentCount || 0,
      selected: selectedExam ? c.id === selectedExam.classId : false,
    }));
    setWizardExamTypes((ctx.examinationTypes || []).map((t: any) => ({ id: t.id, name: t.name })));
    setWizardTimetables((ctx.examinationTimetables || []).map((t: any) => ({
      id: t.id,
      examinationCode: t.examinationCode,
      examinationTypeId: t.examinationTypeId ?? null,
      examinationTypeName: t.examinationTypeName ?? null,
      name: t.name,
      classId: t.classId,
      className: t.className,
      academicYear: t.academicYear,
      term: t.term,
      startDate: t.startDate ?? null,
      endDate: t.endDate ?? null,
    })));
    setWizardRooms(rooms);
    setWizardClasses(classes);
    if (selectedExam) {
      setAcademicYear(selectedExam.academicYear);
      setTerm(selectedExam.term);
    }
  }

  async function openWizard() {
    setWizardLoading(true);
    setWizardOpen(true);
    setWizardStep(0);
    setSelectedExamTimetableId('');
    setWizardExamTypeId('');
    try {
      await loadWizardContext('', '');
      setDefaultCapacity(40);
      setDistribution('KEEP_CLASS');
      setMixMode('AUTO');
      setMixQuantity(5);
    } catch {
      setWizardOpen(false);
    } finally {
      setWizardLoading(false);
    }
  }

  async function onSelectExamTimetable(id: string) {
    setSelectedExamTimetableId(id);
    setWizardLoading(true);
    try {
      await loadWizardContext(id, wizardExamTypeId);
    } finally {
      setWizardLoading(false);
    }
  }

  async function onSelectWizardExamType(typeId: string) {
    setWizardExamTypeId(typeId);
    setSelectedExamTimetableId('');
    setWizardLoading(true);
    try {
      await loadWizardContext('', typeId);
    } finally {
      setWizardLoading(false);
    }
  }

  function closeWizard() {
    if (generating) return;
    setWizardOpen(false);
  }

  const selectedRooms = wizardRooms.filter((r) => r.selected);
  const totalCapacity = selectedRooms.reduce((n, r) => n + (Number(r.capacity) || 0), 0);
  const selectedClasses = wizardClasses.filter((c) => c.selected);
  const totalParticipants = selectedClasses.reduce((n, c) => n + (c.studentCount || 0), 0);

  const canNext = useMemo(() => {
    if (wizardStep === 0) return selectedRooms.length > 0 && selectedRooms.every((r) => r.roomName.trim() && r.capacity > 0);
    if (wizardStep === 1) return selectedClasses.length > 0;
    if (wizardStep === 2) return distribution === 'KEEP_CLASS' || mixMode === 'AUTO' || mixQuantity > 0;
    if (wizardStep === 3) return totalCapacity >= totalParticipants && totalParticipants > 0 && selectedRooms.length > 0;
    return true;
  }, [wizardStep, selectedRooms, selectedClasses, distribution, mixMode, mixQuantity, totalCapacity, totalParticipants]);

  async function submitGenerate() {
    setGenerating(true);
    try {
      const selectedExam = wizardTimetables.find((t) => t.id === selectedExamTimetableId);
      const list = await generateExaminationList({
        examinationTimetableId: selectedExamTimetableId || undefined,
        examinationTypeId: wizardExamTypeId || undefined,
        academicYear: selectedExam?.academicYear || academicYear,
        term: selectedExam?.term || term,
        name: `Examination List ${selectedExam?.academicYear || academicYear} ${selectedExam?.term || term}`,
        defaultCapacity,
        rooms: wizardRooms.map((r) => ({
          sourceRoomId: r.sourceRoomId ?? null,
          roomName: r.roomName.trim(),
          roomNumber: r.roomNumber || null,
          capacity: Number(r.capacity) || defaultCapacity,
          isUniqueCapacity: r.isUniqueCapacity,
          selected: r.selected,
        })),
        participatingClassIds: selectedClasses.map((c) => c.id),
        distributionMethod: distribution,
        mixQuantity: distribution === 'MIX_CLASSES' && mixMode === 'CUSTOM' ? mixQuantity : null,
      });
      toast.success('Examination list generated successfully');
      setWizardOpen(false);
      await loadDashboard(list.id);
    } catch {
      // handled
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublishList(id: string) {
    try {
      await publishExaminationList(id);
      toast.success('Examination list published');
      await loadDashboard(id);
    } catch {
      // handled
    }
  }

  async function handleUnpublishList(id: string) {
    if (!window.confirm('Unpublish this examination list? It will become editable again but will no longer be treated as final/published.')) return;
    try {
      await unpublishExaminationList(id);
      toast.success('Examination list unpublished');
      await loadDashboard(id);
    } catch {
      // handled
    }
  }

  async function handleDeleteList(id: string, confirmImpact = false) {
    if (!confirmImpact && !window.confirm('Delete this examination list and all its allocations? This action cannot be undone.')) return;
    try {
      await deleteExaminationList(id, { confirmImpact });
      toast.success('Examination list deleted');
      if (detail?.id === id) setDetail(null);
      await loadDashboard(null);
    } catch (err) {
      const ax = err as AxiosError<any>;
      const details = ax?.response?.data?.details;
      if (ax?.response?.status === 409 && details?.requiresConfirmation) {
        const warnings = Array.isArray(details.warnings) && details.warnings.length ? details.warnings.join('\n') : 'This list has dependent records.';
        const ok = window.confirm(`Delete impact warning:\n\n${warnings}\n\nContinue and remove linked dependent records?`);
        if (ok) await handleDeleteList(id, true);
      }
    }
  }

  async function handleMoveStudent() {
    if (!detail || !moveAlloc || !moveTargetRoom) return;
    try {
      const updated = await moveExaminationListStudent(detail.id, { allocationId: moveAlloc.id, targetRoomId: moveTargetRoom });
      setDetail(updated);
      if (viewRoom) setViewRoom(updated.rooms?.find((r) => r.id === viewRoom.id) || null);
      setMoveOpen(false);
      setMoveAlloc(null);
      setMoveTargetRoom('');
      toast.success('Student moved successfully');
      await loadDashboard(updated.id);
    } catch {
      // handled
    }
  }

  async function loadAvailableStudentsForRoom(listId: string) {
    try {
      const rows = await getExaminationListAvailableStudents(listId);
      setAvailableStudents(rows.map((s) => ({ id: s.id, studentCode: s.studentCode ?? null, fullName: s.fullName, className: s.className })));
    } catch {
      setAvailableStudents([]);
    }
  }

  async function handleAddStudentToRoom() {
    if (!detail || !viewRoom || !addStudentId) return;
    setRoomSaving(true);
    try {
      const updated = await addExaminationListStudent(detail.id, { roomId: viewRoom.id, studentId: addStudentId });
      setDetail(updated);
      setViewRoom(updated.rooms?.find((r) => r.id === viewRoom.id) || null);
      setAddStudentId(null);
      await loadAvailableStudentsForRoom(detail.id);
      toast.success('Student added to room');
      await loadDashboard(updated.id);
    } catch {
      // handled by interceptor
    } finally {
      setRoomSaving(false);
    }
  }

  async function handleRemoveAllocation(allocationId: string) {
    if (!detail) return;
    if (!window.confirm('Remove this student from this room?')) return;
    setRoomSaving(true);
    try {
      const updated = await removeExaminationListAllocation(detail.id, allocationId);
      setDetail(updated);
      if (viewRoom) setViewRoom(updated.rooms?.find((r) => r.id === viewRoom.id) || null);
      await loadAvailableStudentsForRoom(detail.id);
      toast.success('Student removed from room');
      await loadDashboard(updated.id);
    } catch {
      // handled
    } finally {
      setRoomSaving(false);
    }
  }

  const rooms = detail?.rooms || [];
  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => {
      const classesText = [...new Set((r.allocations || []).map((a) => a.className))].join(' ').toLowerCase();
      return `${r.roomName} ${r.roomNumber || ''} ${classesText}`.toLowerCase().includes(q);
    });
  }, [rooms, roomSearch]);

  const pagedRooms = filteredRooms.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function exportRoomsExcel(roomsToExport: ExaminationListRoom[], all = false) {
    if (!detail) return;
    const header = ['Room Name', 'Room Number', 'Student ID/Code', 'Student Name', 'Class', 'Gender'];
    const rows: string[][] = [header];
    for (const room of roomsToExport) {
      const allocs = room.allocations || [];
      if (!allocs.length) {
        rows.push([room.roomName, room.roomNumber || '', '', '(No students)', '', '']);
      } else {
        for (const a of allocs) {
          rows.push([room.roomName, room.roomNumber || '', a.studentCode || a.studentId, a.studentName, a.className, a.gender || '']);
        }
      }
    }
    downloadCsv(`${all ? 'all-examination-rooms' : (roomsToExport[0]?.roomName || 'room').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${detail.academicYear}-${detail.term}.csv`, rows);
  }

  function listCode(d: ExaminationList) {
    return d.listCode || `EL-${d.id.slice(0, 8).toUpperCase()}`;
  }

  function examCode(d: ExaminationList) {
    return d.examinationCode || d.examinationTimetable?.examinationCode || `EX-${d.academicYear.replace(/\s+/g, '')}-${d.term.replace(/\s+/g, '')}`;
  }

  function printRooms(roomsToPrint: ExaminationListRoom[], all = false) {
    if (!detail) return;
    const sections = roomsToPrint.map((room) => {
      const allocs = room.allocations || [];
      const classes = [...new Set(allocs.map((a) => a.className))].join(', ') || '—';
      const body = allocs.length
        ? allocs.map((a, i) => `<tr><td>${i + 1}</td><td>${a.studentCode || a.studentId}</td><td>${a.studentName}</td><td>${a.className}</td></tr>`).join('')
        : '<tr><td colspan="4">No students allocated</td></tr>';
      return `<div class="room"><h2>${room.roomName}${room.roomNumber ? ` (${room.roomNumber})` : ''}</h2>
        <div class="meta">
          <div><b>Examination List Code:</b> ${listCode(detail)} &nbsp;|&nbsp; <b>Examination Code:</b> ${examCode(detail)}</div>
          <div><b>Academic Year:</b> ${detail.academicYear} &nbsp;|&nbsp; <b>Term:</b> ${detail.term} &nbsp;|&nbsp; <b>Room:</b> ${room.roomName}${room.roomNumber ? ` (${room.roomNumber})` : ''}</div>
          <div><b>Allocated Classes:</b> ${classes} &nbsp;|&nbsp; <b>Total Students:</b> ${allocs.length} &nbsp;|&nbsp; <b>Capacity:</b> ${room.capacity}</div>
        </div>
        <table><thead><tr><th>No.</th><th>Student ID</th><th>Student Name</th><th>Class</th></tr></thead><tbody>${body}</tbody></table>
        <div class="meta" style="margin-top:16px;display:flex;justify-content:space-between"><span>Invigilator Signature: _______________________</span><span>Date: _______________________</span></div>
      </div>`;
    }).join('');
    const title = all ? 'All Examination Room Lists' : `Examination Room List - ${roomsToPrint[0]?.roomName || ''}`;
    printHtml(title, `<h1>Examination List</h1><div class="meta"><b>${detail.name || 'Examination List'}</b> · ${detail.academicYear} · ${detail.term} · List Code: ${listCode(detail)} · Examination Code: ${examCode(detail)}</div>${sections}`);
  }

  async function downloadRoomsPdf(roomsToPrint: ExaminationListRoom[], all = false) {
    if (!detail) return;
    const loadLogo = async () => {
      try {
        const url = `${window.location.origin}/yellow-icon.png`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const data = await new Promise<string | null>((resolve) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === 'string' ? r.result : null); r.onerror = () => resolve(null); r.readAsDataURL(blob); });
        if (!data) return null;
        const format = data.includes('image/jpeg') ? 'JPEG' : data.includes('image/webp') ? 'WEBP' : 'PNG';
        return { data, format: format as 'PNG'|'JPEG'|'WEBP' };
      } catch { return null; }
    };
    const logo = await loadLogo();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const navy: [number,number,number] = [0, 4, 53];
    const amber: [number,number,number] = [252, 176, 56];
    const slate: [number,number,number] = [71, 85, 105];
    const examTypeName = (detail as any).examinationType?.name || (detail as any).examinationTimetable?.examinationType?.name || 'Examination';
    const examFrom = detail.startDate || detail.examinationTimetable?.startDate;
    const examTo = detail.endDate || detail.examinationTimetable?.endDate;
    const fmt = (v?: string | null) => v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    for (let idx = 0; idx < roomsToPrint.length; idx++) {
      const room = roomsToPrint[idx];
      if (idx > 0) doc.addPage();
      const allocs = room.allocations || [];
      const classNames = [...new Set(allocs.map((a) => a.className).filter(Boolean))].join(', ') || '—';
      const qrPayload = JSON.stringify({
        type: 'EXAM_ROOM',
        examType: examTypeName,
        examCode: examCode(detail),
        listCode: listCode(detail),
        room: room.roomName,
        roomNumber: room.roomNumber || '',
        academicYear: detail.academicYear,
        term: detail.term,
      });
      let qrDataUrl: string | null = null;
      try { qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 120, color: { dark: '#000435', light: '#FFFFFF' } }); } catch {}

      // Header
      doc.setFillColor(...navy);
      doc.rect(0, 0, pageWidth, 74, 'F');
      doc.setFillColor(...amber);
      doc.rect(0, 74, pageWidth, 3, 'F');
      if (logo) {
        try { doc.addImage(logo.data, logo.format, margin, 14, 46, 46); } catch { try { doc.addImage(logo.data, 'PNG', margin, 14, 46, 46); } catch {} }
      }
      const hx = logo ? margin + 58 : margin;
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text(examTypeName, hx, 28);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(226,232,240);
      doc.text(`Examination Room List  •  ${detail.academicYear} ${detail.term}`, hx, 44);
      doc.text(`Period: ${fmt(examFrom)} - ${fmt(examTo)}`, hx, 58);

      if (qrDataUrl) {
        try { doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 56, 10, 56, 56); } catch {}
      }

      // Meta cards
      let y = 94;
      const meta = [
        ['Examination Room Code', `${listCode(detail)} / ${room.roomNumber || room.roomName}`],
        ['Room', room.roomName + (room.roomNumber ? ` (${room.roomNumber})` : '')],
        ['Allocated Classes', classNames],
        ['Total Students', `${allocs.length} / ${room.capacity}`],
      ];
      const cardW = (pageWidth - margin * 2 - 12) / 2;
      const cardH = 34;
      meta.forEach((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = margin + col * (cardW + 12);
        const yy = y + row * (cardH + 8);
        doc.setFillColor(248,250,252);
        doc.setDrawColor(226,232,240);
        doc.roundedRect(x, yy, cardW, cardH, 4, 4, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...slate);
        doc.text(m[0].toUpperCase(), x + 10, yy + 13);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...navy);
        const val = doc.splitTextToSize(m[1], cardW - 20);
        doc.text(val.slice(0,2), x + 10, yy + 25);
      });
      y = y + 2 * (cardH + 8) + 10;

      autoTable(doc, {
        startY: y,
        head: [['No.', 'Student ID', 'Student Name', 'Class']],
        body: allocs.length ? allocs.map((a, i) => [String(i + 1), a.studentCode || a.studentId || '—', a.studentName, a.className]) : [['—', '—', 'No students allocated', '—']],
        styles: { fontSize: 9, cellPadding: 5, lineColor: [226,232,240], lineWidth: 0.5, textColor: [30,41,59] },
        headStyles: { fillColor: navy, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8.5 },
        alternateRowStyles: { fillColor: [248,250,252] },
        margin: { left: margin, right: margin, bottom: 50 },
        didDrawPage: (data) => {
          const py = pageHeight - 24;
          doc.setDrawColor(226,232,240);
          doc.line(margin, py - 10, pageWidth - margin, py - 10);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100,116,139);
          doc.text('Generated by Shule+', margin, py);
          doc.text(`Page ${data.pageNumber}`, pageWidth - margin, py, { align: 'right' });
        }
      });
    }
    const base = all ? `all-examination-rooms-${listCode(detail)}` : `${(roomsToPrint[0]?.roomName || 'room').replace(/[^a-z0-9_-]+/gi, '_')}-${listCode(detail)}`;
    doc.save(`${base}.pdf`);
  }

  const stats = dashboard?.stats;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' } as any} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' } as any} spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY }}>Examination Lists</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
              Manage examination rooms and generate balanced student allocation lists for the selected period.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Academic Year</InputLabel>
              <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {(settings?.academicYears?.length ? settings.academicYears : (academicYear ? [academicYear] : [])).map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Term</InputLabel>
              <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
                {(settings?.terms?.length ? settings.terms : (term ? [term] : [])).map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Examination Type</InputLabel>
              <Select label="Examination Type" value={filterExamTypeId} onChange={(e) => setFilterExamTypeId(e.target.value)}>
                <MenuItem value="">All types</MenuItem>
                {examTypes.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openWizard} disabled={!academicYear || !term}
              sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, '&:hover': { bgcolor: '#001f5c' } }}>
              Generate Examination Lists
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' } as any} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
        <StatCard label="Total Students" value={stats?.totalStudents ?? '—'} icon={<GroupsOutlinedIcon />} tone="#2563eb" />
        <StatCard label="Examination Rooms" value={stats?.totalExaminationRooms ?? '—'} icon={<MeetingRoomOutlinedIcon />} tone="#0891b2" />
        <StatCard label="Students Allocated" value={stats?.totalStudentsAllocated ?? '—'} icon={<HowToRegOutlinedIcon />} tone="#059669" />
        <StatCard label="Not Allocated" value={stats?.studentsNotAllocated ?? '—'} icon={<PersonOffOutlinedIcon />} tone="#d97706" />
        <StatCard label="Classes Participating" value={stats?.totalClassesParticipating ?? '—'} icon={<SchoolOutlinedIcon />} tone="#7c3aed" />
        <StatCard label="Lists Generated" value={stats?.examinationListsGenerated ?? '—'} icon={<FactCheckOutlinedIcon />} tone="#0f766e" />
      </Stack>

      {loading ? <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : null}

      {!loading && !detail ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No examination list generated for {academicYear} {term} yet. Click <b>Generate Examination Lists</b> to configure rooms and allocate students.
        </Alert>
      ) : null}

      {dashboard?.lists?.length ? (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, px: 2.5, borderBottom: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Saved Examination Lists</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>View and manage generated examination lists for the selected period.</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Examination List Code', 'Examination Code', 'Academic Year / Term', 'Period', 'Students', 'Rooms', 'Status', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboard.lists.map((l) => {
                  const period = l.startDate && l.endDate ? `${String(l.startDate).slice(0,10)} to ${String(l.endDate).slice(0,10)}` : '—';
                  const students = l._count?.allocations ?? l.rooms?.reduce((n, r) => n + (r._count?.allocations || 0), 0) ?? 0;
                  return (
                    <TableRow key={l.id} hover selected={detail?.id === l.id}>
                      <TableCell sx={{ fontWeight: 700, color: NAVY }}>{listCode(l)}</TableCell>
                      <TableCell>{examCode(l)}</TableCell>
                      <TableCell>{l.academicYear} / {l.term}</TableCell>
                      <TableCell>{period}</TableCell>
                      <TableCell>{students}</TableCell>
                      <TableCell>{l.rooms?.length ?? 0}</TableCell>
                      <TableCell>
                        <Chip size="small" label={l.status} color={l.status === 'PUBLISHED' ? 'success' : l.status === 'GENERATED' ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          <IconButton size="small" title="View/Edit" onClick={() => { void viewListDetail(l.id); }}><VisibilityOutlinedIcon fontSize="small" /></IconButton>
                          {l.status !== 'PUBLISHED' ? (
                            <IconButton size="small" title="Publish" color="success" onClick={() => handlePublishList(l.id)}><FactCheckOutlinedIcon fontSize="small" /></IconButton>
                          ) : (
                            <IconButton size="small" title="Unpublish" color="warning" onClick={() => handleUnpublishList(l.id)}><AutorenewOutlinedIcon fontSize="small" /></IconButton>
                          )}
                          <IconButton size="small" title="Print" onClick={async () => { await viewListDetail(l.id); toast.info('List loaded. Use Print/PDF in room allocations.'); }}><PrintOutlinedIcon fontSize="small" /></IconButton>
                          <IconButton size="small" title="Delete" color="error" disabled={l.status === 'PUBLISHED'} onClick={() => handleDeleteList(l.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
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

      {detail ? (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, px: 2.5, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 1.5, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography sx={{ fontWeight: 800, color: NAVY }}>Room Allocations</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{detail.name || 'Examination List'} · {detail.academicYear} {detail.term} · {rooms.length} rooms · {detail.status}</Typography>
              {detail.status === 'PUBLISHED' ? <Alert severity="success" sx={{ mt: 1, py: 0 }}>Published and protected: student moves and deletion are disabled. Unpublish to make changes.</Alert> : null}
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <TextField size="small" placeholder="Search rooms or classes" value={roomSearch} onChange={(e) => { setRoomSearch(e.target.value); setPage(0); }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} sx={{ minWidth: 240 }} />
              <Button size="small" variant="outlined" startIcon={<AutorenewOutlinedIcon />} onClick={() => setRegenConfirm(true)} sx={{ textTransform: 'none' }}>Regenerate</Button>
              <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => printRooms(rooms, true)} sx={{ textTransform: 'none' }}>Print</Button>
              <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => void downloadRoomsPdf(rooms, true)} sx={{ textTransform: 'none' }}>Download PDF</Button>
              <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => exportRoomsExcel(rooms, true)} sx={{ textTransform: 'none' }}>Export Excel</Button>
              {detail.status !== 'PUBLISHED' ? (
                <Button size="small" variant="contained" color="success" onClick={() => handlePublishList(detail.id)} sx={{ textTransform: 'none' }}>Publish</Button>
              ) : (
                <Button size="small" variant="outlined" color="warning" onClick={() => handleUnpublishList(detail.id)} sx={{ textTransform: 'none' }}>Unpublish</Button>
              )}
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} disabled={detail.status === 'PUBLISHED'} onClick={() => handleDeleteList(detail.id)} sx={{ textTransform: 'none' }}>Delete</Button>
            </Stack>
          </Box>
          {detailLoading ? <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}><CircularProgress size={22} /></Box> : (
            <>
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Room Name/Number', 'Assigned Classes', 'Students', 'Max Capacity', 'Allocation Status', 'Actions'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedRooms.length === 0 ? (
                      <TableRow><TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', color: '#64748b' }}>No rooms found.</TableCell></TableRow>
                    ) : pagedRooms.map((room) => {
                      const allocs = room.allocations || [];
                      const classNames = [...new Set(allocs.map((a) => a.className))];
                      const count = allocs.length;
                      const status = count === 0 ? 'Empty' : count >= room.capacity ? 'Full' : 'Allocated';
                      const color = status === 'Full' ? 'success' : status === 'Allocated' ? 'warning' : 'default';
                      return (
                        <TableRow key={room.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, color: NAVY }}>{room.roomName}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{room.roomNumber || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography sx={{ fontSize: '0.82rem', color: '#334155' }}>{classNames.length ? classNames.join(', ') : '—'}</Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{count}</TableCell>
                          <TableCell>{room.capacity}</TableCell>
                          <TableCell><Chip size="small" label={status} color={color as any} /></TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" title="View students" onClick={() => { setViewRoom(room); setRoomEditMode(false); setAddStudentId(null); }}><VisibilityOutlinedIcon fontSize="small" /></IconButton>
                              <IconButton size="small" title="Print" onClick={() => printRooms([room], false)}><PrintOutlinedIcon fontSize="small" /></IconButton>
                              <IconButton size="small" title="Download PDF" onClick={() => void downloadRoomsPdf([room], false)}><DownloadOutlinedIcon fontSize="small" /></IconButton>
                              <IconButton size="small" title="Export Excel" onClick={() => exportRoomsExcel([room], false)}><DownloadOutlinedIcon fontSize="small" /></IconButton>
                              <IconButton size="small" title="Delete examination list" color="error" disabled={detail.status === 'PUBLISHED'} onClick={() => handleDeleteList(detail.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination component="div" count={filteredRooms.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
            </>
          )}
        </Paper>
      ) : null}

      <Dialog open={wizardOpen} onClose={closeWizard} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.15rem' }}>Generate Examination Lists</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>Configure rooms, classes, and distribution to generate balanced exam allocations.</Typography>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 420, bgcolor: '#f8fafc', px: 3, py: 3 }}>
          {wizardLoading ? <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : (
            <Box>
              <Stepper activeStep={wizardStep} alternativeLabel sx={{ mb: 3, pt: 1 }}>
                {steps.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
              </Stepper>

              {wizardStep === 0 && (
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: NAVY, mb: 0.5 }}>Examination Selection & Room Configuration</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 2 }}>Select examination type, then choose an examination timetable and configure rooms.</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Examination Type</InputLabel>
                      <Select label="Examination Type" value={wizardExamTypeId} onChange={(e) => void onSelectWizardExamType(e.target.value)}>
                        <MenuItem value="">All types</MenuItem>
                        {wizardExamTypes.map((t) => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Examination (Timetable)</InputLabel>
                      <Select label="Examination (Timetable)" value={selectedExamTimetableId} onChange={(e) => void onSelectExamTimetable(e.target.value)}>
                        <MenuItem value="">Select examination timetable...</MenuItem>
                        {wizardTimetables.filter((t) => !wizardExamTypeId || t.examinationTypeId === wizardExamTypeId).map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {(t.examinationCode || 'EX-...')} — {t.examinationTypeName ? t.examinationTypeName + ' — ' : ''}{t.name} ({t.className})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Academic Year" value={academicYear} slotProps={{ input: { readOnly: !!selectedExamTimetableId } }} />
                    <TextField size="small" label="Term" value={term} slotProps={{ input: { readOnly: !!selectedExamTimetableId } }} />
                  </Box>
                  {selectedExamTimetableId ? (() => {
                    const ex = wizardTimetables.find((t) => t.id === selectedExamTimetableId);
                    return ex ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Linked examination: <b>{ex.examinationCode || ex.name}</b>{ex.examinationTypeName ? <> • Type: <b>{ex.examinationTypeName}</b></> : null} • {ex.className} • {ex.academicYear} {ex.term} {ex.startDate && ex.endDate ? `• ${String(ex.startDate).slice(0,10)} to ${String(ex.endDate).slice(0,10)}` : ''}
                      </Alert>
                    ) : null;
                  })() : null}
                  <Stack direction={{ xs: 'column', md: 'row' } as any} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: NAVY }}>Rooms</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Select available classrooms, set capacities, and add rooms manually if needed.</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <TextField size="small" type="number" label="Default capacity" value={defaultCapacity}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value) || 1);
                          setDefaultCapacity(v);
                          setWizardRooms((prev) => prev.map((room) => room.isUniqueCapacity ? room : { ...room, capacity: v }));
                        }}
                        sx={{ width: 150 }} />
                      <Button size="small" variant="outlined" onClick={() => setWizardRooms((prev) => prev.map((r) => ({ ...r, selected: true })))} sx={{ textTransform: 'none' }}>Select all</Button>
                      <Button size="small" variant="outlined" onClick={() => setWizardRooms((prev) => prev.map((r) => ({ ...r, selected: false })))} sx={{ textTransform: 'none' }}>Deselect all</Button>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ textTransform: 'none', bgcolor: NAVY }} onClick={() => {
                        const key = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                        setWizardRooms((prev) => [...prev, { key, selected: true, sourceRoomId: null, roomName: '', roomNumber: '', capacity: defaultCapacity, isUniqueCapacity: true, manual: true }]);
                      }}>Add room</Button>
                    </Stack>
                  </Stack>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Total available capacity (selected): <b>{totalCapacity}</b> seats across <b>{selectedRooms.length}</b> rooms.
                  </Alert>
                  <TableContainer sx={{ maxHeight: 360 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Use', 'Room Name', 'Room Number', 'Capacity', 'Unique capacity', ''].map((h) => (
                            <TableCell key={h || 'x'} sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wizardRooms.length === 0 ? (
                          <TableRow><TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>No classrooms found. Add rooms manually.</TableCell></TableRow>
                        ) : wizardRooms.map((room, idx) => (
                          <TableRow key={room.key}>
                            <TableCell><Checkbox checked={room.selected} onChange={(e) => setWizardRooms((prev) => prev.map((r, i) => i === idx ? { ...r, selected: e.target.checked } : r))} /></TableCell>
                            <TableCell><TextField size="small" value={room.roomName} onChange={(e) => setWizardRooms((prev) => prev.map((r, i) => i === idx ? { ...r, roomName: e.target.value } : r))} fullWidth /></TableCell>
                            <TableCell><TextField size="small" value={room.roomNumber || ''} onChange={(e) => setWizardRooms((prev) => prev.map((r, i) => i === idx ? { ...r, roomNumber: e.target.value } : r))} sx={{ width: 120 }} /></TableCell>
                            <TableCell><TextField size="small" type="number" value={room.capacity} onChange={(e) => setWizardRooms((prev) => prev.map((r, i) => i === idx ? { ...r, capacity: Math.max(1, Number(e.target.value) || 1), isUniqueCapacity: true } : r))} sx={{ width: 110 }} /></TableCell>
                            <TableCell><Checkbox checked={room.isUniqueCapacity} onChange={(e) => setWizardRooms((prev) => prev.map((r, i) => i === idx ? {
                              ...r,
                              isUniqueCapacity: e.target.checked,
                              capacity: e.target.checked ? r.capacity : defaultCapacity,
                            } : r))} /></TableCell>
                            <TableCell>{room.manual ? <IconButton size="small" onClick={() => setWizardRooms((prev) => prev.filter((_, i) => i !== idx))}><DeleteOutlineIcon fontSize="small" /></IconButton> : null}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {wizardStep === 1 && (
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' } as any} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: NAVY }}>Select Participating Classes</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Choose which classes will participate and review student populations.</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => setWizardClasses((prev) => prev.map((c) => ({ ...c, selected: true })))} sx={{ textTransform: 'none' }}>Select all</Button>
                      <Button size="small" variant="outlined" onClick={() => setWizardClasses((prev) => prev.map((c) => ({ ...c, selected: false })))} sx={{ textTransform: 'none' }}>Deselect all</Button>
                    </Stack>
                  </Stack>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Participating: <b>{selectedClasses.length}</b> classes · <b>{totalParticipants}</b> students total.
                  </Alert>
                  <TableContainer sx={{ maxHeight: 360 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Include', 'Class', 'Students'].map((h) => <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>{h}</TableCell>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wizardClasses.length === 0 ? (
                          <TableRow><TableCell colSpan={3} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>No classes found.</TableCell></TableRow>
                        ) : wizardClasses.map((c, idx) => (
                          <TableRow key={c.id} hover>
                            <TableCell><Checkbox checked={c.selected} onChange={(e) => setWizardClasses((prev) => prev.map((x, i) => i === idx ? { ...x, selected: e.target.checked } : x))} /></TableCell>
                            <TableCell sx={{ fontWeight: 600, color: NAVY }}>{c.label}</TableCell>
                            <TableCell>{c.studentCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {wizardStep === 2 && (
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: NAVY, mb: 0.5 }}>Student Distribution Method</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 2 }}>Choose how students from participating classes are distributed across selected rooms.</Typography>
                  <RadioGroup value={distribution} onChange={(e) => setDistribution(e.target.value as ExaminationDistributionMethod)}>
                    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderColor: distribution === 'KEEP_CLASS' ? NAVY : '#e2e8f0' }}>
                      <FormControlLabel value="KEEP_CLASS" control={<Radio />} label={<Box><Typography sx={{ fontWeight: 700 }}>Keep students in their original classes</Typography><Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Allocate class members together. If a class exceeds room capacity, it is split across rooms. Mixing is avoided unless necessary.</Typography></Box>} />
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderColor: distribution === 'MIX_CLASSES' ? NAVY : '#e2e8f0' }}>
                      <FormControlLabel value="MIX_CLASSES" control={<Radio />} label={<Box><Typography sx={{ fontWeight: 700 }}>Mix students from different classes</Typography><Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Distribute students across rooms using a mixing rule or automatic balanced distribution.</Typography></Box>} />
                      {distribution === 'MIX_CLASSES' ? (
                        <Box sx={{ pl: 4, pt: 1 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' } as any} spacing={2} alignItems={{ sm: 'center' }}>
                            <FormControlLabel control={<Radio checked={mixMode === 'AUTO'} onChange={() => setMixMode('AUTO')} />} label="Automatic best distribution" />
                            <FormControlLabel control={<Radio checked={mixMode === 'CUSTOM'} onChange={() => setMixMode('CUSTOM')} />} label="Custom mixing quantity per class" />
                            {mixMode === 'CUSTOM' ? (
                              <TextField size="small" type="number" label="Students per class block" value={mixQuantity} onChange={(e) => setMixQuantity(Math.max(1, Number(e.target.value) || 1))} sx={{ width: 220 }} />
                            ) : null}
                          </Stack>
                        </Box>
                      ) : null}
                    </Paper>
                  </RadioGroup>
                </Paper>
              )}

              {wizardStep === 3 && (
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1.5 }}>Review & Generate</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                    <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Selected classes</Typography>
                      <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{selectedClasses.length} classes</Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: '#334155', mt: 0.5 }}>{selectedClasses.map((c) => `${c.label} (${c.studentCount})`).join(', ') || '—'}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Capacity & distribution</Typography>
                      <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{totalParticipants} students · {totalCapacity} seats</Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: totalCapacity >= totalParticipants ? '#059669' : '#dc2626', mt: 0.5, fontWeight: 700 }}>
                        Remaining capacity: {Math.max(0, totalCapacity - totalParticipants)} {totalCapacity < totalParticipants ? `(short by ${totalParticipants - totalCapacity})` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: '#334155', mt: 0.5 }}>
                        Method: {distribution === 'KEEP_CLASS' ? 'Keep students in original classes' : mixMode === 'AUTO' ? 'Mix classes (automatic best distribution)' : `Mix classes (${mixQuantity} per class block)`}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2, gridColumn: { md: '1 / -1' } }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Selected rooms</Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: '#334155', mt: 0.5 }}>
                        {selectedRooms.map((r) => `${r.roomName}${r.roomNumber ? ` (${r.roomNumber})` : ''}: ${r.capacity}`).join(' · ') || '—'}
                      </Typography>
                    </Box>
                  </Box>
                  {totalCapacity < totalParticipants ? (
                    <Alert severity="error" sx={{ mt: 2 }}>Not enough room capacity for all participating students. Add rooms or increase capacities, or reduce participating classes.</Alert>
                  ) : null}
                  <Alert severity="warning" sx={{ mt: 2 }}>Generating will create room allocations for all selected students in one operation. You will be asked to confirm before regenerating to avoid losing saved changes.</Alert>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Button onClick={closeWizard} disabled={generating} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Stack direction="row" spacing={1}>
            <Button disabled={wizardStep === 0 || wizardLoading || generating} onClick={() => setWizardStep((s) => s - 1)} sx={{ textTransform: 'none', color: '#475569' }}>Back</Button>
            {wizardStep < steps.length - 1 ? (
              <Button variant="contained" disabled={!canNext || wizardLoading} onClick={() => setWizardStep((s) => s + 1)} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>Continue</Button>
            ) : (
              <Button variant="contained" disabled={!canNext || generating} onClick={submitGenerate} startIcon={generating ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>
                {generating ? 'Generating...' : 'Generate Lists'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog open={regenConfirm} onClose={() => setRegenConfirm(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.05rem' }}>Regenerate Examination Lists?</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
            Regenerating will create a new examination list and allocations. Manual student moves in the currently viewed list will remain on that list record, but a new generated list will be produced.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', gap: 1 }}>
          <Button onClick={() => setRegenConfirm(false)} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Button variant="contained" color="warning" sx={{ textTransform: 'none', borderRadius: 2 }} onClick={() => { setRegenConfirm(false); openWizard(); }}>Continue</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewRoom)} onClose={() => { setViewRoom(null); setRoomEditMode(false); setAddStudentId(null); }} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.2rem' }}>Examination Room List</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mt: 0.25 }}>
                {detail?.name || 'Examination List'} • {detail?.academicYear} {detail?.term}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={detail?.status || '—'} color={detail?.status === 'PUBLISHED' ? 'success' : detail?.status === 'GENERATED' ? 'primary' : 'default'} />
              {viewRoom && detail ? <Button size="small" variant={roomEditMode ? 'contained' : 'outlined'} onClick={async () => { const next = !roomEditMode; setRoomEditMode(next); if (next && detail) await loadAvailableStudentsForRoom(detail.id); }} sx={{ textTransform: 'none', borderRadius: 2 }}>{roomEditMode ? 'Done Editing' : 'Edit Room'}</Button> : null}
            </Stack>
          </Stack>
        </Box>
        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: '#f8fafc' }}>
          {viewRoom && detail ? (() => {
            const allocs = viewRoom.allocations || [];
            const classes = [...new Set(allocs.map((a) => a.className))].filter(Boolean);
            const examFrom = detail.startDate || detail.examinationTimetable?.startDate;
            const examTo = detail.endDate || detail.examinationTimetable?.endDate;
            const fmt = (v?: string | null) => v ? new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
            return (
              <Box>
                <Paper elevation={0} sx={{ p: 2.25, mb: 2, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#fff' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.25 }}>
                    <Box><Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Examination Name</Typography><Typography sx={{ fontWeight: 700, color: NAVY }}>{detail.examinationName || detail.name || '—'}</Typography></Box>
                    <Box><Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Examination / List Code</Typography><Typography sx={{ fontWeight: 700, color: NAVY }}>{examCode(detail)} / {listCode(detail)}</Typography></Box>
                    <Box><Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Examination Period</Typography><Typography sx={{ fontWeight: 600 }}>{fmt(examFrom)} — {fmt(examTo)}</Typography></Box>
                    <Box><Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Room</Typography><Typography sx={{ fontWeight: 700, color: NAVY }}>{viewRoom.roomName}{viewRoom.roomNumber ? ` (${viewRoom.roomNumber})` : ''}</Typography></Box>
                    <Box><Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Room Code / Capacity</Typography><Typography sx={{ fontWeight: 600 }}>{viewRoom.roomNumber || '—'} • {allocs.length} / {viewRoom.capacity} students</Typography></Box>
                    <Box><Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Academic Year / Term</Typography><Typography sx={{ fontWeight: 600 }}>{detail.academicYear} / {detail.term}</Typography></Box>
                  </Box>
                  <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Classes in this room</Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {classes.length ? classes.map((c) => <Chip key={c} size="small" label={c} sx={{ bgcolor: '#eef2ff', color: NAVY }} />) : <Typography sx={{ fontSize: '0.82rem', color: '#64748b' }}>—</Typography>}
                    </Stack>
                  </Box>
                </Paper>

                {roomEditMode && detail.status !== 'PUBLISHED' ? (
                  <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #bfdbfe', borderRadius: 2.5, bgcolor: '#eff6ff' }}>
                    <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Add student to this room</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                      <Autocomplete
                        size="small"
                        sx={{ flex: 1, bgcolor: '#fff' }}
                        options={availableStudents}
                        value={availableStudents.find((s) => s.id === addStudentId) || null}
                        onChange={(_, v) => setAddStudentId(v?.id || null)}
                        getOptionLabel={(o) => `${o.fullName} (${o.studentCode || o.id}) — ${o.className}`}
                        renderInput={(params) => <TextField {...params} label="Search student by name/code/class" />}
                      />
                      <Button variant="contained" disabled={!addStudentId || roomSaving} onClick={() => void handleAddStudentToRoom()} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}>Add Student</Button>
                    </Stack>
                    <Typography sx={{ mt: 1, fontSize: '0.75rem', color: '#475569' }}>Only students not already allocated in this examination list are shown. Capacity and duplicate checks are enforced.</Typography>
                  </Paper>
                ) : null}

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, maxHeight: 460, bgcolor: '#fff' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['No.', 'Student ID', 'Student Name', 'Class', ...(detail.status !== 'PUBLISHED' ? ['Actions'] : [])].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allocs.length === 0 ? (
                        <TableRow><TableCell colSpan={detail.status !== 'PUBLISHED' ? 5 : 4} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>No students allocated to this room.</TableCell></TableRow>
                      ) : allocs.map((a, idx) => (
                        <TableRow key={a.id} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{a.studentCode || a.studentId}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: NAVY }}>{a.studentName}</TableCell>
                          <TableCell>{a.className}</TableCell>
                          {detail.status !== 'PUBLISHED' ? (
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Button size="small" variant="outlined" disabled={roomSaving} onClick={() => { setMoveAlloc(a); setMoveTargetRoom(''); setMoveOpen(true); }} sx={{ textTransform: 'none', borderRadius: 1.5 }}>Move</Button>
                                {roomEditMode ? <Button size="small" color="error" disabled={roomSaving} onClick={() => void handleRemoveAllocation(a.id)} sx={{ textTransform: 'none' }}>Remove</Button> : null}
                              </Stack>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })() : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', gap: 1 }}>
          <Button onClick={() => { setViewRoom(null); setRoomEditMode(false); setAddStudentId(null); }} sx={{ textTransform: 'none', color: '#475569', mr: 'auto' }}>Close</Button>
          {viewRoom ? (
            <>
              <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => printRooms([viewRoom], false)} sx={{ textTransform: 'none', borderRadius: 2 }}>Print</Button>
              <Button variant="contained" startIcon={<DownloadOutlinedIcon />} onClick={() => void downloadRoomsPdf([viewRoom], false)} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, '&:hover': { bgcolor: '#001f5c' } }}>Download PDF</Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>Move Student</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>Reassign student to another room with available capacity.</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3, bgcolor: '#f8fafc' }}>
          {moveAlloc ? (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Alert severity="info">
                <b>{moveAlloc.studentName}</b> ({moveAlloc.className})<br />Current allocation will be moved to the selected room.
              </Alert>
              <FormControl fullWidth size="small">
                <InputLabel>Target room</InputLabel>
                <Select label="Target room" value={moveTargetRoom} onChange={(e) => setMoveTargetRoom(e.target.value)}>
                  {(detail?.rooms || []).map((r) => {
                    const count = (r.allocations || []).length;
                    const isCurrent = r.id === moveAlloc.roomId;
                    const full = !isCurrent && count >= r.capacity;
                    return (
                      <MenuItem key={r.id} value={r.id} disabled={isCurrent || full}>
                        {r.roomName}{r.roomNumber ? ` (${r.roomNumber})` : ''} — {count}/{r.capacity}{isCurrent ? ' (current)' : full ? ' (full)' : ''}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', gap: 1 }}>
          <Button onClick={() => setMoveOpen(false)} sx={{ textTransform: 'none', color: '#475569' }}>Cancel</Button>
          <Button variant="contained" disabled={!moveTargetRoom} onClick={handleMoveStudent} sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, px: 2.5 }}>Move Student</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

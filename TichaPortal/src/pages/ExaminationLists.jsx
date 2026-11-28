import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import UpcomingOutlinedIcon from '@mui/icons-material/UpcomingOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import { useTpToast } from '../components/TpToast.jsx';
import { fetchMyExaminationInvigilatorAssignments, fetchExaminationAttendance, markExaminationAttendance } from '../services/teacherPortalApi';

const NAVY = '#000435';

function toDateKey(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : String(value).slice(0, 10);
}

function fmtDate(value) {
  const k = toDateKey(value);
  if (!k) return '—';
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function nowKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getExamSessionStatus(a) {
  const dk = toDateKey(a?.examDate);
  const today = nowKey();
  if (!dk) return 'UPCOMING';
  const start = a?.startTime || (a?.session === 'MORNING' ? '08:00' : '14:00');
  const end = a?.endTime || (a?.session === 'MORNING' ? '12:00' : '18:00');
  const [sh, sm] = String(start).split(':').map(Number);
  const [eh, em] = String(end).split(':').map(Number);
  const startMins = (Number(sh || 0) * 60) + Number(sm || 0);
  const endMins = (Number(eh || 0) * 60) + Number(em || 0);
  if (dk < today) return 'COMPLETED';
  if (dk > today) return 'UPCOMING';
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins > endMins) return 'COMPLETED';
  if (mins >= startMins) return 'ONGOING';
  return 'UPCOMING';
}

function isPast(a) {
  return getExamSessionStatus(a) === 'COMPLETED';
}

function downloadCsv(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function printHtml(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
    h1{font-size:20px;margin:0 0 4px;color:#000435}
    .meta{color:#475569;margin:0 0 12px;font-size:13px;line-height:1.5}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{border:1px solid #cbd5e1;padding:7px;font-size:12px;text-align:left}
    th{background:#f1f5f9}
    @media print{body{padding:12px}}
  </style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function StatCard({ label, value, icon, tone }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, minWidth: 160, flex: 1 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${tone}18`, color: tone, display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function ExaminationLists() {
  const toast = useTpToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(0);
  const [attRoomKey, setAttRoomKey] = useState('');
  const [attLoading, setAttLoading] = useState(false);
  const [attData, setAttData] = useState(null);
  const [attOpen, setAttOpen] = useState(false);
  const [attSaving, setAttSaving] = useState(false);
  const [attError, setAttError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await fetchMyExaminationInvigilatorAssignments();
      const rows = Array.isArray(data) ? data : (data?.assignments || []);
      setAssignments(rows);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load examination assignments');
      setAssignments([]);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => assignments.map((a) => {
    const list = a.examinationList || {};
    const timetable = list.examinationTimetable || {};
    const examCode = a.examinationCode || list.examinationCode || timetable.examinationCode || '—';
    const listCode = a.listCode || list.listCode || '—';
    const examName = list.examinationName || timetable.name || 'Examination';
    const year = list.academicYear || timetable.academicYear || '';
    const term = list.term || timetable.term || '';
    const roomStudents = a.room?.allocations || (list.rooms || []).find((r) => r.id === a.roomId)?.allocations || [];
    const invigilators = (a.coInvigilators && a.coInvigilators.length ? a.coInvigilators : [a]).map((i) => i.teacherName).filter(Boolean);
    const past = isPast(a);
    const dk = toDateKey(a.examDate);
    const classAssigned = [...new Set((roomStudents || []).map((s) => s.className).filter(Boolean))];
    const slots = (timetable.slots || []).filter((sl) => toDateKey(sl.examDate) === dk && (sl.sessionCode || sl.session) === (a.sessionCode || a.session));
    const examsForRoom = slots.map((sl) => ({ courseName: sl.courseName, startTime: sl.startTime, endTime: sl.endTime, className: sl.className || null }));
    return { ...a, examCode, listCode, examName, year, term, roomStudents, invigilators: [...new Set(invigilators)], past, classAssigned, examsForRoom };
  }), [assignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((a) => [a.examCode,a.listCode,a.examName,a.roomName,a.year,a.term,toDateKey(a.examDate),a.sessionName,...(a.invigilators||[]),...(a.classAssigned||[]),...(a.roomStudents||[]).map((s)=>`${s.studentName} ${s.studentCode||''} ${s.className||''}`)].join(' ').toLowerCase().includes(q));
  }, [enriched, search]);

  const stats = useMemo(() => {
    const days = new Set(enriched.map((a) => toDateKey(a.examDate))).size;
    const rooms = new Set(enriched.map((a) => a.roomId || a.roomName)).size;
    const upcoming = enriched.filter((a) => !a.past).length;
    const completed = enriched.filter((a) => a.past).length;
    return { days, rooms, upcoming, completed, total: enriched.length };
  }, [enriched]);

  const attendanceOptions = useMemo(() => {
    const map = new Map();
    for (const a of enriched) {
      const sessionCode = a.sessionCode || a.session;
      const key = `${a.examinationListId}|${a.roomId}|${toDateKey(a.examDate)}|${sessionCode}`;
      if (!map.has(key)) map.set(key, { key, examinationListId: a.examinationListId, roomId: a.roomId, roomName: a.roomName, examDate: toDateKey(a.examDate), session: a.session, sessionCode, sessionName: a.sessionName || (a.session === 'MORNING' ? 'Morning' : 'Afternoon'), startTime: a.startTime || '', endTime: a.endTime || '', examCode: a.examCode, listCode: a.listCode });
    }
    return [...map.values()].sort((a,b)=>a.examDate.localeCompare(b.examDate)||a.startTime.localeCompare(b.startTime)||a.roomName.localeCompare(b.roomName));
  }, [enriched]);

  function exportAssignment(a) {
    const rows = [['No', 'Student ID', 'Student Name', 'Class']];
    (a.roomStudents || []).forEach((s, i) => rows.push([String(i + 1), s.studentCode || '—', s.studentName || '', s.className || '']));
    downloadCsv(`exam-list-${a.listCode}-${a.roomName}-${toDateKey(a.examDate)}-${a.sessionCode}.csv`, rows);
  }

  async function downloadAssignmentPdf(a) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const navy = [0, 4, 53];
    const amber = [252, 176, 56];
    const palette = [[37,99,235],[5,150,105],[217,119,6],[124,58,237],[220,38,38],[8,145,178],[79,70,229],[15,118,110]];

    const drawHeader = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, pageWidth, 70, 'F');
      doc.setFillColor(...amber); doc.rect(0, 70, pageWidth, 4, 'F');
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16);
      doc.text('Examination Room List', margin, 28);
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(226,232,240);
      doc.text(`${a.examName || 'Examination'} • ${a.examCode || ''} / ${a.listCode || ''} • ${a.year || ''} ${a.term || ''}`, margin, 45);
      doc.text(`${fmtDate(a.examDate)} • ${a.sessionName || ''} • Room: ${a.roomName || ''}${a.roomNumber ? ` (${a.roomNumber})` : ''}`, margin, 58);
    };

    const groups = [];
    const map = new Map();
    for (const st of (a.roomStudents || [])) {
      const k = st.classId || st.className || 'unknown';
      if (!map.has(k)) { map.set(k, { className: st.className || '—', students: [] }); groups.push(map.get(k)); }
      map.get(k).students.push(st);
    }

    drawHeader();
    let y = 90;
    doc.setFillColor(248,250,252); doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 6, 6, 'F');
    doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    doc.text(`Classes: ${(a.classAssigned||[]).join(', ') || '—'}`, margin + 10, y + 13);
    doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105);
    doc.text(`Invigilators: ${(a.invigilators||[]).join(', ') || '—'}   |   Students: ${(a.roomStudents||[]).length}`, margin + 10, y + 25);
    y += 46;

    const cols = [margin, margin + 34, margin + 122, margin + 360];
    const drawTableHead = () => {
      doc.setFillColor(241,245,249); doc.rect(margin, y - 10, pageWidth - margin * 2, 20, 'F');
      doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      ['No.','Student ID','Student Name','Class'].forEach((h, i) => doc.text(h, cols[i], y + 3));
      y += 18;
    };
    drawTableHead();

    let rowNo = 0;
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const accent = palette[gi % palette.length];
      if (y > pageHeight - 70) { doc.addPage(); drawHeader(); y = 90; drawTableHead(); }
      doc.setFillColor(accent[0], accent[1], accent[2]); doc.rect(margin, y - 10, 4, 20, 'F');
      doc.setFillColor(Math.min(255, accent[0] + 210), Math.min(255, accent[1] + 210), Math.min(255, accent[2] + 210));
      doc.rect(margin + 4, y - 10, pageWidth - margin * 2 - 4, 20, 'F');
      doc.setTextColor(accent[0], accent[1], accent[2]); doc.setFont('helvetica','bold'); doc.setFontSize(9);
      doc.text(`${g.className}`, margin + 12, y + 3);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(71,85,105);
      doc.text(`${g.students.length} student${g.students.length === 1 ? '' : 's'}`, pageWidth - margin - 8, y + 3, { align: 'right' });
      y += 18;

      for (const st of g.students) {
        rowNo += 1;
        const nameLines = doc.splitTextToSize(String(st.studentName || ''), cols[3] - cols[2] - 10);
        const classLines = doc.splitTextToSize(String(st.className || '—'), pageWidth - margin - cols[3] - 6);
        const rowH = Math.max(16, nameLines.length * 11, classLines.length * 11) + 6;
        if (y + rowH > pageHeight - 40) { doc.addPage(); drawHeader(); y = 90; drawTableHead(); }
        doc.setFillColor(accent[0], accent[1], accent[2]); doc.rect(margin, y - 10, 2, rowH, 'F');
        if (rowNo % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(margin + 2, y - 10, pageWidth - margin * 2 - 2, rowH, 'F'); }
        doc.setTextColor(51,65,85); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
        doc.text(String(rowNo), cols[0], y + 2);
        doc.text(String(st.studentCode || '—'), cols[1], y + 2);
        doc.text(nameLines, cols[2], y + 2);
        doc.text(classLines, cols[3], y + 2);
        doc.setDrawColor(226,232,240); doc.line(margin, y - 10 + rowH, pageWidth - margin, y - 10 + rowH);
        y += rowH;
      }
      y += 4;
    }

    if (!groups.length) {
      doc.setTextColor(100,116,139); doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text('No students allocated to this room.', margin, y + 10);
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(100,116,139);
      doc.text('Generated from TichaPortal', margin, pageHeight - 18);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
    }

    doc.save(`exam-list-${String(a.listCode||'list').replace(/[^a-z0-9_-]+/gi,'_')}-${String(a.roomName||'room').replace(/[^a-z0-9_-]+/gi,'_')}-${toDateKey(a.examDate)}-${a.sessionCode}.pdf`);
  }

  function printAssignment(a) {
    const groups = [];
    const map = new Map();
    for (const st of (a.roomStudents || [])) {
      const k = st.classId || st.className || 'unknown';
      if (!map.has(k)) { map.set(k, { className: st.className || '—', students: [] }); groups.push(map.get(k)); }
      map.get(k).students.push(st);
    }
    const palette = ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0891b2','#4f46e5','#0f766e'];
    let rowNo = 0;
    const rows = groups.map((g, gi) => {
      const accent = palette[gi % palette.length];
      const head = `<tr class="class-head"><td colspan="4" style="background:${accent}18;color:${accent};font-weight:800;border-left:5px solid ${accent};padding:10px 8px">${escapeHtml(g.className)} <span style="float:right;font-weight:600;color:#64748b">${g.students.length} student${g.students.length===1?'':'s'}</span></td></tr>`;
      const body = g.students.map((st) => { rowNo += 1; return `<tr><td style="border-left:4px solid ${accent}">${rowNo}</td><td>${escapeHtml(st.studentCode || '—')}</td><td style="font-weight:600">${escapeHtml(st.studentName || '')}</td><td>${escapeHtml(st.className || '—')}</td></tr>`; }).join('');
      return head + body;
    }).join('');
    const body = `
      <div class="hero">
        <h1>Examination Room List</h1>
        <div class="sub">${escapeHtml(a.examName || 'Examination')} • ${escapeHtml(a.examCode || '')} / ${escapeHtml(a.listCode || '')} • ${escapeHtml(a.year || '')} ${escapeHtml(a.term || '')}</div>
      </div>
      <div class="meta">
        <div><b>Date / Session:</b> ${escapeHtml(fmtDate(a.examDate))} · ${escapeHtml(a.sessionName || '')} ${a.startTime || a.endTime ? `(${escapeHtml(a.startTime || '')} - ${escapeHtml(a.endTime || '')})` : ''}</div>
        <div><b>Room:</b> ${escapeHtml(a.roomName || '')}${a.roomNumber ? ` (${escapeHtml(a.roomNumber)})` : ''}</div>
        <div><b>Class(es):</b> ${escapeHtml((a.classAssigned||[]).join(', ') || '—')}</div>
        <div><b>Invigilator(s):</b> ${escapeHtml((a.invigilators || []).join(', ') || '—')}</div>
        <div><b>Total Students:</b> ${(a.roomStudents || []).length}</div>
      </div>
      <table><thead><tr><th style="width:48px">No.</th><th>Student ID</th><th>Student Name</th><th>Class</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No students allocated to this room.</td></tr>'}</tbody></table>`;
    const styles = `body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}.hero{background:#000435;color:#fff;padding:18px 20px;border-radius:12px;margin-bottom:14px}.hero h1{margin:0;font-size:22px}.sub{font-size:12px;color:#cbd5e1;margin-top:4px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:left}th{background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.03em}tr.class-head td{border-top:2px solid #cbd5e1}`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Examination List - ${escapeHtml(a.roomName || '')}</title><style>${styles}</style></head><body>${body}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }

  function withinExamWindow(att) {
    if (!att) return false;
    const today = nowKey();
    if (String(att.examDate).slice(0,10) !== today) return false;
    const [sh,sm] = String(att.startTime || (att.session==='MORNING'?'08:00':'14:00')).split(':').map(Number);
    const [eh,em] = String(att.endTime || (att.session==='MORNING'?'10:00':'16:00')).split(':').map(Number);
    const now = new Date();
    const mins = now.getHours()*60 + now.getMinutes();
    return mins >= (sh||0)*60+(sm||0) && mins <= (eh||0)*60+(em||0);
  }

  async function openAttendance(opt) {
    setAttError(''); setAttLoading(true); setAttOpen(true); setAttData(null);
    try {
      const data = await fetchExaminationAttendance({ examinationListId: opt.examinationListId, roomId: opt.roomId, examDate: opt.examDate, session: opt.session, sessionCode: opt.sessionCode });
      const students = (data?.students || []).map((s) => ({ ...s, status: s.status || 'PRESENT' }));
      const submitted = !!(data?.submitted || data?.isSubmitted || data?.locked || data?.attendanceSubmitted);
      setAttData({ ...data, submitted, students });
    } catch (e) {
      setAttError(e?.response?.data?.message || e?.message || 'Failed to load attendance');
    } finally { setAttLoading(false); }
  }

  async function saveAttendance() {
    if (!attData) return;
    setAttSaving(true); setAttError('');
    try {
      const payload = { examinationListId: attData.examinationListId, roomId: attData.roomId, examDate: attData.examDate, session: attData.session, sessionCode: attData.sessionCode, records: (attData.students || []).map((s) => ({ studentId: s.studentId, status: s.status || 'PRESENT', notes: s.notes || '' })) };
      const saved = await markExaminationAttendance(payload);
      setAttData({ ...(saved || attData), submitted: true, students: (saved?.students || attData.students || []).map((s) => ({ ...s, status: s.status || 'PRESENT' })) });
      toast.success('Attendance saved successfully.');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to save attendance';
      setAttError(msg);
      toast.error(msg);
    } finally { setAttSaving(false); }
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: NAVY }}>Examination Lists</Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Your assigned examination rooms, exams, student lists, and exam attendance.</Typography>
        </Box>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ borderBottom: '1px solid #e2e8f0' }}>
          <Tab label="My Assignments" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Exam Attendance" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {loading ? <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        {!loading && !error && tab === 0 ? (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              <StatCard label="Exam Days" value={stats.days} icon={<EventNoteOutlinedIcon />} tone="#2563eb" />
              <StatCard label="Assigned Rooms" value={stats.rooms} icon={<MeetingRoomOutlinedIcon />} tone="#0891b2" />
              <StatCard label="Upcoming" value={stats.upcoming} icon={<UpcomingOutlinedIcon />} tone="#d97706" />
              <StatCard label="Completed" value={stats.completed} icon={<TaskAltOutlinedIcon />} tone="#059669" />
            </Stack>

            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextField size="small" placeholder="Search by exam/list, room, date, class, student..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260, flex: 1, maxWidth: 520 }} />
                <Button size="small" variant="outlined" onClick={load} sx={{ textTransform: 'none' }}>Refresh</Button>
              </Box>
              {filtered.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>No examination assignments found for your account.</Box> : (
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow>{['Date & Session','Examination','Room','Class assigned','Exams for room','Students','Invigilator(s)','Status','Actions'].map((h)=><TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {filtered.map((a) => (
                        <TableRow key={a.id} hover>
                          <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{fmtDate(a.examDate)}</Typography><Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{a.sessionName || (a.session === 'MORNING' ? 'Morning' : 'Afternoon')}{a.startTime||a.endTime?` · ${a.startTime||''}-${a.endTime||''}`:''}</Typography></TableCell>
                          <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.examName}</Typography><Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{a.examCode} / {a.listCode}</Typography></TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{a.roomName}{a.roomNumber?` (${a.roomNumber})`:''}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{(a.classAssigned||[]).join(', ') || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', maxWidth: 220 }}>{(a.examsForRoom||[]).length ? (a.examsForRoom||[]).map((e)=>e.courseName).join(', ') : <span style={{color:'#94a3b8'}}>See timetable</span>}</TableCell>
                          <TableCell>{(a.roomStudents||[]).length}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{(a.invigilators||[]).join(', ') || '—'}</TableCell>
                          <TableCell>
                            {(() => {
                              const st = getExamSessionStatus(a);
                              const color = st === 'COMPLETED' ? 'default' : st === 'ONGOING' ? 'warning' : 'success';
                              const label = st === 'COMPLETED' ? 'Completed' : st === 'ONGOING' ? 'Ongoing' : 'Upcoming';
                              return <Chip size="small" color={color} label={label} />;
                            })()}
                          </TableCell>
                          <TableCell><Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={()=>setSelected(a)} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>View</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        ) : null}

        {!loading && !error && tab === 1 ? (
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5 }}>
            <Typography sx={{ fontWeight: 800, color: NAVY, mb: 0.5 }}>Exam Attendance</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 2 }}>Select an assigned room/session to mark student examination attendance. Attendance can be marked only during the exam time window.</Typography>
            <Stack direction={{ xs:'column', md:'row' }} spacing={1.5} alignItems={{ md:'center' }}>
              <FormControl size="small" sx={{ minWidth: 360, flex: 1 }}>
                <InputLabel>Assigned Room / Session</InputLabel>
                <Select label="Assigned Room / Session" value={attRoomKey} onChange={(e)=>setAttRoomKey(e.target.value)}>
                  <MenuItem value="">Select room/session...</MenuItem>
                  {attendanceOptions.map((o) => <MenuItem key={o.key} value={o.key}>{fmtDate(o.examDate)} · {o.sessionName} · {o.roomName} · {o.examCode}/{o.listCode}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" disabled={!attRoomKey} onClick={() => { const opt = attendanceOptions.find((o)=>o.key===attRoomKey); if(opt) openAttendance(opt); }} sx={{ textTransform:'none', bgcolor:'#059669', color:'#fff', fontWeight:700, px:2.5, boxShadow:'0 6px 16px rgba(5,150,105,0.28)', '&:hover':{ bgcolor:'#047857' }, '&.Mui-disabled':{ bgcolor:'#cbd5e1', color:'#64748b' } }}>Open Attendance</Button>
            </Stack>
          </Paper>
        ) : null}
      </Stack>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 }, width: '100%', m: { xs: 1, sm: 2 } } }}>
        <DialogTitle sx={{ pr: 6 }}>
          <Typography sx={{ fontWeight: 800, color: NAVY }}>Examination Room Details</Typography>
          {selected ? <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{selected.examName} · {selected.roomName} · {fmtDate(selected.examDate)} {selected.sessionName || (selected.session === 'MORNING' ? 'Morning' : 'Afternoon')}</Typography> : null}
          <IconButton onClick={() => setSelected(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  <Typography sx={{ fontSize: '0.85rem' }}><b>Examination Code:</b> {selected.examCode}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}><b>Examination List Code:</b> {selected.listCode}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}><b>Academic Year / Term:</b> {selected.year} {selected.term}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}><b>Date / Session:</b> {fmtDate(selected.examDate)} · {selected.sessionName || (selected.session === 'MORNING' ? 'Morning' : 'Afternoon')}{selected.startTime || selected.endTime ? ` (${selected.startTime || ''}-${selected.endTime || ''})` : ''}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}><b>Room:</b> {selected.roomName}{selected.roomNumber ? ` (${selected.roomNumber})` : ''}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}><b>Class(es) assigned:</b> {(selected.classAssigned||[]).join(', ') || '—'}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', gridColumn: { sm: '1 / -1' } }}><b>Exam(s) for this room/session:</b> {(selected.examsForRoom||[]).map((e)=>e.courseName).join(', ') || 'See timetable'}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', gridColumn: { sm: '1 / -1' } }}><b>Invigilator(s):</b> {(selected.invigilators || []).join(', ') || '—'}</Typography>
                </Box>
              </Paper>
              <Typography sx={{ fontWeight: 700, color: NAVY }}>Students in this room</Typography>
              {(() => {
                const students = selected.roomStudents || [];
                const dk = toDateKey(selected.examDate);
                const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
                const base = (v) => norm(v).replace(/\s+[a-z0-9]+$/i, '').trim();
                const tt = selected.examinationList?.examinationTimetable || selected.timetable || null;
                const allTimetableSlots = (tt?.slots || []);
                const allSlots = allTimetableSlots.filter((sl) => toDateKey(sl.examDate) === dk && (sl.sessionCode || sl.session) === (selected.sessionCode || selected.session));
                const rootSlots = (selected.slots || []).filter((sl) => toDateKey(sl.examDate) === dk && (sl.sessionCode || sl.session) === (selected.sessionCode || selected.session));
                const slots = allSlots.length ? allSlots : rootSlots;
                const examSlotsFromApi = Array.isArray(selected.examSlots) ? selected.examSlots : [];
                const examForClass = (classId, className) => {
                  const cn = norm(className); const cb = base(className);
                  const fromApi = examSlotsFromApi.find((es) => {
                    const en = norm(es.className); const eb = base(es.className);
                    return (classId && es.classId && String(classId) === String(es.classId)) || (cn && (en === cn || en === cb || eb === cb || eb === cn));
                  });
                  if (fromApi?.courseName) return fromApi.courseName;
                  const ttName = norm(tt?.className); const ttBase = base(tt?.className);
                  const byId = slots.find((sl) => sl.classId && classId && String(sl.classId) === String(classId));
                  if (byId?.courseName) return byId.courseName;
                  const byName = slots.find((sl) => { const sn = norm(sl.className); return sn && (sn === cn || sn === cb || base(sl.className) === cb); });
                  if (byName?.courseName) return byName.courseName;
                  if (ttName && (ttName === cn || ttName === cb || ttBase === cb || ttBase === cn || cb === ttBase)) {
                    const names = [...new Set(slots.map((x) => x.courseName).filter(Boolean))];
                    if (names.length) return names.join(', ');
                  }
                  const names = [...new Set(slots.map((x) => x.courseName).filter(Boolean))];
                  if (names.length) return names.join(', ');
                  const sameDay = [...new Set(allTimetableSlots.filter((sl)=>toDateKey(sl.examDate)===dk).map((x)=>x.courseName).filter(Boolean))];
                  return sameDay.join(', ') || '—';
                };
                // group by class for merged display
                const groups = [];
                const map = new Map();
                for (const st of students) {
                  const k = st.classId || st.className || 'unknown';
                  if (!map.has(k)) { map.set(k, { className: st.className || '—', exam: examForClass(st.classId, st.className), students: [] }); groups.push(map.get(k)); }
                  map.get(k).students.push(st);
                }
                const palette = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#0f766e'];
                let rowNo = 0;
                return (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table size="small" stickyHeader sx={{ minWidth: { xs: 520, sm: 720 } }}>
                      <TableHead><TableRow>{['No.','Student ID','Student Name','Class','Exam / Course'].map((h)=><TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap', bgcolor: '#f8fafc' }}>{h}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {groups.length ? groups.flatMap((g, gi) => {
                          const accent = palette[gi % palette.length];
                          return g.students.map((st, si) => {
                            rowNo += 1;
                            const first = si === 0;
                            const last = si === g.students.length - 1;
                            const borderColor = `${accent}55`;
                            return (
                              <TableRow key={st.id || `${g.className}-${si}`} hover sx={{ '& td': { borderBottom: last ? `2px solid ${borderColor}` : '1px solid #edf2f7' } }}>
                                <TableCell sx={{ fontWeight: 700, color: '#475569', borderLeft: `4px solid ${accent}`, bgcolor: first ? `${accent}08` : undefined }}>{rowNo}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', bgcolor: first ? `${accent}08` : undefined }}>{st.studentCode || '—'}</TableCell>
                                <TableCell sx={{ fontWeight: 600, minWidth: 160, bgcolor: first ? `${accent}08` : undefined }}>{st.studentName}</TableCell>
                                {first ? (
                                  <TableCell rowSpan={g.students.length} sx={{ verticalAlign: 'top', minWidth: 140, bgcolor: `${accent}10`, borderLeft: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}` }}>
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.4, borderRadius: 1.5, bgcolor: `${accent}18`, color: accent, fontWeight: 800, fontSize: '0.78rem' }}>
                                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent }} />
                                      {g.className}
                                    </Box>
                                    <Typography sx={{ mt: 0.5, fontSize: '0.7rem', color: '#64748b' }}>{g.students.length} student{g.students.length === 1 ? '' : 's'}</Typography>
                                  </TableCell>
                                ) : null}
                                {first ? (
                                  <TableCell rowSpan={g.students.length} sx={{ fontWeight: 600, color: '#334155', verticalAlign: 'top', minWidth: 170, bgcolor: `${accent}08` }}>
                                    {g.exam}
                                  </TableCell>
                                ) : null}
                              </TableRow>
                            );
                          });
                        }) : <TableRow><TableCell colSpan={5} sx={{ color: '#64748b', textAlign: 'center', py: 3 }}>No students allocated to this room.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                );
              })()}
              <Alert severity="info">Read-only access to your assigned examination room. Use Exam Attendance tab to mark attendance during exam time.</Alert>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setSelected(null)} sx={{ textTransform: 'none' }}>Close</Button>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} disabled={!selected} onClick={() => selected && printAssignment(selected)} sx={{ textTransform: 'none' }}>Print</Button>
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} disabled={!selected} onClick={() => selected && downloadAssignmentPdf(selected)} sx={{ textTransform: 'none' }}>Download PDF</Button>
            <Button variant="contained" startIcon={<DownloadOutlinedIcon />} disabled={!selected} onClick={() => selected && exportAssignment(selected)} sx={{ textTransform: 'none', bgcolor: NAVY }}>Download List (CSV)</Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog open={attOpen} onClose={() => !attSaving && setAttOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 }, width: '100%', m: { xs: 1, sm: 2 } } }}>
        <DialogTitle sx={{ pr: 6 }}>
          <Typography sx={{ fontWeight: 800, color: NAVY }}>Exam Attendance</Typography>
          {attData ? <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{attData.roomName} · {fmtDate(attData.examDate)} · {attData.sessionName || (attData.session === 'MORNING' ? 'Morning' : 'Afternoon')} ({attData.startTime}-{attData.endTime})</Typography> : null}
          <IconButton onClick={() => !attSaving && setAttOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {attLoading ? <Box sx={{ py: 4, display:'grid', placeItems:'center' }}><CircularProgress /></Box> : null}
          {attError ? <Alert severity="error" sx={{ mb: 2 }}>{attError}</Alert> : null}
          {attData ? (
            <Stack spacing={2}>
              <Alert severity={attData?.submitted ? 'info' : (withinExamWindow(attData) ? 'success' : 'warning')}>
                {attData?.submitted
                  ? 'Attendance has been submitted and is now locked.'
                  : (withinExamWindow(attData) ? 'Mark attendance for each student, then save. After saving, attendance cannot be edited.' : `Attendance is allowed only during exam time: ${attData.examDate} ${attData.startTime}-${attData.endTime}. Current time is outside this window.`)}
              </Alert>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow>{['No.','Student ID','Student Name','Class','Status'].map((h)=><TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {(attData.students||[]).map((s, i) => (
                      <TableRow key={s.studentId} hover>
                        <TableCell>{i+1}</TableCell>
                        <TableCell>{s.studentCode || '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{s.studentName}</TableCell>
                        <TableCell>{s.className || '—'}</TableCell>
                        <TableCell>
                          {(() => {
                            const locked = !!attData?.submitted;
                            const disabled = !withinExamWindow(attData) || attSaving || locked;
                            const current = s.status || 'PRESENT';
                            const opts = [
                              { value: 'PRESENT', label: 'Present', icon: <CheckCircleOutlinedIcon sx={{ fontSize: 18 }} />, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                              { value: 'ABSENT', label: 'Absent', icon: <CancelOutlinedIcon sx={{ fontSize: 18 }} />, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                              { value: 'LATE', label: 'Late', icon: <AccessTimeOutlinedIcon sx={{ fontSize: 18 }} />, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                              { value: 'EXCUSED', label: 'Excused', icon: <AssignmentLateOutlinedIcon sx={{ fontSize: 18 }} />, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                            ];
                            return (
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                {opts.map((o) => {
                                  const active = current === o.value;
                                  return (
                                    <Button
                                      key={o.value}
                                      size="small"
                                      variant={active ? 'contained' : 'outlined'}
                                      disabled={disabled}
                                      onClick={() => setAttData((prev) => ({ ...prev, students: prev.students.map((x) => x.studentId === s.studentId ? { ...x, status: o.value } : x) }))}
                                      startIcon={o.icon}
                                      sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        minWidth: 0,
                                        px: 1.25,
                                        py: 0.5,
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        color: active ? '#fff' : o.color,
                                        bgcolor: active ? o.color : o.bg,
                                        borderColor: active ? o.color : o.border,
                                        boxShadow: active ? `0 4px 12px ${o.color}33` : 'none',
                                        '&:hover': { bgcolor: active ? o.color : o.bg, borderColor: o.color },
                                        '&.Mui-disabled': { color: active ? '#fff' : '#94a3b8', bgcolor: active ? `${o.color}99` : '#f8fafc', borderColor: '#e2e8f0' },
                                      }}
                                    >
                                      {o.label}
                                    </Button>
                                  );
                                })}
                              </Stack>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!attData.students?.length ? <TableRow><TableCell colSpan={5} sx={{ py:3, textAlign:'center', color:'#64748b' }}>No students found for this room.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => !attSaving && setAttOpen(false)} sx={{ textTransform:'none' }}>Close</Button>
          <Button variant="contained" disabled={!attData || attLoading || attSaving || !withinExamWindow(attData) || !!attData?.submitted} onClick={() => void saveAttendance()} sx={{ textTransform:'none', bgcolor: attData?.submitted ? '#94a3b8' : NAVY }}>{attSaving ? 'Saving...' : (attData?.submitted ? 'Submitted' : 'Save Attendance')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

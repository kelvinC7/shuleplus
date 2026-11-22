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

function isPast(a) {
  const dk = toDateKey(a.examDate);
  const today = nowKey();
  if (dk < today) return true;
  if (dk > today) return false;
  // same day: afternoon is "later" than morning; treat as past if end time passed
  const end = a.endTime || (a.session === 'MORNING' ? '12:00' : '18:00');
  const [hh, mm] = String(end).split(':').map(Number);
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins > (Number(hh || 0) * 60 + Number(mm || 0));
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
    const slots = (timetable.slots || []).filter((sl) => toDateKey(sl.examDate) === dk && sl.session === a.session);
    const examsForRoom = slots.map((sl) => ({ courseName: sl.courseName, startTime: sl.startTime, endTime: sl.endTime, className: sl.className || null }));
    return { ...a, examCode, listCode, examName, year, term, roomStudents, invigilators: [...new Set(invigilators)], past, classAssigned, examsForRoom };
  }), [assignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((a) => [a.examCode,a.listCode,a.examName,a.roomName,a.year,a.term,toDateKey(a.examDate),a.session,...(a.invigilators||[]),...(a.classAssigned||[]),...(a.roomStudents||[]).map((s)=>`${s.studentName} ${s.studentCode||''} ${s.className||''}`)].join(' ').toLowerCase().includes(q));
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
      const key = `${a.examinationListId}|${a.roomId}|${toDateKey(a.examDate)}|${a.session}`;
      if (!map.has(key)) map.set(key, { key, examinationListId: a.examinationListId, roomId: a.roomId, roomName: a.roomName, examDate: toDateKey(a.examDate), session: a.session, startTime: a.startTime || '', endTime: a.endTime || '', examCode: a.examCode, listCode: a.listCode });
    }
    return [...map.values()].sort((a,b)=>a.examDate.localeCompare(b.examDate)||a.session.localeCompare(b.session)||a.roomName.localeCompare(b.roomName));
  }, [enriched]);

  function exportAssignment(a) {
    const rows = [['No', 'Student ID', 'Student Name', 'Class']];
    (a.roomStudents || []).forEach((s, i) => rows.push([String(i + 1), s.studentCode || '—', s.studentName || '', s.className || '']));
    downloadCsv(`exam-list-${a.listCode}-${a.roomName}-${toDateKey(a.examDate)}-${a.session}.csv`, rows);
  }

  async function downloadAssignmentPdf(a) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40; const pageWidth = doc.internal.pageSize.getWidth(); let y = 44;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('Examination Room List', margin, y); y += 20;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const lines = [`Examination: ${a.examName}`, `Examination Code: ${a.examCode}   Examination List Code: ${a.listCode}`, `Academic Year / Term: ${a.year} ${a.term}`, `Date / Session: ${fmtDate(a.examDate)}  ${a.session}${a.startTime || a.endTime ? ` (${a.startTime || ''} - ${a.endTime || ''})` : ''}`, `Room: ${a.roomName}${a.roomNumber ? ` (${a.roomNumber})` : ''}`, `Class(es): ${(a.classAssigned||[]).join(', ') || '—'}`, `Invigilator(s): ${(a.invigilators || []).join(', ') || '—'}`, `Total Students: ${(a.roomStudents || []).length}`];
    for (const line of lines) { const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2); doc.text(wrapped, margin, y); y += wrapped.length * 14; }
    y += 8; doc.setFont('helvetica', 'bold');
    const cols = [margin, margin + 36, margin + 130, margin + 360];
    ['No.','Student ID','Student Name','Class'].forEach((h,i)=>doc.text(h,cols[i],y)); y+=8; doc.setDrawColor(200); doc.line(margin,y,pageWidth-margin,y); y+=14; doc.setFont('helvetica','normal');
    const students = a.roomStudents || [];
    if (!students.length) doc.text('No students allocated to this room.', margin, y);
    else for (let i=0;i<students.length;i++){ const st=students[i]; if(y>doc.internal.pageSize.getHeight()-50){doc.addPage(); y=44;} const row=[String(i+1), String(st.studentCode||'—'), String(st.studentName||''), String(st.className||'—')]; const nameWrapped=doc.splitTextToSize(row[2], cols[3]-cols[2]-8); const classWrapped=doc.splitTextToSize(row[3], pageWidth-margin-cols[3]); doc.text(row[0],cols[0],y); doc.text(row[1],cols[1],y); doc.text(nameWrapped,cols[2],y); doc.text(classWrapped,cols[3],y); y+=Math.max(nameWrapped.length,classWrapped.length,1)*14; }
    doc.save(`exam-list-${String(a.listCode||'list').replace(/[^a-z0-9_-]+/gi,'_')}-${String(a.roomName||'room').replace(/[^a-z0-9_-]+/gi,'_')}-${toDateKey(a.examDate)}-${a.session}.pdf`);
  }

  function printAssignment(a) {
    const studentRows = (a.roomStudents || []).map((s, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(s.studentCode || '—')}</td><td>${escapeHtml(s.studentName || '')}</td><td>${escapeHtml(s.className || '')}</td></tr>`).join('');
    const body = `<h1>Examination Room List</h1><div class="meta"><b>Examination:</b> ${escapeHtml(a.examName)}<br/><b>Examination Code:</b> ${escapeHtml(a.examCode)} &nbsp; <b>Examination List Code:</b> ${escapeHtml(a.listCode)}<br/><b>Academic Year / Term:</b> ${escapeHtml(a.year)} ${escapeHtml(a.term)}<br/><b>Date / Session:</b> ${escapeHtml(fmtDate(a.examDate))} · ${escapeHtml(a.session)} ${a.startTime || a.endTime ? `(${escapeHtml(a.startTime || '')} - ${escapeHtml(a.endTime || '')})` : ''}<br/><b>Room:</b> ${escapeHtml(a.roomName)}${a.roomNumber ? ` (${escapeHtml(a.roomNumber)})` : ''}<br/><b>Class(es):</b> ${escapeHtml((a.classAssigned||[]).join(', ') || '—')}<br/><b>Invigilator(s):</b> ${escapeHtml((a.invigilators || []).join(', ') || '—')}<br/><b>Total Students:</b> ${(a.roomStudents || []).length}</div><table><thead><tr><th style="width:48px">No.</th><th>Student ID</th><th>Student Name</th><th>Class</th></tr></thead><tbody>${studentRows || '<tr><td colspan="4">No students allocated to this room.</td></tr>'}</tbody></table>`;
    printHtml(`Examination List - ${a.roomName}`, body);
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
      const data = await fetchExaminationAttendance({ examinationListId: opt.examinationListId, roomId: opt.roomId, examDate: opt.examDate, session: opt.session });
      const students = (data?.students || []).map((s) => ({ ...s, status: s.status || 'PRESENT' }));
      setAttData({ ...data, students });
    } catch (e) {
      setAttError(e?.response?.data?.message || e?.message || 'Failed to load attendance');
    } finally { setAttLoading(false); }
  }

  async function saveAttendance() {
    if (!attData) return;
    setAttSaving(true); setAttError('');
    try {
      const payload = { examinationListId: attData.examinationListId, roomId: attData.roomId, examDate: attData.examDate, session: attData.session, records: (attData.students || []).map((s) => ({ studentId: s.studentId, status: s.status || 'PRESENT', notes: s.notes || '' })) };
      const saved = await markExaminationAttendance(payload);
      setAttData(saved);
    } catch (e) {
      setAttError(e?.response?.data?.message || e?.message || 'Failed to save attendance');
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
                          <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{fmtDate(a.examDate)}</Typography><Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{a.session}{a.startTime||a.endTime?` · ${a.startTime||''}-${a.endTime||''}`:''}</Typography></TableCell>
                          <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.examName}</Typography><Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{a.examCode} / {a.listCode}</Typography></TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{a.roomName}{a.roomNumber?` (${a.roomNumber})`:''}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{(a.classAssigned||[]).join(', ') || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', maxWidth: 220 }}>{(a.examsForRoom||[]).length ? (a.examsForRoom||[]).map((e)=>e.courseName).join(', ') : <span style={{color:'#94a3b8'}}>See timetable</span>}</TableCell>
                          <TableCell>{(a.roomStudents||[]).length}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{(a.invigilators||[]).join(', ') || '—'}</TableCell>
                          <TableCell><Chip size="small" color={a.past ? 'default' : 'success'} label={a.past ? 'Completed' : 'Upcoming'} /></TableCell>
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
                  {attendanceOptions.map((o) => <MenuItem key={o.key} value={o.key}>{fmtDate(o.examDate)} · {o.session} · {o.roomName} · {o.examCode}/{o.listCode}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" disabled={!attRoomKey} onClick={() => { const opt = attendanceOptions.find((o)=>o.key===attRoomKey); if(opt) openAttendance(opt); }} sx={{ textTransform:'none', bgcolor:NAVY }}>Open Attendance</Button>
            </Stack>
          </Paper>
        ) : null}
      </Stack>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 }, width: '100%', m: { xs: 1, sm: 2 } } }}>
        <DialogTitle sx={{ pr: 6 }}>
          <Typography sx={{ fontWeight: 800, color: NAVY }}>Examination Room Details</Typography>
          {selected ? <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{selected.examName} · {selected.roomName} · {fmtDate(selected.examDate)} {selected.session}</Typography> : null}
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
                  <Typography sx={{ fontSize: '0.85rem' }}><b>Date / Session:</b> {fmtDate(selected.examDate)} · {selected.session}{selected.startTime || selected.endTime ? ` (${selected.startTime || ''}-${selected.endTime || ''})` : ''}</Typography>
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
                const allSlots = allTimetableSlots.filter((sl) => toDateKey(sl.examDate) === dk && sl.session === selected.session);
                const rootSlots = (selected.slots || []).filter((sl) => toDateKey(sl.examDate) === dk && sl.session === selected.session);
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
                let rowNo = 0;
                return (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, overflowX: 'auto' }}>
                    <Table size="small" stickyHeader sx={{ minWidth: { xs: 520, sm: 700 } }}>
                      <TableHead><TableRow>{['No.','Student ID','Student Name','Class','Exam / Course'].map((h)=><TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {groups.length ? groups.flatMap((g) => g.students.map((st, si) => {
                          rowNo += 1;
                          return (
                            <TableRow key={st.id || `${g.className}-${si}`} hover>
                              <TableCell>{rowNo}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{st.studentCode || '—'}</TableCell>
                              <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>{st.studentName}</TableCell>
                              {si === 0 ? <TableCell rowSpan={g.students.length} sx={{ fontWeight: 700, color: NAVY, bgcolor: '#f8fafc', verticalAlign: 'top', minWidth: 120 }}>{g.className}</TableCell> : null}
                              {si === 0 ? <TableCell rowSpan={g.students.length} sx={{ fontWeight: 600, color: '#334155', bgcolor: '#f8fafc', verticalAlign: 'top', minWidth: 160 }}>{g.exam}</TableCell> : null}
                            </TableRow>
                          );
                        })) : <TableRow><TableCell colSpan={5} sx={{ color: '#64748b', textAlign: 'center', py: 3 }}>No students allocated to this room.</TableCell></TableRow>}
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
          {attData ? <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{attData.roomName} · {fmtDate(attData.examDate)} · {attData.session} ({attData.startTime}-{attData.endTime})</Typography> : null}
          <IconButton onClick={() => !attSaving && setAttOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {attLoading ? <Box sx={{ py: 4, display:'grid', placeItems:'center' }}><CircularProgress /></Box> : null}
          {attError ? <Alert severity="error" sx={{ mb: 2 }}>{attError}</Alert> : null}
          {attData ? (
            <Stack spacing={2}>
              <Alert severity={withinExamWindow(attData) ? 'success' : 'warning'}>
                {withinExamWindow(attData) ? 'You can mark attendance now (within exam time window).' : `Attendance is allowed only during exam time: ${attData.examDate} ${attData.startTime}-${attData.endTime}. Current time is outside this window.`}
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
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select value={s.status || 'PRESENT'} onChange={(e)=>setAttData((prev)=>({ ...prev, students: prev.students.map((x)=>x.studentId===s.studentId?{...x,status:e.target.value}:x) }))} disabled={!withinExamWindow(attData) || attSaving}>
                              <MenuItem value="PRESENT">Present</MenuItem>
                              <MenuItem value="ABSENT">Absent</MenuItem>
                              <MenuItem value="LATE">Late</MenuItem>
                              <MenuItem value="EXCUSED">Excused</MenuItem>
                            </Select>
                          </FormControl>
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
          <Button variant="contained" disabled={!attData || attLoading || attSaving || !withinExamWindow(attData)} onClick={() => void saveAttendance()} sx={{ textTransform:'none', bgcolor:NAVY }}>{attSaving ? 'Saving...' : 'Save Attendance'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

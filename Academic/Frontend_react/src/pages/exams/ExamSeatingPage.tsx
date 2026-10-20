import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, Menu, MenuItem,
  Select, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { examApiError, generateExamSeating, moveExamSeat } from '@/modules/exams/exam-api';
import { examLevels, uniqueSeats } from '@/modules/exams/exam-class';
import { downloadSeatingPdf } from '@/modules/exams/exam-pdf';
import { toast } from '@/lib/toast';
import type { ExamSeat, SeatingStrategy } from '@/modules/exams/exam-types';
import { AMBER, ExamToolbar, Kpi, NAVY, NeedSession } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';
import { useAuth } from '@/contexts/auth-context';

const TABS = [
  { label: 'Generate', path: '/exams/seating' },
  { label: 'Room layout', path: '/exams/seating/layout' },
  { label: 'Student seats', path: '/exams/seating/students' },
  { label: 'QR cards', path: '/exams/seating/cards' },
  { label: 'Conflicts', path: '/exams/seating/conflicts' },
  { label: 'Print', path: '/exams/seating/print' },
];

export default function ExamSeatingPage() {
  const workspace = useExamWorkspace();
  const { session, setSession } = workspace;
  const { summary } = useAuth();
  const schoolName = summary?.organizationName || 'School';
  const logoUrl = summary?.logoUrl;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = Math.max(0, TABS.findIndex((t) => t.path === pathname));
  const [strategy, setStrategy] = useState<SeatingStrategy>('ANTI_CHEAT');
  const [levelKey, setLevelKey] = useState('');
  const [roomName, setRoomName] = useState('');
  const [selected, setSelected] = useState<ExamSeat | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [targetSeat, setTargetSeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfEl, setPdfEl] = useState<null | HTMLElement>(null);

  const schedules = session?.schedules ?? [];
  const levels = useMemo(() => examLevels(schedules), [schedules]);
  const level = levels.find((p) => p.key === levelKey) ?? null;
  const levelIds = useMemo(() => new Set(level?.scheduleIds ?? schedules.map((s) => s.id)), [level, schedules]);
  const seats = useMemo(() => {
    const all = session?.seats?.length
      ? session.seats
      : schedules.flatMap((s) => (s.seats ?? []).map((seat) => ({ ...seat, scheduleId: s.id })));
    return uniqueSeats(all.filter((s) => levelIds.has(s.scheduleId)));
  }, [session, schedules, levelIds]);

  const sessionPlanned = levels.reduce((n, p) => n + p.studentCount, 0);
  const planned = level ? level.studentCount : sessionPlanned;
  const unassigned = Math.max(0, planned - seats.length);
  const rooms = level?.rooms?.length
    ? level.rooms
    : [...new Set((session?.rooms ?? []).map((r) => r.name).concat(schedules.flatMap((s) => (s.rooms ?? []).map((r) => r.name))))];
  const layoutRoom = roomName || rooms[0] || '';
  const layoutSeats = seats.filter((s) => s.roomName === layoutRoom);
  const cfg = (session?.rooms ?? []).find((r) => r.name === layoutRoom);
  const cols = cfg?.cols || 10;
  const rows = cfg?.rows || Math.max(5, Math.ceil((layoutSeats.length || 1) / cols));
  const seatingConflicts = session?.conflicts?.filter((c) => !c.resolved && c.type === 'SEATING') ?? [];

  async function generate() {
    if (!session) return;
    setBusy(true); setError('');
    try {
      setSession(await generateExamSeating(session.id, {
        strategy,
        scheduleIds: level?.scheduleIds,
      }));
    } catch (e) { setError(examApiError(e)); }
    finally { setBusy(false); }
  }

  async function printSeating(scope: 'room' | 'all') {
    if (!session) return;
    setPdfEl(null);
    try {
      await downloadSeatingPdf({
        session,
        schoolName,
        seats,
        examName: level ? level.level : undefined,
        roomName: scope === 'room' ? layoutRoom : undefined,
        logoUrl,
      });
      toast.success('Seating PDF downloaded');
    } catch (e) {
      const msg = examApiError(e) || 'Could not generate the seating PDF.';
      setError(msg);
      toast.error(msg);
    }
  }

  async function move(swap = false) {
    if (!session || !selected) return;
    setBusy(true); setError('');
    try {
      setSession(await moveExamSeat(session.id, { seatId: selected.id, roomName: selected.roomName, seatCode: targetSeat || selected.seatCode, swap }));
      setSwapOpen(false);
      setSelected(null);
    } catch (e) { setError(examApiError(e)); }
    finally { setBusy(false); }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <ExamToolbar
        workspace={workspace}
        extra={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Class</InputLabel>
              <Select label="Class" value={levelKey} onChange={(e) => { setLevelKey(e.target.value); setRoomName(''); }}>
                <MenuItem value="">All classes</MenuItem>
                {levels.map((p) => (
                  <MenuItem key={p.key} value={p.key}>{p.level}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button disabled={busy || !session} onClick={generate} startIcon={<AutoFixHighIcon />} sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#fdd067' } }}>Generate Seating</Button>
            <Button disabled={!session || !seats.length} startIcon={<DownloadIcon />} onClick={(e) => setPdfEl(e.currentTarget)} sx={{ textTransform: 'none', fontWeight: 800, color: NAVY }}>Download PDF</Button>
            <Button onClick={() => window.print()} startIcon={<PrintOutlinedIcon />} sx={{ textTransform: 'none' }}>Print all</Button>
          </Box>
        }
      />
      <Tabs value={tab < 0 ? 0 : tab} onChange={(_, v) => navigate(TABS[v].path)} sx={{ bgcolor: '#fff', px: 2 }}>
        {TABS.map((t) => <Tab key={t.path} label={t.label} />)}
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {!session ? <NeedSession /> : (
          <>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            {(tab <= 0) && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 2 }}>
                  <Kpi label="Planned students" value={planned} />
                  <Kpi label="Classes" value={levels.length} tone="#0f766e" />
                  <Kpi label="Rooms" value={(level?.rooms ?? session.rooms).length} tone="#7c3aed" />
                  <Kpi label="Seats assigned" value={seats.length} tone="#16a34a" />
                  <Kpi label="Unassigned" value={unassigned} tone="#d97706" />
                  <Kpi label="Ready" value={`${session.readinessScore}%`} tone="#0f766e" />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 0.9fr' }, gap: 2, alignItems: 'start' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: NAVY, mb: 0.5 }}>Choose a class</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1.5 }}>
                      Same class, same rooms, same seats until the examination ends. Subjects are not listed separately.
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      <Box
                        onClick={() => setLevelKey('')}
                        sx={{
                          p: 2, borderRadius: '16px', cursor: 'pointer', border: levelKey ? '1px solid #e2e8f0' : '2px solid #fcb038',
                          bgcolor: levelKey ? '#fff' : '#fff8eb',
                        }}
                      >
                        <Typography sx={{ fontWeight: 800, color: NAVY }}>All classes</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5 }}>
                          {levels.length} class{levels.length === 1 ? '' : 'es'} · {sessionPlanned} students
                        </Typography>
                      </Box>
                      {levels.map((p) => {
                        const active = p.key === levelKey;
                        return (
                          <Box
                            key={p.key}
                            onClick={() => { setLevelKey(p.key); setRoomName(''); }}
                            sx={{
                              p: 2, borderRadius: '16px', cursor: 'pointer', bgcolor: '#fff',
                              border: active ? '2px solid #fcb038' : '1px solid #e2e8f0',
                              boxShadow: active ? '0 8px 24px rgba(0,4,53,0.08)' : 'none',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.2rem' }}>{p.level}</Typography>
                              <Chip size="small" label={`${p.rooms.length} rooms`} sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 700 }} />
                            </Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#475569', mt: 0.75 }}>
                              {p.studentCount} students · {p.streams.length} stream{p.streams.length === 1 ? '' : 's'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', mt: 0.5 }}>{p.streams.join(', ')}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.rooms.join(', ') || 'Rooms from Create Examination'}</Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontWeight: 800, color: NAVY, mb: 0.5 }}>Generate seating</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 2 }}>
                      {level
                        ? `${level.level} — ${level.studentCount} students in ${level.rooms.length} rooms until the exam period ends.`
                        : `All classes — ${planned} students from Create Examination.`}
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Strategy</InputLabel>
                      <Select label="Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value as SeatingStrategy)}>
                        <MenuItem value="CLASS_TOGETHER">Class together — one class per room, then overflow</MenuItem>
                        <MenuItem value="MIXED">Mixed classes — fill each room to capacity from all streams</MenuItem>
                        <MenuItem value="ANTI_CHEAT">Anti-cheat — mix streams so classmates are not side by side</MenuItem>
                      </Select>
                    </FormControl>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Each room is filled up to the capacity you set on Create Examination, with unique seats (A1, A2, A3…). Class together keeps a class in the same room; Mixed and Anti-cheat share rooms across streams without repeating a seat.
                    </Alert>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={busy}
                      onClick={generate}
                      startIcon={<AutoFixHighIcon />}
                      sx={{ bgcolor: NAVY, textTransform: 'none', fontWeight: 800, py: 1.2, '&:hover': { bgcolor: '#0a0f4a' } }}
                    >
                      {level ? `Generate ${level.level} seating` : 'Generate all seating'}
                    </Button>
                  </Box>
                </Box>
              </>
            )}

            {pathname.endsWith('/layout') && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Select size="small" value={levelKey} displayEmpty onChange={(e) => { setLevelKey(e.target.value); setRoomName(''); }} sx={{ minWidth: 180 }}>
                    <MenuItem value="">All classes</MenuItem>
                    {levels.map((p) => <MenuItem key={p.key} value={p.key}>{p.level}</MenuItem>)}
                  </Select>
                  <Select size="small" value={layoutRoom} onChange={(e) => setRoomName(e.target.value)} sx={{ minWidth: 160 }}>
                    {rooms.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                  <Button
                    disabled={!seats.length}
                    startIcon={<DownloadIcon />}
                    onClick={(e) => setPdfEl(e.currentTarget)}
                    sx={{ textTransform: 'none', fontWeight: 800, color: NAVY, ml: 'auto' }}
                  >
                    Download PDF
                  </Button>
                </Box>
                <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'auto' }}>
                  <Typography sx={{ textAlign: 'center', fontWeight: 800, mb: 2, color: NAVY }}>
                    {layoutRoom} · {level?.level || 'All classes'}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 72px)`, gap: 0.75, justifyContent: 'center' }}>
                    {Array.from({ length: rows * cols }, (_, i) => {
                      const row = String.fromCharCode(65 + Math.floor(i / cols));
                      const col = (i % cols) + 1;
                      const code = `${row}${col}`;
                      const seat = layoutSeats.find((s) => s.seatCode === code);
                      return (
                        <Box
                          key={code}
                          onClick={() => seat && setSelected(seat)}
                          sx={{
                            height: 64, borderRadius: 1.5, border: '1px solid #e2e8f0', p: 0.5, cursor: seat ? 'pointer' : 'default',
                            bgcolor: seat ? '#000435' : '#f8fafc', color: seat ? '#fff' : '#94a3b8',
                          }}
                        >
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800 }}>{code}</Typography>
                          <Typography sx={{ fontSize: '0.62rem' }}>{seat?.fullName.split(' ')[0] ?? ''}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  <Typography sx={{ textAlign: 'center', mt: 2, fontSize: '0.75rem', color: '#94a3b8' }}>INVIGILATOR</Typography>
                </Box>
              </Box>
            )}

            {pathname.endsWith('/students') && (
              <Box sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'auto' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 90px 80px', px: 2, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Student', 'Class', 'Room', 'Seat', ''].map((h) => (
                    <Typography key={h} sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{h}</Typography>
                  ))}
                </Box>
                {seats.map((s) => (
                  <Box key={s.id} sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 90px 80px', px: 2, py: 1.1, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontWeight: 700 }}>{s.fullName}</Typography>
                    <Typography>{s.className}</Typography>
                    <Typography>{s.roomName}</Typography>
                    <Typography>{s.seatCode}</Typography>
                    <Button size="small" onClick={() => { setSelected(s); setTargetSeat(''); setSwapOpen(true); }} sx={{ textTransform: 'none' }}>Move</Button>
                  </Box>
                ))}
              </Box>
            )}

            {pathname.endsWith('/cards') && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
                {seats.slice(0, 60).map((s) => {
                  const payload = `EXAM|${session.id}|${s.scheduleId}|${s.studentCode}|${s.roomName}|${s.seatCode}`;
                  return (
                    <Box key={s.id} sx={{ p: 2, bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '0.7rem', letterSpacing: '0.12em', fontWeight: 800, color: '#94a3b8' }}>EXAMINATION SEATING</Typography>
                      <Typography sx={{ fontWeight: 800, color: NAVY, mt: 1 }}>{s.fullName}</Typography>
                      <Typography sx={{ fontSize: '0.8rem' }}>{s.className} · {s.studentCode}</Typography>
                      <Box component="img" alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(payload)}`} sx={{ width: 140, height: 140, my: 1 }} />
                      <Typography sx={{ fontWeight: 700 }}>{s.roomName} · Seat {s.seatCode}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {pathname.endsWith('/conflicts') && (
              seatingConflicts.length ? seatingConflicts.map((c) => (
                <Alert key={c.id} severity="warning" sx={{ mb: 1 }}>{c.message}</Alert>
              )) : <Alert severity="success">{seats.length} of {planned} planned seats assigned.</Alert>
            )}

            {pathname.endsWith('/print') && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.25rem' }}>Print seating plans</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {level ? level.level : 'All classes'} · {seats.length} students · {rooms.length} rooms
                    </Typography>
                  </Box>
                  <Button disabled={!seats.length} startIcon={<DownloadIcon />} onClick={(e) => setPdfEl(e.currentTarget)} sx={{ textTransform: 'none', fontWeight: 800, color: NAVY }}>
                    Download PDF
                  </Button>
                </Box>
                <Box className="print-area" sx={{ display: 'grid', gap: 2 }}>
                  {rooms.map((room) => {
                    const roomSeats = seats.filter((s) => s.roomName === room);
                    const cap = (session.rooms ?? []).find((r) => r.name === room)?.capacity;
                    return (
                      <Box key={room} sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <Box sx={{ px: 2.5, py: 1.5, bgcolor: NAVY, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 800, color: '#fff' }}>{room}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#fcb038', fontWeight: 700 }}>
                            {roomSeats.length} students{cap ? ` · Capacity ${cap}` : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '56px 1.6fr 1fr 80px', px: 2, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          {['No.', 'Student name', 'Class', 'Seat'].map((h) => (
                            <Typography key={h} sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{h}</Typography>
                          ))}
                        </Box>
                        {roomSeats.length ? roomSeats.map((s, i) => (
                          <Box key={s.id} sx={{ display: 'grid', gridTemplateColumns: '56px 1.6fr 1fr 80px', px: 2, py: 1.05, borderBottom: '1px solid #f1f5f9', bgcolor: i % 2 ? '#f8fafc' : '#fff' }}>
                            <Typography sx={{ fontWeight: 700, color: NAVY }}>{i + 1}</Typography>
                            <Box>
                              <Typography sx={{ fontWeight: 700 }}>{s.fullName}</Typography>
                              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.studentCode}</Typography>
                            </Box>
                            <Typography>{s.className}</Typography>
                            <Typography sx={{ fontWeight: 800, color: NAVY }}>{s.seatCode}</Typography>
                          </Box>
                        )) : (
                          <Typography sx={{ px: 2, py: 2, color: '#94a3b8' }}>No students seated in this room yet.</Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      <Dialog open={Boolean(selected) && pathname.endsWith('/layout')} onClose={() => setSelected(null)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Seat {selected?.seatCode}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 800 }}>{selected?.fullName}</Typography>
          <Typography>{selected?.className} · {selected?.studentCode}</Typography>
          <Typography sx={{ mt: 1 }}>{selected?.roomName} · {level?.level || 'Examination'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTargetSeat(''); setSwapOpen(true); }}>Move student</Button>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={pdfEl} open={Boolean(pdfEl)} onClose={() => setPdfEl(null)}>
        <MenuItem disabled={!layoutRoom} onClick={() => printSeating('room')}>
          Download this room{layoutRoom ? ` (${layoutRoom})` : ''}
        </MenuItem>
        <MenuItem onClick={() => printSeating('all')}>Download all rooms</MenuItem>
      </Menu>

      <Dialog open={swapOpen} onClose={() => setSwapOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Move {selected?.fullName}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="New seat code" placeholder="C4" value={targetSeat} onChange={(e) => setTargetSeat(e.target.value.toUpperCase())} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSwapOpen(false)}>Cancel</Button>
          <Button onClick={() => move(true)}>Swap if occupied</Button>
          <Button variant="contained" onClick={() => move(false)}>Move</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

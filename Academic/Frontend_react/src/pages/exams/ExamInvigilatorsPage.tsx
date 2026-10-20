import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel,
  InputLabel, LinearProgress, Menu, MenuItem, Select, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import {
  addInvigilatorStaff, checkInInvigilator, examApiError, fetchExamOrgUsers, fetchInvigilatorDirectory,
  generateInvigilators, replaceInvigilator, saveExamSetup, setRoomInvigilators,
} from '@/modules/exams/exam-api';
import { downloadInvigilatorPdf } from '@/modules/exams/exam-pdf';
import { toast } from '@/lib/toast';
import type { ExamDuty, ExamSession, InvigilatorSettings } from '@/modules/exams/exam-types';
import { AMBER, ExamToolbar, Kpi, NAVY, NeedSession, dateLabel, isoDate } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';
import { useAuth } from '@/contexts/auth-context';

const TABS = [
  { label: 'Directory', path: '/exams/invigilators' },
  { label: 'Assignments', path: '/exams/invigilators/assignments' },
  { label: 'Availability', path: '/exams/invigilators/availability' },
  { label: 'Duty schedule', path: '/exams/invigilators/schedule' },
  { label: 'Check-in', path: '/exams/invigilators/check-in' },
  { label: 'Reports', path: '/exams/invigilators/reports' },
];

type DirectoryRow = {
  id: string;
  name: string;
  subjects: string[];
  classes: string[];
  assigned: number;
  locked: number;
  checkedIn: number;
  email?: string | null;
  hasAccount?: boolean;
  source?: string;
};

function isPlaceholderInvigilator(person: { id?: string; invigilatorId?: string; name?: string; invigilatorName?: string }) {
  const id = person.invigilatorId ?? person.id ?? '';
  const name = (person.invigilatorName ?? person.name ?? '').trim();
  return id.startsWith('inv-extra') || /^invigilator\s*\d+$/i.test(name);
}

function peakInvigilatorNeed(session: ExamSession, perRoom: number) {
  const bySlot = new Map<string, Set<string>>();
  for (const s of session.schedules ?? []) {
    const k = `${isoDate(s.examDate)}|${s.slotCode}`;
    const set = bySlot.get(k) ?? new Set<string>();
    for (const room of s.rooms ?? []) set.add(room.name);
    bySlot.set(k, set);
  }
  let peakRooms = 0;
  for (const rooms of bySlot.values()) peakRooms = Math.max(peakRooms, rooms.size);
  return { peakRooms, needed: peakRooms * Math.max(1, perRoom) };
}

function dutyDetails(session: ExamSession, duty: ExamDuty) {
  const sch = session.schedules.find((s) => s.id === duty.scheduleId);
  const slot = (session.timeSlots ?? []).find((s) => s.code === duty.slotCode);
  return {
    course: sch?.subjectName || '—',
    className: sch?.className || '—',
    time: sch ? `${sch.startTime} – ${sch.endTime}` : slot ? `${slot.startTime} – ${slot.endTime}` : duty.slotCode,
    slotLabel: slot?.label || duty.slotCode,
  };
}

export default function ExamInvigilatorsPage() {
  const workspace = useExamWorkspace();
  const { session, setSession } = workspace;
  const { summary } = useAuth();
  const schoolName = summary?.organizationName || 'School';
  const logoUrl = summary?.logoUrl;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = Math.max(0, TABS.findIndex((t) => t.path === pathname));
  const [directory, setDirectory] = useState<DirectoryRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editDuty, setEditDuty] = useState<ExamDuty | null>(null);
  const [roomPicks, setRoomPicks] = useState<string[]>([]);
  const [lock, setLock] = useState(true);
  const [editError, setEditError] = useState('');
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [pdfEl, setPdfEl] = useState<null | HTMLElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [orgUsers, setOrgUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [addForm, setAddForm] = useState({ existingUserId: '', name: '', email: '', password: '' });
  const [addInfo, setAddInfo] = useState('');

  const settings = {
    assignmentMode: 'AUTO',
    dailyRotation: true,
    rotationFrequency: 'DAY',
    maxDutiesPerDay: 2,
    maxConsecutiveSessions: 2,
    minBreakSessions: 1,
    avoidSameRoom: true,
    balanceDuties: true,
    autoReplaceAbsent: true,
    avoidOwnClass: true,
    avoidOwnSubject: true,
    invigilatorsPerRoom: 2,
    lateGraceMinutes: 15,
    ...(session?.invigilatorSettings ?? {}),
  } as InvigilatorSettings;

  useEffect(() => {
    if (!session) return;
    fetchInvigilatorDirectory(session.id).then(setDirectory).catch(() => setDirectory([]));
  }, [session]);

  async function patchSettings(partial: Partial<InvigilatorSettings>) {
    if (!session) return;
    setBusy(true); setError('');
    try {
      setSession(await saveExamSetup(session.id, { invigilatorSettings: { ...settings, ...partial } }));
    } catch (e) { setError(examApiError(e)); }
    finally { setBusy(false); }
  }

  const namedDirectory = directory.filter((p) => !isPlaceholderInvigilator(p));
  const staffing = session ? peakInvigilatorNeed(session, settings.invigilatorsPerRoom) : { peakRooms: 0, needed: 0 };
  const shortfall = Math.max(0, staffing.needed - namedDirectory.length);

  async function generate(force = false) {
    if (!session) return;
    if (!force && shortfall > 0) {
      setConfirmGenerate(true);
      return;
    }
    setConfirmGenerate(false);
    setBusy(true); setError('');
    try {
      const result = await generateInvigilators(session.id);
      setSession(result.session);
      setDirectory(await fetchInvigilatorDirectory(session.id));
      if (result.advice?.length) toast.warning(result.advice[0]);
    } catch (e) { setError(examApiError(e)); }
    finally { setBusy(false); }
  }

  function openRoomEditor(duty: ExamDuty) {
    if (!session) return;
    const mates = session.duties.filter((d) =>
      d.scheduleId === duty.scheduleId
      && d.roomName === duty.roomName
      && d.slotCode === duty.slotCode
      && isoDate(d.examDate) === isoDate(duty.examDate)
      && !isPlaceholderInvigilator(d)
    );
    const ids = mates.map((d) => d.invigilatorId);
    const count = Math.max(ids.length, settings.invigilatorsPerRoom, 1);
    setEditDuty(duty);
    setRoomPicks([...ids, ...Array(Math.max(0, count - ids.length)).fill('')].slice(0, count));
    setLock(true);
    setEditError('');
  }

  const duties = (session?.duties ?? []).filter((d) => !isPlaceholderInvigilator(d));
  const placeholderCount = (session?.duties ?? []).filter((d) => isPlaceholderInvigilator(d)).length;
  const examDates = useMemo(() => [...new Set([
    ...(session?.days ?? []).map((d) => isoDate(d.date)),
    ...(session?.schedules ?? []).map((s) => isoDate(s.examDate)),
    ...duties.map((d) => isoDate(d.examDate)),
  ].filter(Boolean))].sort(), [session, duties]);
  const visibleDuties = dateFilter === 'ALL' ? duties : duties.filter((d) => isoDate(d.examDate) === dateFilter);
  const byDate = visibleDuties.reduce<Record<string, ExamDuty[]>>((acc, d) => {
    const key = isoDate(d.examDate);
    acc[key] = [...(acc[key] ?? []), d];
    return acc;
  }, {});
  const maxAssigned = Math.max(1, ...namedDirectory.map((d) => d.assigned), 1);

  async function printPdf(scope: 'day' | 'all') {
    if (!session) return;
    setPdfEl(null);
    try {
      await downloadInvigilatorPdf({
        session,
        schoolName,
        date: scope === 'day' && dateFilter !== 'ALL' ? dateFilter : undefined,
        logoUrl,
      });
      toast.success('Invigilator PDF downloaded');
    } catch (e) {
      const msg = examApiError(e) || 'Could not generate the invigilator PDF.';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <ExamToolbar
        workspace={workspace}
        extra={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Exam day</InputLabel>
              <Select label="Exam day" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <MenuItem value="ALL">All exam days</MenuItem>
                {examDates.map((d, i) => (
                  <MenuItem key={d} value={d}>Day {i + 1} · {dateLabel(d, { weekday: 'short', day: 'numeric', month: 'short' })}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button disabled={busy || !session} onClick={() => generate()} sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#fdd067' } }}>Generate invigilation plan</Button>
            <Button
              onClick={async () => {
                setAddOpen(true); setAddInfo('');
                try { setOrgUsers(await fetchExamOrgUsers()); } catch { setOrgUsers([]); }
              }}
              sx={{ textTransform: 'none', fontWeight: 800, color: NAVY }}
            >
              Add invigilator
            </Button>
            <Button disabled={!session || !duties.length} startIcon={<DownloadIcon />} onClick={(e) => setPdfEl(e.currentTarget)} sx={{ textTransform: 'none', fontWeight: 800, color: NAVY }}>Download PDF</Button>
          </Box>
        }
      />
      <Tabs value={tab} onChange={(_, v) => navigate(TABS[v].path)} sx={{ bgcolor: '#fff', px: 2 }}>
        {TABS.map((t) => <Tab key={t.path} label={t.label} />)}
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {!session ? <NeedSession /> : (
          <>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            {placeholderCount > 0 ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {placeholderCount} placeholder assignment{placeholderCount === 1 ? '' : 's'} (Invigilator 01…) are hidden. Generate again to assign teacher names.
              </Alert>
            ) : null}
            {(session?.schedules?.length ?? 0) > 0 && (shortfall > 0 || !namedDirectory.length) ? (
              <Alert severity={namedDirectory.length ? 'warning' : 'error'} sx={{ mb: 2 }}>
                Need <strong>{staffing.needed}</strong> named teacher{staffing.needed === 1 ? '' : 's'} for the busiest session
                ({staffing.peakRooms} room{staffing.peakRooms === 1 ? '' : 's'} × {settings.invigilatorsPerRoom} per room).
                You have <strong>{namedDirectory.length}</strong>.
                {shortfall > 0 ? ` Add ${shortfall} more invigilator${shortfall === 1 ? '' : 's'} first, or lower Invigilators per room.` : ''}
              </Alert>
            ) : null}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 2 }}>
              <Kpi label="Invigilators" value={namedDirectory.length} />
              <Kpi label="Assigned" value={namedDirectory.filter((d) => d.assigned > 0).length} tone="#16a34a" />
              <Kpi label="Unassigned" value={namedDirectory.filter((d) => d.assigned === 0).length} tone="#d97706" />
              <Kpi label="On duty" value={duties.filter((d) => d.checkedInAt).length} tone="#0f766e" />
              <Kpi label="Overrides" value={duties.filter((d) => d.locked || d.mode !== 'AUTO').length} />
              <Kpi label="Conflicts" value={session.conflicts.filter((c) => !c.resolved && c.type === 'INVIGILATOR').length} tone="#dc2626" />
            </Box>

            {(pathname === '/exams/invigilators' || pathname.endsWith('/assignments')) && (
              <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>Daily invigilator rotation</Typography>
                <FormControlLabel
                  control={<Switch checked={settings.dailyRotation && settings.assignmentMode === 'AUTO'} onChange={(e) => patchSettings({ dailyRotation: e.target.checked, assignmentMode: e.target.checked ? 'AUTO' : 'MANUAL' })} />}
                  label={settings.assignmentMode === 'AUTO' ? 'Automatic rotation ON' : 'Manual assignment'}
                />
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mb: 2 }}>Automatically rotate invigilators between examination rooms. Locked assignments are never replaced.</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <FormControl size="small"><InputLabel>Rotation frequency</InputLabel>
                    <Select label="Rotation frequency" value={settings.rotationFrequency} onChange={(e) => patchSettings({ rotationFrequency: e.target.value as InvigilatorSettings['rotationFrequency'] })}>
                      <MenuItem value="SESSION">Every exam session</MenuItem>
                      <MenuItem value="DAY">Every day</MenuItem>
                      <MenuItem value="TWO_DAYS">Every 2 days</MenuItem>
                      <MenuItem value="CUSTOM">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" type="number" label="Max duties / day" value={settings.maxDutiesPerDay} onChange={(e) => patchSettings({ maxDutiesPerDay: Number(e.target.value) || 1 })} />
                  <TextField size="small" type="number" label="Invigilators per room" value={settings.invigilatorsPerRoom} onChange={(e) => patchSettings({ invigilatorsPerRoom: Number(e.target.value) || 1 })} helperText="Default for Generate. Change on a room can set more." />
                  <TextField size="small" type="number" label="Max consecutive sessions" value={settings.maxConsecutiveSessions} onChange={(e) => patchSettings({ maxConsecutiveSessions: Number(e.target.value) || 1 })} />
                  <TextField size="small" type="number" label="Minimum break (sessions)" value={settings.minBreakSessions} onChange={(e) => patchSettings({ minBreakSessions: Number(e.target.value) || 0 })} />
                  <TextField size="small" type="number" label="Late grace (minutes)" value={settings.lateGraceMinutes} onChange={(e) => patchSettings({ lateGraceMinutes: Number(e.target.value) || 0 })} />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                  <FormControlLabel control={<Switch checked={settings.avoidSameRoom} onChange={(e) => patchSettings({ avoidSameRoom: e.target.checked })} />} label="Avoid same room consecutively" />
                  <FormControlLabel control={<Switch checked={settings.balanceDuties} onChange={(e) => patchSettings({ balanceDuties: e.target.checked })} />} label="Balance duties equally" />
                  <FormControlLabel control={<Switch checked={settings.avoidOwnClass} onChange={(e) => patchSettings({ avoidOwnClass: e.target.checked })} />} label="Avoid own class" />
                  <FormControlLabel control={<Switch checked={settings.avoidOwnSubject} onChange={(e) => patchSettings({ avoidOwnSubject: e.target.checked })} />} label="Avoid own subject" />
                  <FormControlLabel control={<Switch checked={settings.autoReplaceAbsent} onChange={(e) => patchSettings({ autoReplaceAbsent: e.target.checked })} />} label="Auto-replace absent" />
                </Box>
              </Box>
            )}

            {pathname === '/exams/invigilators' && namedDirectory.map((p) => (
              <Box key={p.id} sx={{ p: 2, mb: 1, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{p.subjects.join(', ') || 'General'} · {p.classes.join(', ') || 'Extra invigilator'}{p.email ? ` · ${p.email}` : ''}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip size="small" label={p.hasAccount ? 'Can login' : 'No login'} color={p.hasAccount ? 'success' : 'default'} />
                    <Chip size="small" label={`${p.assigned} duties`} />
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(100, (p.assigned / maxAssigned) * 100)} sx={{ mt: 1, height: 8, borderRadius: 99 }} />
              </Box>
            ))}

            {(pathname.endsWith('/assignments') || pathname.endsWith('/schedule')) && (
              Object.keys(byDate).length ? Object.entries(byDate).map(([date, rows]) => (
                <Box key={date} sx={{ mb: 2, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'auto' }}>
                  <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 800, color: NAVY }}>{dateLabel(date, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{rows.length} invigilators</Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 0.9fr 0.9fr 90px 100px 140px', px: 2, py: 0.75, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Invigilator', 'Course', 'Class', 'Time', 'Room', 'Status', ''].map((h) => (
                      <Typography key={h} sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</Typography>
                    ))}
                  </Box>
                  {rows.map((d) => {
                    const meta = dutyDetails(session, d);
                    return (
                      <Box key={d.id} sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 0.9fr 0.9fr 90px 100px 140px', px: 2, py: 1.1, borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{d.invigilatorName}</Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{meta.slotLabel}</Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700 }}>{meta.course}</Typography>
                        <Typography>{meta.className}</Typography>
                        <Typography sx={{ fontSize: '0.85rem' }}>{meta.time}</Typography>
                        <Typography>{d.roomName}</Typography>
                        <Chip size="small" label={d.locked ? 'Locked' : d.mode} color={d.locked ? 'warning' : 'default'} />
                        <Box>
                          <Button size="small" onClick={() => openRoomEditor(d)} sx={{ textTransform: 'none' }}>Change</Button>
                          <Button size="small" onClick={async () => { setSession(await replaceInvigilator(session.id, { dutyId: d.id })); }} sx={{ textTransform: 'none' }}>Replace</Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )) : (
                <Alert severity="info">No invigilator assignments for this day. Generate the invigilation plan or choose another day.</Alert>
              )
            )}

            {pathname.endsWith('/availability') && namedDirectory.map((p) => (
              <Box key={p.id} sx={{ px: 2, py: 1.2, bgcolor: '#fff', mb: 0.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
                <Typography sx={{ color: '#16a34a', fontWeight: 700 }}>{p.assigned ? `${p.assigned} duties` : 'Available'}</Typography>
              </Box>
            ))}

            {pathname.endsWith('/check-in') && visibleDuties.map((d) => {
              const meta = dutyDetails(session, d);
              return (
                <Box key={d.id} sx={{ px: 2, py: 1.2, bgcolor: '#fff', mb: 0.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{d.invigilatorName}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{meta.course} · {meta.className} · {d.roomName} · {dateLabel(d.examDate)} · {meta.time}</Typography>
                  </Box>
                  {d.checkedInAt ? <Chip color="success" label={`Checked in ${new Date(d.checkedInAt).toLocaleTimeString()}`} /> : (
                    <Button size="small" onClick={async () => setSession(await checkInInvigilator(session.id, { dutyId: d.id, method: 'MANUAL' }))} sx={{ textTransform: 'none' }}>Check in</Button>
                  )}
                </Box>
              );
            })}

            {pathname.endsWith('/reports') && visibleDuties.map((d) => {
              const meta = dutyDetails(session, d);
              return (
                <Typography key={d.id} sx={{ py: 0.5 }}>{dateLabel(d.examDate)} · {d.invigilatorName} · {meta.course} · {meta.className} · {meta.time} · {d.roomName} · {d.mode}{d.locked ? ' · locked' : ''}</Typography>
              );
            })}
          </>
        )}
      </Box>

      <Dialog open={Boolean(editDuty)} onClose={() => setEditDuty(null)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Room invigilators</DialogTitle>
        <DialogContent>
          {editDuty && session ? (
            <>
              <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 2 }}>
                {dutyDetails(session, editDuty).course} · {dutyDetails(session, editDuty).className} · {editDuty.roomName} · {dutyDetails(session, editDuty).time}
              </Typography>
              <TextField
                size="small"
                type="number"
                fullWidth
                label="Invigilators for this room"
                helperText={`Default is ${settings.invigilatorsPerRoom} per room. This room can have more (up to 8).`}
                value={roomPicks.length}
                inputProps={{ min: 1, max: 8 }}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(8, Number(e.target.value) || 1));
                  setRoomPicks((prev) => {
                    const next = prev.slice(0, n);
                    while (next.length < n) next.push('');
                    return next;
                  });
                }}
              />
              {!namedDirectory.length ? (
                <Alert severity="error" sx={{ mt: 2 }}>No teachers in the invigilator list. Add invigilators first.</Alert>
              ) : roomPicks.map((value, idx) => {
                const clash = namedDirectory.find((p) => p.id === value) && session.duties.find((d) =>
                  d.invigilatorId === value
                  && isoDate(d.examDate) === isoDate(editDuty.examDate)
                  && d.slotCode === editDuty.slotCode
                  && d.roomName !== editDuty.roomName
                );
                return (
                  <FormControl fullWidth key={idx} sx={{ mt: 2 }}>
                    <InputLabel>Invigilator {idx + 1}</InputLabel>
                    <Select
                      label={`Invigilator ${idx + 1}`}
                      value={value}
                      onChange={(e) => setRoomPicks((prev) => prev.map((id, i) => (i === idx ? e.target.value : id)))}
                    >
                      <MenuItem value="">Select teacher</MenuItem>
                      {namedDirectory.map((p) => {
                        const busy = session.duties.find((d) =>
                          d.invigilatorId === p.id
                          && isoDate(d.examDate) === isoDate(editDuty.examDate)
                          && d.slotCode === editDuty.slotCode
                          && d.roomName !== editDuty.roomName
                        );
                        const takenHere = roomPicks.some((id, i) => i !== idx && id === p.id);
                        return (
                          <MenuItem key={p.id} value={p.id} disabled={Boolean(busy) || takenHere}>
                            {p.name}{busy ? ` · already in ${busy.roomName}` : takenHere ? ' · already selected' : ''}
                          </MenuItem>
                        );
                      })}
                    </Select>
                    {clash ? <Typography sx={{ fontSize: '0.75rem', color: '#b45309', mt: 0.5 }}>{namedDirectory.find((p) => p.id === value)?.name} is already in {clash.roomName} at this time</Typography> : null}
                  </FormControl>
                );
              })}
              <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={lock} onChange={(e) => setLock(e.target.checked)} />} label="Lock assignment (rotation will not replace)" />
              {lock ? <Alert severity="warning" sx={{ mt: 1 }}>Manual override applied. Automatic rotation will not replace this assignment while locked.</Alert> : null}
              {editError ? <Alert severity="error" sx={{ mt: 1 }}>{editError}</Alert> : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDuty(null)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !namedDirectory.length} onClick={async () => {
            if (!session || !editDuty) return;
            const ids = roomPicks.map((id) => id.trim()).filter(Boolean);
            if (!ids.length) { setEditError('Select at least one teacher for this room'); return; }
            if (new Set(ids).size !== ids.length) { setEditError('Each teacher on this room must be different'); return; }
            setBusy(true); setEditError('');
            try {
              setSession(await setRoomInvigilators(session.id, {
                scheduleId: editDuty.scheduleId || session.schedules[0]?.id,
                roomName: editDuty.roomName,
                invigilatorIds: ids,
                lock,
              }));
              setDirectory(await fetchInvigilatorDirectory(session.id));
              setEditDuty(null);
            } catch (e) {
              setEditError(examApiError(e));
            } finally { setBusy(false); }
          }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmGenerate} onClose={() => setConfirmGenerate(false)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Not enough named teachers</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Need <strong>{staffing.needed}</strong> teacher{staffing.needed === 1 ? '' : 's'} for the busiest session
            ({staffing.peakRooms} room{staffing.peakRooms === 1 ? '' : 's'} × {settings.invigilatorsPerRoom} per room).
            You have <strong>{namedDirectory.length}</strong>.
          </Typography>
          <Alert severity="warning">
            Add {shortfall} more invigilator{shortfall === 1 ? '' : 's'}, or lower Invigilators per room. You can still generate — uncovered rooms will stay empty until you add people.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmGenerate(false)}>Cancel</Button>
          <Button onClick={async () => {
            setConfirmGenerate(false);
            setAddOpen(true); setAddInfo('');
            try { setOrgUsers(await fetchExamOrgUsers()); } catch { setOrgUsers([]); }
          }}>Add invigilator</Button>
          <Button variant="contained" onClick={() => generate(true)}>Generate anyway</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Add invigilator</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 2 }}>
            Teachers from Timetable are already in the pool and use Teacher Portal → Examinations. Add another invigilator so they get an Academic desk login for assigned rooms and attendance.
          </Typography>
          {addInfo ? <Alert severity="success" sx={{ mb: 2 }}>{addInfo}</Alert> : null}
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Existing organization user</InputLabel>
            <Select
              label="Existing organization user"
              value={addForm.existingUserId}
              onChange={(e) => {
                const id = e.target.value;
                const u = orgUsers.find((x) => x.id === id);
                setAddForm((f) => ({ ...f, existingUserId: id, name: u?.name || f.name, email: u?.email || f.email }));
              }}
            >
              <MenuItem value="">New invigilator (create login)</MenuItem>
              {orgUsers.map((u) => <MenuItem key={u.id} value={u.id}>{u.name} · {u.email}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth sx={{ mb: 2 }} label="Full name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField fullWidth sx={{ mb: 2 }} label="Login email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
          {!addForm.existingUserId ? (
            <TextField fullWidth type="password" label="Temporary password" helperText="Min 8 characters, upper, lower, number and special character" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} />
          ) : (
            <Alert severity="info">This person already has an account. Teachers keep Teacher Portal. Extra invigilators open the Academic invigilator desk after login.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Close</Button>
          <Button variant="contained" disabled={busy} onClick={async () => {
            if (!session) return;
            setBusy(true); setError(''); setAddInfo('');
            try {
              const result = await addInvigilatorStaff({
                name: addForm.name,
                email: addForm.email || undefined,
                password: addForm.password || undefined,
                existingUserId: addForm.existingUserId || undefined,
              });
              setDirectory(await fetchInvigilatorDirectory(session.id));
              setAddInfo(result.account?.created
                ? `Login created for ${result.account.email}. They sign in and open the Academic invigilator desk for assigned rooms and attendance.`
                : `Linked ${addForm.name}. Teachers use Teacher Portal → Examinations; extra invigilators use the Academic desk.`);
              setAddForm({ existingUserId: '', name: '', email: '', password: '' });
            } catch (e) { setError(examApiError(e)); }
            finally { setBusy(false); }
          }}>Save invigilator</Button>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={pdfEl} open={Boolean(pdfEl)} onClose={() => setPdfEl(null)}>
        <MenuItem disabled={dateFilter === 'ALL'} onClick={() => printPdf('day')}>
          Download this day{dateFilter !== 'ALL' ? ` (${dateLabel(dateFilter, { weekday: 'short', day: 'numeric', month: 'short' })})` : ''}
        </MenuItem>
        <MenuItem onClick={() => printPdf('all')}>Download all exam days</MenuItem>
      </Menu>
    </Box>
  );
}

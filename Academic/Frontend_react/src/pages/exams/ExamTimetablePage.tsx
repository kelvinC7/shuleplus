import { useMemo, useState, type CSSProperties } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel,
  Menu, MenuItem, Select, Tab, Tabs, Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DownloadIcon from '@mui/icons-material/Download';
import {
  examApiError, generateExamTimetable, generateInvigilators, generateExamSeating, moveExamSchedule, publishExamSession,
  rescheduleExam, resolveAllExamConflicts, resolveExamConflict, updateExamStatus,
} from '@/modules/exams/exam-api';
import { classLevelOf, streamsForLevel, uniqueLevels } from '@/modules/exams/exam-class';
import { downloadExamPdf, type ExamPdfKind } from '@/modules/exams/exam-pdf';
import { toast } from '@/lib/toast';
import { AMBER, ExamToolbar, Kpi, NAVY, NeedSession, ReadinessBar, dateLabel, isoDate } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';
import { useAuth } from '@/contexts/auth-context';
import type { ExamSchedule } from '@/modules/exams/exam-types';

export default function ExamTimetablePage() {
  const workspace = useExamWorkspace();
  const { session, reloadSession, setSession } = workspace;
  const { summary } = useAuth();
  const schoolName = summary?.organizationName || 'School';
  const logoUrl = summary?.logoUrl;
  const [tab, setTab] = useState(0);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [pdfEl, setPdfEl] = useState<null | HTMLElement>(null);
  const [advice, setAdvice] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);

  const schedules = session?.schedules ?? [];
  const slots = session?.timeSlots ?? [];
  const conflicts = session?.conflicts?.filter((c) => !c.resolved) ?? [];
  const levels = uniqueLevels(schedules);
  const days = [...new Set(schedules.map((s) => isoDate(s.examDate)))].sort();

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      const level = classLevelOf(s.className);
      if (levelFilter !== 'ALL' && level !== levelFilter) return false;
      if (streamFilter !== 'ALL' && s.className !== streamFilter) return false;
      if (dateFilter !== 'ALL' && isoDate(s.examDate) !== dateFilter) return false;
      if (courseFilter !== 'ALL' && s.subjectName !== courseFilter) return false;
      if (roomFilter !== 'ALL' && !(s.rooms ?? []).some((r) => r.name === roomFilter)) return false;
      return true;
    });
  }, [schedules, levelFilter, streamFilter, dateFilter, courseFilter, roomFilter]);

  const streamNames = levelFilter === 'ALL'
    ? [...new Set(schedules.map((s) => s.className))].sort()
    : streamsForLevel(schedules, levelFilter);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); await reloadSession(); }
    catch (e) { setError(examApiError(e)); }
    finally { setBusy(false); }
  }

  async function onDrop(date: string, slotCode: string, scheduleId: string) {
    if (!session) return;
    try {
      setSession(await moveExamSchedule(session.id, { scheduleId, examDate: date, slotCode }));
    } catch (e) {
      setError(examApiError(e));
    }
  }

  async function printPdf(kind: ExamPdfKind) {
    if (!session) return;
    setPdfEl(null);
    const level = kind === 'class' ? (levelFilter === 'ALL' ? levels[0] : levelFilter) : undefined;
    const rows = kind === 'class' && level
      ? schedules.filter((s) => classLevelOf(s.className) === level)
      : kind === 'current' ? filtered : schedules;
    try {
      await downloadExamPdf({ kind, session, schoolName, rows, level, logoUrl });
      toast.success('PDF downloaded');
    } catch (e) {
      const msg = examApiError(e) || 'Could not download the PDF.';
      setError(msg);
      toast.error(msg);
    }
  }

  const roomView = useMemo(() => {
    const map = new Map<string, Array<ExamSchedule & { roomName: string }>>();
    for (const s of filtered) {
      for (const room of s.rooms ?? []) {
        if (roomFilter !== 'ALL' && room.name !== roomFilter) continue;
        map.set(room.name, [...(map.get(room.name) ?? []), { ...s, roomName: room.name }]);
      }
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, roomFilter]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <ExamToolbar
        workspace={workspace}
        extra={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button disabled={busy || !session} startIcon={<AutoAwesomeIcon />} onClick={() => run(async () => session && setSession(await generateExamTimetable(session.id)))} sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#fdd067' } }}>
              Generate Smart Timetable
            </Button>
            <Button disabled={busy || !session} onClick={() => run(async () => {
              if (!session) return;
              const result = await generateInvigilators(session.id);
              setSession(result.session);
            })} sx={{ textTransform: 'none' }}>Invigilators</Button>
            <Button disabled={busy || !session || !conflicts.length} onClick={() => run(async () => {
              if (!session) return;
              const result = await resolveAllExamConflicts(session.id);
              setSession(result.session);
              setActions(result.remaining ? result.actions ?? [] : []);
              setAdvice(result.remaining ? result.advice ?? [] : []);
              setTab(3);
            })} sx={{ textTransform: 'none', fontWeight: 800, color: NAVY }}>Solve all conflicts</Button>
            <Button disabled={busy || !session} onClick={() => run(async () => session && setSession(await generateExamSeating(session.id, { strategy: 'ANTI_CHEAT' })))} sx={{ textTransform: 'none' }}>Seating</Button>
            <Button disabled={!session || !filtered.length} startIcon={<DownloadIcon />} onClick={(e) => setPdfEl(e.currentTarget)} sx={{ textTransform: 'none', fontWeight: 800, color: NAVY }}>Download PDF</Button>
            <Button disabled={busy || !session || session.status === 'PUBLISHED'} onClick={() => setConfirm('publish')} sx={{ textTransform: 'none', fontWeight: 700 }}>Publish</Button>
          </Box>
        }
      />
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {!session ? <NeedSession /> : (
          <>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 2 }}>
              <Kpi label="Exams" value={schedules.length} />
              <Kpi label="Class levels" value={levels.length} tone="#0f766e" />
              <Kpi label="Rooms" value={session.rooms.length} tone="#7c3aed" />
              <Kpi label="Days" value={days.length} tone="#d97706" />
              <Kpi label="Scheduled" value={schedules.filter((s) => s.status !== 'CANCELLED').length} tone="#16a34a" />
              <Kpi label="Conflicts" value={conflicts.length} tone={conflicts.length ? '#dc2626' : '#059669'} />
            </Box>
            <Box sx={{ mb: 2 }}><ReadinessBar session={session} /></Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {['DRAFT', 'REVIEWED', 'APPROVED'].map((st) => (
                <Button key={st} size="small" variant={session.status === st ? 'contained' : 'outlined'} disabled={busy} onClick={() => run(async () => setSession(await updateExamStatus(session.id, st)))} sx={{ textTransform: 'none' }}>{st}</Button>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.25, mb: 2, flexWrap: 'wrap', p: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Class</InputLabel>
                <Select label="Class" value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setStreamFilter('ALL'); }}>
                  <MenuItem value="ALL">All classes</MenuItem>
                  {levels.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Stream</InputLabel>
                <Select label="Stream" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                  <MenuItem value="ALL">All streams</MenuItem>
                  {streamNames.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Date</InputLabel>
                <Select label="Date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <MenuItem value="ALL">All dates</MenuItem>
                  {days.map((d) => <MenuItem key={d} value={d}>{dateLabel(d)}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Course</InputLabel>
                <Select label="Course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                  <MenuItem value="ALL">All courses</MenuItem>
                  {[...new Set(schedules.map((s) => s.subjectName))].sort().map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Room</InputLabel>
                <Select label="Room" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                  <MenuItem value="ALL">All rooms</MenuItem>
                  {(session.rooms ?? []).map((r) => <MenuItem key={r.name} value={r.name}>{r.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, bgcolor: '#fff', borderRadius: 2 }}>
              <Tab label="Grid" />
              <Tab label="Streams" />
              <Tab label="Rooms" />
              <Tab label={`Conflicts (${conflicts.length})`} />
            </Tabs>

            {tab === 0 && (
              <Box sx={{ overflow: 'auto', bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <LevelGrid sessionDays={days} slots={slots} schedules={filtered} levels={levelFilter === 'ALL' ? levels : [levelFilter]} onDrop={onDrop} onReschedule={(s) => run(async () => {
                  const result = await rescheduleExam(session.id, { scheduleId: s.id });
                  setSession(result.session);
                })} />
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                {(levelFilter === 'ALL' ? levels : [levelFilter]).map((level) => {
                  const streams = streamsForLevel(filtered.length ? filtered : schedules, level);
                  return (
                    <Box key={level} sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem' }}>{level}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1.5 }}>
                        {streams.join(', ') || level} share the same examination dates, courses and times. Rooms and seating may differ.
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {streams.map((name) => {
                          const room = (filtered.find((s) => s.className === name)?.rooms ?? []).map((r) => r.name).join(', ');
                          return <Chip key={name} label={`${name}${room ? ` · ${room}` : ''}`} sx={{ fontWeight: 700 }} />;
                        })}
                      </Box>
                      <LevelGrid
                        sessionDays={[...new Set((filtered.length ? filtered : schedules).filter((s) => classLevelOf(s.className) === level).map((s) => isoDate(s.examDate)))].sort()}
                        slots={slots}
                        schedules={(filtered.length ? filtered : schedules).filter((s) => classLevelOf(s.className) === level)}
                        levels={[level]}
                        onDrop={onDrop}
                        compact
                      />
                      <Box sx={{ mt: 2, overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={th}>Course</th><th style={th}>Date</th><th style={th}>Time</th>
                              {streams.map((s) => <th key={s} style={th}>{s} room</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {[...new Set((filtered.length ? filtered : schedules).filter((s) => classLevelOf(s.className) === level).map((s) => s.subjectName))].map((subject) => {
                              const sample = schedules.find((s) => classLevelOf(s.className) === level && s.subjectName === subject);
                              return (
                                <tr key={subject}>
                                  <td style={td}>{subject}</td>
                                  <td style={td}>{dateLabel(sample?.examDate)}</td>
                                  <td style={td}>{sample ? `${sample.startTime}–${sample.endTime}` : '—'}</td>
                                  {streams.map((stream) => {
                                    const hit = schedules.find((s) => s.className === stream && s.subjectName === subject);
                                    return <td key={stream} style={td}>{(hit?.rooms ?? []).map((r) => r.name).join(', ') || '—'}</td>;
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {tab === 2 && (
              <Box>
                {roomView.map(([room, rows]) => (
                  <Box key={room} sx={{ mb: 2, p: 2, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                    <Typography sx={{ fontWeight: 800, mb: 1 }}>{room}</Typography>
                    {rows.sort((a, b) => isoDate(a.examDate).localeCompare(isoDate(b.examDate))).map((s) => (
                      <Typography key={s.id + s.roomName} sx={{ fontSize: '0.85rem', py: 0.4 }}>{dateLabel(s.examDate)} · {s.startTime}–{s.endTime} · {s.subjectName} — {s.className}</Typography>
                    ))}
                  </Box>
                ))}
              </Box>
            )}

            {tab === 3 && (
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 800, color: NAVY }}>{conflicts.length} open conflict{conflicts.length === 1 ? '' : 's'}</Typography>
                  <Button
                    disabled={busy || !conflicts.length}
                    variant="contained"
                    onClick={() => run(async () => {
                      const result = await resolveAllExamConflicts(session.id);
                      setSession(result.session);
                      setActions(result.remaining ? result.actions ?? [] : []);
                      setAdvice(result.remaining ? result.advice ?? [] : []);
                    })}
                    sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#fdd067' } }}
                  >
                    Solve all conflicts
                  </Button>
                </Box>
                {conflicts.length > 0 ? actions.map((a) => <Alert key={a} severity="info">{a}</Alert>) : null}
                {conflicts.length > 0 ? advice.map((a) => <Alert key={a} severity="warning">{a}</Alert>) : null}
                {conflicts.length === 0 ? <Alert severity="success">No open conflicts.</Alert> : conflicts.map((c) => (
                  <Box key={c.id} sx={{ p: 2, bgcolor: '#fff', borderRadius: 3, border: '1px solid #fecaca' }}>
                    <Chip size="small" color={c.severity === 'ERROR' ? 'error' : 'warning'} label={c.type} sx={{ mb: 1 }} />
                    <Typography sx={{ fontWeight: 700 }}>{c.message}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button size="small" onClick={() => run(async () => setSession(await resolveExamConflict(session.id, c.id)))}>Resolve</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>

      <Menu anchorEl={pdfEl} open={Boolean(pdfEl)} onClose={() => setPdfEl(null)}>
        <MenuItem onClick={() => printPdf('current')}>Download Current View</MenuItem>
        <MenuItem onClick={() => printPdf('class')}>Download Class Timetable</MenuItem>
        <MenuItem onClick={() => printPdf('all')}>Download All Classes</MenuItem>
        <MenuItem onClick={() => printPdf('rooms')}>Download Room Timetable</MenuItem>
        <MenuItem onClick={() => printPdf('complete')}>Download Complete Examination Timetable</MenuItem>
      </Menu>

      <Dialog open={confirm === 'publish'} onClose={() => setConfirm('')} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Publish timetable?</DialogTitle>
        <DialogContent>
          Students, parents and teachers will be able to see this timetable. Draft → Reviewed → Approved → Published.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm('')}>Cancel</Button>
          <Button onClick={() => { setConfirm(''); run(async () => session && setSession(await publishExamSession(session.id))); }}>Publish</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const th: CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e2e8f0' };
const td: CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #f1f5f9' };

function LevelGrid({
  sessionDays,
  slots,
  schedules,
  levels,
  onDrop,
  onReschedule,
  compact,
}: {
  sessionDays: string[];
  slots: Array<{ code: string; label: string; startTime: string; endTime: string }>;
  schedules: ExamSchedule[];
  levels: string[];
  onDrop: (date: string, slotCode: string, scheduleId: string) => void;
  onReschedule?: (s: ExamSchedule) => void;
  compact?: boolean;
}) {
  const days = sessionDays.length ? sessionDays : ['—'];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `150px 120px repeat(${Math.max(levels.length, 1)}, minmax(160px, 1fr))` }}>
      <Box sx={{ p: 1.5, fontWeight: 800, bgcolor: '#000435', color: '#fff' }}>Date</Box>
      <Box sx={{ p: 1.5, fontWeight: 800, bgcolor: '#000435', color: '#fff' }}>Time</Box>
      {levels.map((l) => <Box key={l} sx={{ p: 1.5, fontWeight: 800, bgcolor: '#000435', color: '#fff' }}>{l}</Box>)}
      {days.map((d) => (
        <Box key={d} sx={{ display: 'contents' }}>
          {slots.map((slot, i) => (
            <Box key={`${d}-${slot.code}`} sx={{ display: 'contents' }}>
              {i === 0 ? (
                <Box sx={{ p: 1.5, borderTop: '1px solid #e2e8f0', fontWeight: 800, alignSelf: 'stretch', bgcolor: '#f8fafc' }}>{d === '—' ? '—' : dateLabel(d, { weekday: 'long', day: 'numeric', month: 'short' })}</Box>
              ) : <Box sx={{ borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }} />}
              <Box sx={{ p: 1.5, borderTop: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>{slot.startTime}–{slot.endTime}</Box>
              {levels.map((level) => {
                const cell = schedules.filter((s) => classLevelOf(s.className) === level && isoDate(s.examDate) === d && s.slotCode === slot.code);
                const first = cell[0];
                return (
                  <Box
                    key={`${d}-${slot.code}-${level}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const sid = e.dataTransfer.getData('scheduleId');
                      if (sid) onDrop(d, slot.code, sid);
                    }}
                    sx={{ p: 1, minHeight: compact ? 56 : 88, borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #f1f5f9', bgcolor: first ? '#fff8eb' : '#fbfdff' }}
                  >
                    {first ? (
                      <Box
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('scheduleId', first.id)}
                        sx={{ p: 1, borderRadius: 2, bgcolor: NAVY, color: '#fff', cursor: 'grab' }}
                      >
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 800 }}>{first.subjectName}</Typography>
                        {!compact ? (
                          <Typography sx={{ fontSize: '0.68rem', opacity: 0.8 }}>
                            {streamsForLevel(cell, level).join(', ')}
                          </Typography>
                        ) : null}
                        {onReschedule ? (
                          <Button size="small" onClick={() => onReschedule(first)} sx={{ color: AMBER, textTransform: 'none', minWidth: 0, p: 0, fontSize: '0.65rem' }}>Reschedule</Button>
                        ) : null}
                      </Box>
                    ) : null}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

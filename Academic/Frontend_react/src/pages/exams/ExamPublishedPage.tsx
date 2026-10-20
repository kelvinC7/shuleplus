import { useMemo, useState } from 'react';
import { Alert, Box, Button, MenuItem, Select, Tab, Tabs, Typography } from '@mui/material';
import { ExamToolbar, NAVY, NeedSession, dateLabel, isoDate } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';

export default function ExamPublishedPage() {
  const workspace = useExamWorkspace();
  const { session } = workspace;
  const [tab, setTab] = useState(0);
  const [className, setClassName] = useState('ALL');
  const [roomName, setRoomName] = useState('ALL');
  const schedules = session?.schedules ?? [];
  const published = session?.status === 'PUBLISHED';

  const classView = useMemo(() => schedules.filter((s) => className === 'ALL' || s.className === className), [schedules, className]);
  const roomView = useMemo(() => {
    return schedules.flatMap((s) => (s.rooms ?? []).filter((r) => roomName === 'ALL' || r.name === roomName).map((r) => ({ ...s, roomName: r.name })));
  }, [schedules, roomName]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <ExamToolbar workspace={workspace} extra={<Button onClick={() => window.print()} sx={{ textTransform: 'none' }}>Print</Button>} />
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {!session ? <NeedSession /> : !published ? (
          <Alert severity="info">This timetable is {session.status.toLowerCase()}. Publish it from Smart Timetable after review.</Alert>
        ) : (
          <>
            <Typography sx={{ fontWeight: 800, color: NAVY, mb: 0.5 }}>{session.name}</Typography>
            <Typography sx={{ color: '#64748b', mb: 2 }}>{session.academicYear} · {session.term} · {dateLabel(session.startDate)} – {dateLabel(session.endDate)}</Typography>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, bgcolor: '#fff', borderRadius: 2 }}>
              <Tab label="Admin" />
              <Tab label="Class" />
              <Tab label="Room" />
              <Tab label="Student / print" />
            </Tabs>
            {tab === 0 && schedules.map((s) => (
              <Box key={s.id} sx={{ p: 1.5, bgcolor: '#fff', mb: 1, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontWeight: 700 }}>{s.subjectName} · {s.className}</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{dateLabel(s.examDate)} {s.startTime}–{s.endTime} · {(s.rooms ?? []).map((r) => r.name).join(', ')}</Typography>
              </Box>
            ))}
            {tab === 1 && (
              <>
                <Select size="small" value={className} onChange={(e) => setClassName(e.target.value)} sx={{ mb: 2, minWidth: 180 }}>
                  <MenuItem value="ALL">All classes</MenuItem>
                  {[...new Set(schedules.map((s) => s.className))].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
                {classView.sort((a, b) => isoDate(a.examDate).localeCompare(isoDate(b.examDate))).map((s) => (
                  <Typography key={s.id} sx={{ py: 0.6 }}>{dateLabel(s.examDate)} · {s.startTime} {s.subjectName} · {(s.rooms ?? []).map((r) => r.name).join(', ')}</Typography>
                ))}
              </>
            )}
            {tab === 2 && (
              <>
                <Select size="small" value={roomName} onChange={(e) => setRoomName(e.target.value)} sx={{ mb: 2, minWidth: 180 }}>
                  <MenuItem value="ALL">All rooms</MenuItem>
                  {(session.rooms ?? []).map((r) => <MenuItem key={r.name} value={r.name}>{r.name}</MenuItem>)}
                </Select>
                {roomView.map((s) => (
                  <Typography key={s.id + s.roomName} sx={{ py: 0.6 }}>{dateLabel(s.examDate)} · {s.startTime} {s.subjectName} — {s.className} · {s.roomName}</Typography>
                ))}
              </>
            )}
            {tab === 3 && (
              <Box sx={{ bgcolor: '#fff', p: 3, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 800, mb: 2 }}>Student examination timetable</Typography>
                {(session.seats ?? []).slice(0, 80).map((s) => (
                  <Typography key={s.id}>{s.fullName} · {s.className} · {s.roomName} {s.seatCode}</Typography>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { fetchExamReports } from '@/modules/exams/exam-api';
import type { ExamReports } from '@/modules/exams/exam-types';
import { ExamToolbar, NAVY, NeedSession, dateLabel } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';

const TABS = [
  { label: 'Attendance', path: '/exams/reports/attendance' },
  { label: 'Submission', path: '/exams/reports/submission' },
  { label: 'Seating', path: '/exams/reports/seating' },
  { label: 'Rooms', path: '/exams/reports/rooms' },
  { label: 'Invigilators', path: '/exams/reports/invigilators' },
  { label: 'Audit logs', path: '/exams/reports/audit' },
];

export default function ExamReportsPage() {
  const workspace = useExamWorkspace();
  const { session } = workspace;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = Math.max(0, TABS.findIndex((t) => t.path === pathname));
  const [reports, setReports] = useState<ExamReports | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchExamReports(session.id).then(setReports).catch(() => setReports(null));
  }, [session]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <ExamToolbar workspace={workspace} />
      <Tabs value={tab} onChange={(_, v) => navigate(TABS[v].path)} sx={{ bgcolor: '#fff', px: 2 }}>
        {TABS.map((t) => <Tab key={t.path} label={t.label} />)}
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {!session ? <NeedSession /> : (
          <Box sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'auto' }}>
            {(pathname.endsWith('/attendance') || pathname === '/exams/reports' || pathname.endsWith('/submission')) && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Class', 'Course', 'Date', 'Slot', 'Total', 'Present', 'Late', 'Absent', 'Submitted'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 800, color: NAVY }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reports?.attendance ?? []).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.className}</TableCell>
                      <TableCell>{r.subjectName}</TableCell>
                      <TableCell>{dateLabel(r.examDate)}</TableCell>
                      <TableCell>{r.slotCode}</TableCell>
                      <TableCell>{r.total}</TableCell>
                      <TableCell>{r.present}</TableCell>
                      <TableCell>{r.late}</TableCell>
                      <TableCell>{r.absent}</TableCell>
                      <TableCell>{r.submitted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {pathname.endsWith('/seating') && (session.seats ?? session.schedules.flatMap((s) => s.seats ?? [])).map((s) => (
              <Typography key={s.id} sx={{ px: 2, py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{s.fullName} · {s.className} · {s.roomName} {s.seatCode}</Typography>
            ))}
            {pathname.endsWith('/rooms') && (session.rooms ?? []).map((r) => (
              <Typography key={r.name} sx={{ px: 2, py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{r.name} · capacity {r.capacity} · layout {r.rows ?? 5}×{r.cols ?? 10}</Typography>
            ))}
            {pathname.endsWith('/invigilators') && (reports?.invigilators ?? []).map((d, i) => (
              <Typography key={i} sx={{ px: 2, py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{d.name} · {d.roomName} · {dateLabel(d.date)} {d.slotCode} · {d.mode}</Typography>
            ))}
            {pathname.endsWith('/audit') && (reports?.audits ?? []).map((a) => (
              <Typography key={a.id} sx={{ px: 2, py: 0.8, borderBottom: '1px solid #f1f5f9' }}>{new Date(a.createdAt).toLocaleString()} · {a.action} · {a.message}</Typography>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

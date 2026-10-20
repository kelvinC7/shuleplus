import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { deleteExamSession, examApiError } from '@/modules/exams/exam-api';
import { ExamToolbar, NAVY, StatusChip, dateLabel } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';

export default function ExamSessionsPage() {
  const workspace = useExamWorkspace();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');

  async function remove() {
    try {
      await deleteExamSession(pendingId);
      setPendingId('');
      if (workspace.sessionId === pendingId) workspace.setSessionId('');
      await workspace.reload();
    } catch (e) {
      setError(examApiError(e));
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <ExamToolbar
        workspace={workspace}
        extra={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/exams/sessions/new')}
            sx={{ bgcolor: NAVY, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0a0a5a' } }}
          >
            Create Examination
          </Button>
        }
      />
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {error ? <Typography color="error" sx={{ mb: 2 }}>{error}</Typography> : null}
        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#fff', overflow: 'hidden' }}>
          {workspace.sessions.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 800, color: NAVY }}>No examination sessions</Typography>
              <Typography sx={{ color: '#64748b', mt: 0.5 }}>Use the wizard to create an exam from Academic Year, Term, classes, rooms and days.</Typography>
            </Box>
          ) : workspace.sessions.map((s) => (
            <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>{s.name}</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {s.examType} · {s.academicYear} · {s.term} · {dateLabel(s.startDate)} – {dateLabel(s.endDate)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
                  <Chip size="small" label={`${s._count?.classes ?? s.classes?.length ?? 0} classes`} />
                  <Chip size="small" label={`${s._count?.schedules ?? 0} exams`} />
                  <Chip size="small" color={(s._count?.conflicts ?? 0) > 0 ? 'warning' : 'default'} label={`${s._count?.conflicts ?? 0} conflicts`} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusChip status={s.status} />
                <Button size="small" onClick={() => { workspace.setSessionId(s.id); navigate(`/exams/sessions/${s.id}/setup`); }} sx={{ textTransform: 'none' }}>Setup</Button>
                <Button size="small" onClick={() => { workspace.setSessionId(s.id); navigate('/exams/timetable'); }} sx={{ textTransform: 'none' }}>Timetable</Button>
                <IconButton size="small" onClick={() => setPendingId(s.id)}><DeleteOutlinedIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Dialog open={Boolean(pendingId)} onClose={() => setPendingId('')} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Delete examination session?</DialogTitle>
        <DialogContent>This removes the timetable, seating, invigilators and attendance for this session.</DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingId('')}>Cancel</Button>
          <Button color="error" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

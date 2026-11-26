import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import type { NurseryReport } from '@/types/nursery';

type Props = {
  open: boolean;
  report: NurseryReport | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: { teacherComment: string | null; headTeacherComment: string | null }) => Promise<void> | void;
};

export default function NurseryCommentDialog({ open, report, saving, onClose, onSave }: Props) {
  const [teacherComment, setTeacherComment] = useState('');
  const [headTeacherComment, setHeadTeacherComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !report) return;
    setTeacherComment(report.teacherComment ?? '');
    setHeadTeacherComment(report.headTeacherComment ?? '');
    setError('');
  }, [open, report]);

  async function handleSave() {
    if (teacherComment.length > 2000 || headTeacherComment.length > 2000) {
      setError('Comments must be 2000 characters or fewer.');
      return;
    }
    setError('');
    await onSave({
      teacherComment: teacherComment.trim() || null,
      headTeacherComment: headTeacherComment.trim() || null,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, color: '#000435' }}>
        Edit comments · {report?.studentName ?? 'Student'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Class teacher comment"
            value={teacherComment}
            onChange={(event) => setTeacherComment(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            helperText={`${teacherComment.length}/2000`}
          />
          <TextField
            label="Head teacher comment"
            value={headTeacherComment}
            onChange={(event) => setHeadTeacherComment(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            helperText={`${headTeacherComment.length}/2000`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving}
          sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#000435' }}
        >
          {saving ? 'Saving…' : 'Save comments'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

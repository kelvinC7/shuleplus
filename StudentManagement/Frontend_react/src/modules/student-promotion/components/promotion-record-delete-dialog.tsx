import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { PromotionGroup } from '../types';
import { formatYearDisplay, shortClassLabel, NAVY } from '../utils';

interface PromotionRecordDeleteDialogProps {
  open: boolean;
  group: PromotionGroup | null;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PromotionRecordDeleteDialog({
  open,
  group,
  deleting,
  onClose,
  onConfirm,
}: PromotionRecordDeleteDialogProps) {
  if (!group) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Revert Entire Promotion?</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
          This will revert <strong>{group.studentCount} student{group.studentCount !== 1 ? 's' : ''}</strong> promoted
          from <strong>{shortClassLabel(group.fromClass)}</strong> to{' '}
          <strong>{group.toClass ? shortClassLabel(group.toClass) : '—'}</strong> ({formatYearDisplay(group.fromYear)}{' '}
          → {group.toYear ? formatYearDisplay(group.toYear) : '—'}).
        </Typography>
        <Alert severity="warning" sx={{ fontSize: '0.8125rem' }}>
          All new enrollments for the target year will be deleted and students restored to their previous class.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={deleting}
          onClick={onConfirm}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {deleting ? 'Reverting…' : 'Revert All'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

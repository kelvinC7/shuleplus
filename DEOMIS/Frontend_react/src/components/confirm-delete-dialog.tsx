import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';

const NAVY = '#000435';

interface ConfirmDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  warning?: string;
  confirmLabel?: string;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  open,
  title,
  description,
  warning,
  confirmLabel = 'Delete',
  deleting,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={deleting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,4,53,0.18)',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', px: 2.5, pt: 2.5, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'rgba(220,38,38,0.08)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DeleteOutlinedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#dc2626' }}>
              Confirm delete
            </Typography>
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.05rem', lineHeight: 1.3 }}>{title}</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={deleting} sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent sx={{ px: 2.5, pt: 1, pb: 0 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.55 }}>{description}</Typography>
        {warning ? (
          <Box sx={{ mt: 2, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
            <Typography sx={{ fontSize: '0.8125rem', color: '#9a3412', fontWeight: 600 }}>{warning}</Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 2.25, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={deleting}
          sx={{ textTransform: 'none', fontWeight: 700, color: NAVY, borderRadius: 2, px: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={deleting}
          onClick={onConfirm}
          startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlinedIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2,
            px: 2.25,
            bgcolor: '#dc2626',
            '&:hover': { bgcolor: '#b91c1c' },
          }}
        >
          {deleting ? 'Deleting…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

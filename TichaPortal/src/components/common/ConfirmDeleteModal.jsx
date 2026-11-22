import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { brand } from '../../theme/theme';

/**
 * @param {{ open: boolean; title?: string; description?: string; itemLabel?: string; loading?: boolean; onCancel: () => void; onConfirm: () => void | Promise<void> }} props
 */
export default function ConfirmDeleteModal({
  open,
  title = 'Delete this item?',
  description = 'This action cannot be undone.',
  itemLabel,
  loading = false,
  onCancel,
  onConfirm,
}) {
    const isDesktop = useMediaQuery('(min-width:1200px)', { noSsr: true });

  const body = (
    <>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 1.5,
          borderBottom: '1px solid #E5E8EF',
        }}
      >
        <Box sx={{ position: 'absolute', top: 6, width: 36, height: 4, borderRadius: 2, bgcolor: '#D5D9E3', display: { lg: 'none' } }} />
        <Typography id="confirm-delete-title" sx={{ fontSize: 14, fontWeight: 800, mt: 0.5, color: brand.navy }}>
          {title}
        </Typography>
        <IconButton
          onClick={onCancel}
          disabled={loading}
          size="small"
          aria-label="Close"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Typography sx={{ fontSize: 13.5, lineHeight: 1.5, color: '#475569', textAlign: 'center' }}>
          {description}
        </Typography>
        {itemLabel ? (
          <Box
            sx={{
              mt: 1.75,
              px: 1.5,
              py: 1.25,
              borderRadius: 2,
              bgcolor: '#F2F4F8',
              fontSize: 13.5,
              fontWeight: 600,
              color: brand.navy,
              textAlign: 'center',
            }}
          >
            {itemLabel}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ p: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid #E5E8EF' }}>
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            onClick={onCancel}
            disabled={loading}
            sx={{
              height: 48,
              borderRadius: 999,
              border: '1px solid #E5E8EF',
              color: brand.navy,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={() => void onConfirm()}
            disabled={loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon sx={{ fontSize: 18 }} />}
            sx={{
              height: 48,
              borderRadius: 999,
              bgcolor: '#DC2626',
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            Delete
          </Button>
        </Stack>
      </Box>
    </>
  );

  return (
    <>
      {isDesktop ? (
        <Dialog
          open={Boolean(open)}
          onClose={loading ? undefined : onCancel}
          transitionDuration={{ enter: 180, exit: 120 }}
          PaperProps={{
            role: 'dialog',
            'aria-labelledby': 'confirm-delete-title',
            sx: { width: '100%', maxWidth: 440, m: 2, overflow: 'hidden', backgroundImage: 'none' },
          }}
          slotProps={{ backdrop: { sx: { bgcolor: 'rgba(11,18,32,0.45)', backdropFilter: 'blur(2px)' } } }}
        >
          {body}
        </Dialog>
      ) : (
        <Drawer
          anchor="bottom"
          open={Boolean(open)}
          onClose={loading ? undefined : onCancel}
          PaperProps={{
            role: 'dialog',
            'aria-labelledby': 'confirm-delete-title',
            sx: {
              width: '100%',
              maxWidth: 480,
              mx: 'auto',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              bgcolor: '#fff',
              boxShadow: '0 -12px 40px rgba(0,4,53,0.28)',
              overflow: 'hidden',
            },
          }}
          slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,2,31,0.55)' } } }}
        >
          {body}
        </Drawer>
      )}
    </>
  );
}

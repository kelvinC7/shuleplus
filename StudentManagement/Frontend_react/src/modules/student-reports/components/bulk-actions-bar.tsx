import { Box, Button, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

const NAVY = '#000435';

export function BulkActionsBar({
  count,
  onClear,
  onExport,
  onPrint,
  onViewProfiles,
}: {
  count: number;
  onClear: () => void;
  onExport: () => void;
  onPrint: () => void;
  onViewProfiles: () => void;
}) {
  if (count === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        px: 2,
        py: 1,
        mb: 2,
        borderRadius: 2,
        bgcolor: NAVY,
        color: '#fff',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>{count} student{count !== 1 ? 's' : ''} selected</Typography>
        <IconButton size="small" onClick={onClear} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={onExport} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', fontWeight: 600 }} variant="outlined">
          Export selected
        </Button>
        <Button size="small" startIcon={<PrintOutlinedIcon />} onClick={onPrint} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', fontWeight: 600 }} variant="outlined">
          Print selected
        </Button>
        <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={onViewProfiles} disabled={count !== 1} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', fontWeight: 600 }} variant="outlined">
          View profile
        </Button>
      </Box>
    </Box>
  );
}

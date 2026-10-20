import { Box, Button, IconButton, Menu, MenuItem } from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';

const NAVY = '#000435';

interface ReportsPageHeaderProps {
  onExport: () => void;
  onPrint: () => void;
  onGenerate: () => void;
}

export function ReportsPageHeader({ onExport, onPrint, onGenerate }: ReportsPageHeaderProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: NAVY,
              color: '#FCB038',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssessmentOutlinedIcon />
          </Box>
          <Box>
            <Box component="h1" sx={{ m: 0, fontSize: '1.25rem', fontWeight: 800, color: NAVY }}>
              Student Reports
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AssessmentOutlinedIcon />}
          onClick={onGenerate}
          sx={{ bgcolor: NAVY, borderRadius: 2, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#0a1055' } }}
        >
          Generate Report
        </Button>
        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={onExport}
          sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', borderColor: 'rgba(0,4,53,0.15)', color: NAVY }}
        >
          Export
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintOutlinedIcon />}
          onClick={onPrint}
          sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', borderColor: 'rgba(0,4,53,0.15)', color: NAVY, display: { xs: 'none', sm: 'inline-flex' } }}
        >
          Print
        </Button>
        <Button
          variant="outlined"
          startIcon={<SaveOutlinedIcon />}
          sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', borderColor: 'rgba(0,4,53,0.15)', color: NAVY, display: { xs: 'none', lg: 'inline-flex' } }}
          disabled
        >
          Save View
        </Button>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ border: '1px solid rgba(0,4,53,0.1)', borderRadius: 2 }}>
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem onClick={() => { setAnchor(null); onPrint(); }}>Print report</MenuItem>
          <MenuItem onClick={() => { setAnchor(null); onExport(); }}>Export CSV</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}

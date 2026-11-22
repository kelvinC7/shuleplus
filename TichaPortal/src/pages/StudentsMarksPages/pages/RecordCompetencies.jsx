import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import RecordCompetenciesWizard from '../components/RecordCompetenciesWizard.jsx';
import { brand } from '../../../theme/theme';

export default function RecordCompetencies() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [toast, setToast] = useState(null);

  return (
    <Stack spacing={3}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          borderColor: 'rgba(0,0,0,0.06)',
          boxShadow: '0 4px 24px rgba(19,33,61,0.06)',
          p: { xs: 3, md: 5 },
        }}
      >
        <Box sx={{ maxWidth: 640 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(19,33,61,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
            <WorkspacePremiumOutlinedIcon sx={{ fontSize: 26, color: brand.navy }} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: brand.navy, mb: 1 }}>Competency analysis</Typography>
          <Typography sx={{ fontSize: 14, color: 'rgba(19,33,61,0.55)', lineHeight: 1.6, mb: 3 }}>
            Rate CBC competencies for your assigned class - categories are configured by DOS
            (Communication, Problem Solving, Research Skills, Leadership, etc.).
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => setWizardOpen(true)}
            sx={{ bgcolor: brand.navy, color: '#fff', borderRadius: 2, px: 3, py: 1.25, fontSize: 14, fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: '#24396A' } }}
          >
            Record competencies
          </Button>
        </Box>
      </Paper>

      <RecordCompetenciesWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setToast('Competency ratings saved.');
        }}
      />

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

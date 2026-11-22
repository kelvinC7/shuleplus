import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import GenerateLessonPlanModal from '../../components/lessonPlanning/GenerateLessonPlanModal';
import { brand } from '../../theme/theme';

export default function GenerateLessonPlanPage() {
  const [open, setOpen] = useState(false);

  return (
    <LessonPlanningLayout
      title="Generate lesson plan"
      subtitle="Create a draft from published curriculum."
      actions={
        <Button
          type="button"
          variant="contained"
          color="secondary"
          onClick={() => setOpen(true)}
          sx={{ height: 36, width: { xs: '100%', sm: 'auto' }, px: 2.5, fontSize: 13, fontWeight: 600, textTransform: 'none', bgcolor: brand.navy, color: '#fff !important', '&:hover': { bgcolor: brand.navy2 } }}
        >
          New lesson plan
        </Button>
      }
    >
      <Box component="p" sx={{ m: 0, fontSize: 14, color: '#475569' }}>
        Schedule, class, curriculum, then optional notes.{' '}
        <Box
          component="button"
          type="button"
          onClick={() => setOpen(true)}
          sx={{ border: 0, bgcolor: 'transparent', p: 0, font: 'inherit', fontWeight: 500, color: '#0F172A', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}
        >
          Open wizard
        </Box>
      </Box>
      <GenerateLessonPlanModal open={open} onClose={() => setOpen(false)} />
    </LessonPlanningLayout>
  );
}

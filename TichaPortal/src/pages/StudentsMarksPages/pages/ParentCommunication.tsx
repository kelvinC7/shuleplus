import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TeacherParentChat from '../../../components/TeacherParentChat';
import { brand } from '../../../theme/theme';

export default function ParentCommunication() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: brand.navy }}>Parent communication</Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Pick a student and parent, then chat in real time.</Typography>
      </Box>
      <TeacherParentChat showHero={false} />
    </Box>
  );
}

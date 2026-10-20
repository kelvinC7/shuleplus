import {
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { Link } from 'react-router-dom';
import type { EnrichedStudentRow } from '../types';
import { formatDate } from '../utils';
import { resolveStudentPhotoUrl } from '@/utils/resolve-student-photo-url';

const NAVY = '#000435';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === '—') return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: NAVY }}>{value}</Typography>
    </Box>
  );
}

export function StudentDetailsDrawer({
  row,
  open,
  onClose,
  onPrint,
}: {
  row: EnrichedStudentRow | null;
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
}) {
  if (!row) return null;

  const parents = row.student.studentParents ?? [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 }, borderRadius: { sm: '16px 0 0 16px' } } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: '1px solid rgba(0,4,53,0.08)' }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Student Overview
          </Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(0,4,53,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', mb: 1.5 }}>
              {row.student.studentPhoto ? (
                <Box component="img" src={resolveStudentPhotoUrl(row.student.studentPhoto) ?? ''} alt="" sx={{ width: 72, height: 72, objectFit: 'cover' }} />
              ) : (
                <PersonIcon sx={{ fontSize: 36, color: '#94a3b8' }} />
              )}
            </Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY, textAlign: 'center' }}>{row.fullName}</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{row.studentCode}</Typography>
          </Box>

          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 1.5, pb: 0.5, borderBottom: '1px solid rgba(0,4,53,0.08)' }}>
            Personal Information
          </Typography>
          <InfoRow label="Gender" value={row.gender} />
          <InfoRow label="Date of Birth" value={formatDate(row.student.dateOfBirth)} />
          <InfoRow label="Age" value={row.age?.toString()} />
          <InfoRow label="Class" value={`${row.className}${row.stream !== '—' ? ` ${row.stream}` : ''}`} />
          <InfoRow label="Academic Year" value={row.academicYear} />
          <InfoRow label="Enrollment Date" value={formatDate(row.enrollmentDate)} />
          <InfoRow label="Status" value={row.status} />

          {parents.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 1.5 }}>
                Parent Information
              </Typography>
              {parents.map((sp) => (
                <Box key={sp.id} sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>{sp.role}</Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: NAVY }}>
                    {sp.parent.firstName} {sp.parent.lastName}
                  </Typography>
                  {sp.parent.phone && (
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{sp.parent.phone}</Typography>
                  )}
                </Box>
              ))}
            </>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid rgba(0,4,53,0.08)', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            component={Link}
            to={`/students/${row.student.id}/edit`}
            variant="contained"
            startIcon={<OpenInNewOutlinedIcon />}
            sx={{ bgcolor: NAVY, borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
          >
            View Full Profile
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintOutlinedIcon />}
            onClick={onPrint}
            sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', borderColor: 'rgba(0,4,53,0.15)', color: NAVY }}
          >
            Print Student Report
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

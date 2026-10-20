import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { PromotionGroup } from '../types';
import { formatYearDisplay, shortClassLabel, studentDisplayName, NAVY } from '../utils';

interface PromotionRecordViewDrawerProps {
  open: boolean;
  group: PromotionGroup | null;
  onClose: () => void;
}

const headerSx = {
  fontWeight: 700,
  fontSize: '0.6875rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#64748b',
  bgcolor: '#f8fafc',
};

export function PromotionRecordViewDrawer({ open, group, onClose }: PromotionRecordViewDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }}>Promotion Students</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {group ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: NAVY }}>
                {shortClassLabel(group.fromClass)}
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: 18, color: '#FCB038' }} />
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: NAVY }}>
                {group.toClass ? shortClassLabel(group.toClass) : '—'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip size="small" label={formatYearDisplay(group.fromYear)} sx={{ fontWeight: 600 }} />
              <ArrowForwardIcon sx={{ fontSize: 14, color: '#94a3b8', alignSelf: 'center' }} />
              <Chip
                size="small"
                label={group.toYear ? formatYearDisplay(group.toYear) : '—'}
                sx={{ fontWeight: 600, bgcolor: 'rgba(252,176,56,0.12)' }}
              />
              <Chip
                size="small"
                label={`${group.studentCount} student${group.studentCount !== 1 ? 's' : ''}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(0,4,53,0.06)' }}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 1.5, textTransform: 'uppercase' }}>
              Promoted Students
            </Typography>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerSx}>Student</TableCell>
                    <TableCell sx={headerSx}>Code</TableCell>
                    <TableCell sx={headerSx}>SDMS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.records.map((record) => {
                    const student = record.student;
                    return (
                      <TableRow key={record.id} hover>
                        <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                          {studentDisplayName(student)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {student.studentCode || student.studentUid}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {student.sdmCode ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </>
        ) : (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>No details available.</Typography>
        )}
      </Box>
    </Drawer>
  );
}

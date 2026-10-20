import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import type { PromotionCandidate } from '../types';
import { studentDisplayName, NAVY } from '../utils';

interface PromotionValidationPanelProps {
  readyCount: number;
  reviewCount: number;
  issues: PromotionCandidate[];
}

const issueColor: Record<string, 'warning' | 'error' | 'default'> = {
  already_promoted: 'warning',
  already_enrolled: 'warning',
  missing_class: 'error',
  withdrawn: 'default',
  inactive: 'default',
};

export function PromotionValidationPanel({ readyCount, reviewCount, issues }: PromotionValidationPanelProps) {
  if (readyCount === 0 && reviewCount === 0) return null;

  return (
    <Box sx={{ border: '1px solid rgba(0,4,53,0.08)', borderRadius: 2, bgcolor: 'white', overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlinedIcon sx={{ color: '#16a34a', fontSize: 20 }} />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: NAVY }}>
            {readyCount} student{readyCount !== 1 ? 's' : ''} ready for promotion
          </Typography>
        </Box>
        {reviewCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberOutlinedIcon sx={{ color: '#ea580c', fontSize: 20 }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#ea580c' }}>
              {reviewCount} student{reviewCount !== 1 ? 's' : ''} need review
            </Typography>
          </Box>
        )}
      </Box>

      {issues.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b' }}>Issue</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {issues.map((c) => (
                <TableRow key={c.student.id}>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{studentDisplayName(c.student)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.issue?.message ?? 'Unknown'}
                      color={issueColor[c.issue?.type ?? ''] ?? 'default'}
                      sx={{ fontSize: '0.6875rem' }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {c.issue?.type === 'missing_class' ? 'Assign' : c.issue?.type === 'withdrawn' ? 'Exclude' : 'View'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

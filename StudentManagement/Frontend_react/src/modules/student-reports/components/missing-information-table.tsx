import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Link } from 'react-router-dom';
import type { EnrichedStudentRow } from '../types';
import { MISSING_FIELD_DEFS } from '../types';
import { getMissingFields, getProfileCompleteness } from '../utils';
import { resolveStudentPhotoUrl } from '@/utils/resolve-student-photo-url';

const NAVY = '#000435';
const PRIMARY = '#FCB038';

const FIELD_CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  parent: { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c' },
  phone: { bg: 'rgba(249,115,22,0.12)', color: '#c2410c' },
  dateOfBirth: { bg: 'rgba(168,85,247,0.12)', color: '#7e22ce' },
  photo: { bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8' },
  address: { bg: 'rgba(20,184,166,0.12)', color: '#0f766e' },
  sdmCode: { bg: 'rgba(234,179,8,0.15)', color: '#a16207' },
};

function MissingFieldChips({ row }: { row: EnrichedStudentRow }) {
  const missing = getMissingFields(row);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {missing.map((id) => {
        const def = MISSING_FIELD_DEFS.find((d) => d.id === id);
        const colors = FIELD_CHIP_COLORS[id] ?? { bg: '#f1f5f9', color: NAVY };
        return (
          <Chip
            key={id}
            label={def?.label.replace('Missing ', '') ?? id}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.6875rem',
              fontWeight: 700,
              bgcolor: colors.bg,
              color: colors.color,
            }}
          />
        );
      })}
    </Box>
  );
}

function CompletenessBar({ value }: { value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 50 ? PRIMARY : '#ef4444';
  return (
    <Box sx={{ minWidth: 100 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY }}>{value}%</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: '#f1f5f9',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
    </Box>
  );
}

export function MissingInformationTable({ rows }: { rows: EnrichedStudentRow[] }) {
  const headerSx = {
    fontWeight: 700,
    fontSize: '0.6875rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: NAVY,
    bgcolor: '#fafbfc',
    borderBottom: '1px solid rgba(0,4,53,0.08)',
  };

  return (
    <TableContainer sx={{ borderRadius: 3, border: '1px solid rgba(0,4,53,0.08)', bgcolor: '#fff', boxShadow: '0 2px 14px -4px rgba(0,4,53,0.08)' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>Student</TableCell>
            <TableCell sx={headerSx}>Class</TableCell>
            <TableCell sx={headerSx}>Missing Information</TableCell>
            <TableCell sx={headerSx}>Profile Complete</TableCell>
            <TableCell sx={headerSx} align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  No students with missing information match your filters
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => (
              <TableRow
                key={row.student.id}
                hover
                sx={{ bgcolor: idx % 2 ? 'rgba(0,4,53,0.02)' : '#fff' }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(0,4,53,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {row.student.studentPhoto ? (
                        <Box component="img" src={resolveStudentPhotoUrl(row.student.studentPhoto) ?? ''} alt="" sx={{ width: 40, height: 40, objectFit: 'cover' }} />
                      ) : (
                        <PersonIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>{row.fullName}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{row.studentCode}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY }}>
                    {row.className}{row.stream !== '—' ? ` ${row.stream}` : ''}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 360 }}>
                  <MissingFieldChips row={row} />
                </TableCell>
                <TableCell>
                  <CompletenessBar value={getProfileCompleteness(row)} />
                </TableCell>
                <TableCell align="right">
                  <Button
                    component={Link}
                    to={`/students/${row.student.id}/edit`}
                    size="small"
                    startIcon={<EditOutlinedIcon />}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, color: NAVY }}
                  >
                    Complete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

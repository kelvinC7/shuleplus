import {
  Box,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { PromotionGroup } from '../types';
import { formatYearDisplay, shortClassLabel, NAVY } from '../utils';

const headerSx = {
  fontWeight: 700,
  fontSize: '0.6875rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#64748b',
  bgcolor: '#f8fafc',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

interface PromotionRecordsTableProps {
  groups: PromotionGroup[];
  loading?: boolean;
  onStartPromotion?: () => void;
  onView: (group: PromotionGroup) => void;
  onEdit: (group: PromotionGroup) => void;
  onDelete: (group: PromotionGroup) => void;
}

export function PromotionRecordsTable({
  groups,
  loading,
  onStartPromotion,
  onView,
  onEdit,
  onDelete,
}: PromotionRecordsTableProps) {
  return (
    <Box sx={{ border: '1px solid rgba(0,4,53,0.08)', borderRadius: 2, bgcolor: 'white', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerSx}>Class</TableCell>
              <TableCell sx={headerSx}>Students</TableCell>
              <TableCell sx={{ ...headerSx, display: { xs: 'none', sm: 'table-cell' } }}>From Year</TableCell>
              <TableCell sx={{ ...headerSx, display: { xs: 'none', sm: 'table-cell' } }}>To Year</TableCell>
              <TableCell sx={headerSx} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Loading promotions…</Typography>
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                  <TrendingUpOutlinedIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                    No promotions yet
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: onStartPromotion ? 2 : 0 }}>
                    Click Start Promotion to promote students to a new academic year.
                  </Typography>
                  {onStartPromotion && (
                    <Button
                      variant="contained"
                      onClick={onStartPromotion}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: NAVY,
                        '&:hover': { bgcolor: '#0a1055' },
                      }}
                    >
                      Start Promotion
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group, idx) => (
                <TableRow key={group.id} hover sx={{ bgcolor: idx % 2 ? 'rgba(0,4,53,0.015)' : 'white' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>
                        {shortClassLabel(group.fromClass)}
                      </Typography>
                      <ArrowForwardIcon sx={{ fontSize: 16, color: '#FCB038' }} />
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>
                        {group.toClass ? shortClassLabel(group.toClass) : '—'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={`${group.studentCount} student${group.studentCount !== 1 ? 's' : ''}`}
                      sx={{ height: 24, fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(0,4,53,0.06)' }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.8125rem' }}>
                    <Chip
                      size="small"
                      label={formatYearDisplay(group.fromYear)}
                      sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.8125rem' }}>
                    {group.toYear ? (
                      <Chip
                        size="small"
                        label={formatYearDisplay(group.toYear)}
                        sx={{
                          height: 22,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          bgcolor: 'rgba(252,176,56,0.12)',
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="View students">
                      <IconButton size="small" onClick={() => onView(group)} sx={{ color: NAVY }}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit students">
                      <IconButton size="small" onClick={() => onEdit(group)} sx={{ color: NAVY }}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Revert entire promotion">
                      <IconButton size="small" onClick={() => onDelete(group)} sx={{ color: '#dc2626' }}>
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

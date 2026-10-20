import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import type { EnrichedStudentRow, ReportColumnId, SortDir, SortField } from '../types';
import { formatDate } from '../utils';
import { resolveStudentPhotoUrl } from '@/utils/resolve-student-photo-url';

const NAVY = '#000435';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: 'rgba(34,197,94,0.12)', color: '#15803d', label: 'Active' },
  GRADUATED: { bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8', label: 'Graduated' },
  TRANSFERRED: { bg: 'rgba(249,115,22,0.12)', color: '#c2410c', label: 'Transferred' },
  WITHDRAWN: { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c', label: 'Withdrawn' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? { bg: '#f1f5f9', color: '#64748b', label: status };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 700, bgcolor: cfg.bg, color: cfg.color }}
    />
  );
}

interface ReportsTableProps {
  rows: EnrichedStudentRow[];
  selectedIds: Set<string>;
  visibleColumns: Set<ReportColumnId>;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onRowClick: (id: string) => void;
}

export function ReportsTable({
  rows,
  selectedIds,
  visibleColumns,
  sortField,
  sortDir,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
}: ReportsTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.student.id));
  const indeterminate = rows.some((r) => selectedIds.has(r.student.id)) && !allSelected;

  const headerSx = {
    fontWeight: 700,
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: NAVY,
    bgcolor: '#fafbfc',
    borderBottom: '1px solid rgba(0,4,53,0.08)',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={headerSx}>
              <Checkbox size="small" checked={allSelected} indeterminate={indeterminate} onChange={(e) => onToggleSelectAll(e.target.checked)} />
            </TableCell>
            <TableCell sx={headerSx}>
              <TableSortLabel active={sortField === 'name'} direction={sortField === 'name' ? sortDir : 'asc'} onClick={() => onSort('name')}>
                Student
              </TableSortLabel>
            </TableCell>
            {visibleColumns.has('studentCode') && (
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortField === 'studentCode'} direction={sortField === 'studentCode' ? sortDir : 'asc'} onClick={() => onSort('studentCode')}>
                  Code
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.has('gender') && (
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortField === 'gender'} direction={sortField === 'gender' ? sortDir : 'asc'} onClick={() => onSort('gender')}>
                  Gender
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.has('age') && (
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortField === 'age'} direction={sortField === 'age' ? sortDir : 'asc'} onClick={() => onSort('age')}>
                  Age
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.has('class') && (
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortField === 'class'} direction={sortField === 'class' ? sortDir : 'asc'} onClick={() => onSort('class')}>
                  Class
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.has('stream') && <TableCell sx={headerSx}>Stream</TableCell>}
            {visibleColumns.has('parent') && <TableCell sx={headerSx}>Parent</TableCell>}
            {visibleColumns.has('phone') && <TableCell sx={headerSx}>Phone</TableCell>}
            {visibleColumns.has('sdmCode') && <TableCell sx={headerSx}>SDMS</TableCell>}
            {visibleColumns.has('dateOfBirth') && <TableCell sx={headerSx}>DOB</TableCell>}
            {visibleColumns.has('address') && <TableCell sx={headerSx}>Address</TableCell>}
            {visibleColumns.has('enrollmentDate') && (
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortField === 'enrollmentDate'} direction={sortField === 'enrollmentDate' ? sortDir : 'asc'} onClick={() => onSort('enrollmentDate')}>
                  Enrolled
                </TableSortLabel>
              </TableCell>
            )}
            {visibleColumns.has('status') && (
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortField === 'status'} direction={sortField === 'status' ? sortDir : 'asc'} onClick={() => onSort('status')}>
                  Status
                </TableSortLabel>
              </TableCell>
            )}
            <TableCell sx={headerSx} align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={20} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                No students match your filters
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => {
              const selected = selectedIds.has(row.student.id);
              return (
                <TableRow
                  key={row.student.id}
                  hover
                  selected={selected}
                  onClick={() => onRowClick(row.student.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 ? 'rgba(0,4,53,0.02)' : '#fff',
                    '&.Mui-selected': { bgcolor: 'rgba(252,176,56,0.08)' },
                  }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={selected} onChange={() => onToggleSelect(row.student.id)} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(0,4,53,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {row.student.studentPhoto ? (
                          <Box component="img" src={resolveStudentPhotoUrl(row.student.studentPhoto) ?? ''} alt="" sx={{ width: 36, height: 36, objectFit: 'cover' }} />
                        ) : (
                          <PersonIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                        )}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: NAVY }}>{row.fullName}</Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{row.studentCode}</Typography>
                        {row.sdmCode !== '—' && (
                          <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary' }}>SDMS: {row.sdmCode}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  {visibleColumns.has('studentCode') && <TableCell sx={{ fontSize: '0.75rem' }}>{row.studentCode}</TableCell>}
                  {visibleColumns.has('gender') && <TableCell sx={{ fontSize: '0.75rem' }}>{row.gender}</TableCell>}
                  {visibleColumns.has('age') && <TableCell sx={{ fontSize: '0.75rem' }}>{row.age ?? '—'}</TableCell>}
                  {visibleColumns.has('class') && <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{row.className}</TableCell>}
                  {visibleColumns.has('stream') && <TableCell sx={{ fontSize: '0.75rem' }}>{row.stream}</TableCell>}
                  {visibleColumns.has('parent') && <TableCell sx={{ fontSize: '0.75rem' }}>{row.parentName}</TableCell>}
                  {visibleColumns.has('phone') && <TableCell sx={{ fontSize: '0.75rem' }}>{row.phone}</TableCell>}
                  {visibleColumns.has('sdmCode') && <TableCell sx={{ fontSize: '0.75rem' }}>{row.sdmCode}</TableCell>}
                  {visibleColumns.has('dateOfBirth') && <TableCell sx={{ fontSize: '0.75rem' }}>{formatDate(row.student.dateOfBirth)}</TableCell>}
                  {visibleColumns.has('address') && <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.address}</TableCell>}
                  {visibleColumns.has('enrollmentDate') && <TableCell sx={{ fontSize: '0.75rem' }}>{formatDate(row.enrollmentDate)}</TableCell>}
                  {visibleColumns.has('status') && (
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                  )}
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => onRowClick(row.student.id)}>
                      <MoreHorizIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

import {
  Box,
  Button,
  Checkbox,
  FormControl,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import type { ApiClass, Student } from '@/types';
import type { PromotionMode } from '../types';
import { classLabel, getEnrollmentForYear, shortClassLabel, studentDisplayName, NAVY } from '../utils';
import { resolveStudentPhotoUrl } from '@/utils/resolve-student-photo-url';

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

interface PromotionStudentTableProps {
  mode: PromotionMode;
  fromYear: string;
  students: Student[];
  classes: ApiClass[];
  fromClassId: string | null;
  toClassId: string | null;
  workspaceConfigured?: boolean;
  selectedIds: Set<string>;
  targetClassByStudent: Record<string, string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onTargetChange: (studentId: string, classId: string) => void;
  onStartPromotion?: () => void;
}

export function PromotionStudentTable({
  mode,
  fromYear,
  students,
  classes,
  fromClassId,
  toClassId,
  workspaceConfigured,
  selectedIds,
  targetClassByStudent,
  onToggle,
  onSelectAll,
  onClearSelection,
  onTargetChange,
  onStartPromotion,
}: PromotionStudentTableProps) {
  const isAllSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));
  const isIndeterminate = students.some((s) => selectedIds.has(s.id)) && !isAllSelected;

  return (
    <Box sx={{ border: '1px solid rgba(0,4,53,0.08)', borderRadius: 2, bgcolor: 'white', overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1,
          bgcolor: selectedIds.size > 0 ? NAVY : '#f8fafc',
          color: selectedIds.size > 0 ? 'white' : 'inherit',
        }}
      >
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
          {selectedIds.size} / {students.length} selected
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={onSelectAll}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: selectedIds.size > 0 ? 'white' : NAVY,
            }}
          >
            Select All
          </Button>
          <Button
            size="small"
            onClick={onClearSelection}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: selectedIds.size > 0 ? 'rgba(255,255,255,0.85)' : 'text.secondary',
            }}
          >
            Clear Selection
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 480 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={headerSx}>
                <Checkbox
                  size="small"
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={onSelectAll}
                />
              </TableCell>
              <TableCell sx={headerSx}>Student</TableCell>
              <TableCell sx={{ ...headerSx, display: { xs: 'none', md: 'table-cell' } }}>Student Code</TableCell>
              <TableCell sx={{ ...headerSx, display: { xs: 'none', sm: 'table-cell' } }}>Gender</TableCell>
              <TableCell sx={headerSx}>Current Class</TableCell>
              <TableCell sx={headerSx}>Promotion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                  <TrendingUpOutlinedIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#475569', mb: 0.5 }}>
                    {!workspaceConfigured && mode === 'by_class' && !fromClassId
                      ? 'No promotion setup yet'
                      : 'No students found'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: onStartPromotion ? 2 : 0 }}>
                    {!workspaceConfigured && mode === 'by_class' && !fromClassId
                      ? 'Click Start Promotion to configure academic year and class transition.'
                      : 'Try adjusting your search or class filter, or run Start Promotion again.'}
                  </Typography>
                  {!workspaceConfigured && mode === 'by_class' && !fromClassId && onStartPromotion && (
                    <Button
                      variant="contained"
                      onClick={onStartPromotion}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: NAVY, '&:hover': { bgcolor: '#0a1055' } }}
                    >
                      Start Promotion
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              students.map((stu, idx) => {
                const enrollment = getEnrollmentForYear(stu, fromYear);
                const currentClass = enrollment?.class;
                const isSelected = selectedIds.has(stu.id);
                const targetId = targetClassByStudent[stu.id] ?? toClassId ?? '';

                return (
                  <TableRow
                    key={stu.id}
                    hover
                    selected={isSelected}
                    onClick={() => onToggle(stu.id)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? 'rgba(252,176,56,0.06)' : idx % 2 ? 'rgba(0,4,53,0.015)' : 'white',
                    }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => onToggle(stu.id)} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: 'rgba(0,4,53,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {stu.studentPhoto ? (
                            <img src={resolveStudentPhotoUrl(stu.studentPhoto) ?? ''} alt="" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                          ) : (
                            <PersonIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{studentDisplayName(stu)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {stu.studentCode || stu.studentUid}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '0.8125rem' }}>
                      {stu.gender ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                      {currentClass ? shortClassLabel(currentClass) : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                        <Select
                          value={targetId}
                          displayEmpty
                          onChange={(e) => onTargetChange(stu.id, e.target.value)}
                          sx={{ borderRadius: 1.5, fontSize: '0.8125rem' }}
                        >
                          <MenuItem value="" disabled>
                            Assign class
                          </MenuItem>
                          {classes.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {classLabel(c)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

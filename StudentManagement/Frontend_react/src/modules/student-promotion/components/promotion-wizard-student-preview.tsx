import {
  Box,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ApiClass, Student } from '@/types';
import { getEnrollmentForYear, resolveTargetClassForStudent, shortClassLabel, studentDisplayName, suggestTargetClass, NAVY } from '../utils';

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

interface PromotionWizardStudentPreviewProps {
  students: Student[];
  fromYear: string;
  classes: ApiClass[];
  toClass: ApiClass | null;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export function PromotionWizardStudentPreview({
  students,
  fromYear,
  classes,
  toClass,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
}: PromotionWizardStudentPreviewProps) {
  const isAllSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));
  const isIndeterminate = students.some((s) => selectedIds.has(s.id)) && !isAllSelected;

  function promoteToLabel(student: Student): string {
    const enrollment = getEnrollmentForYear(student, fromYear);
    const source = enrollment?.class;
    if (!source) return '—';
    if (toClass) {
      const resolved = resolveTargetClassForStudent(source, toClass, classes);
      return resolved ? shortClassLabel(resolved) : shortClassLabel(toClass);
    }
    const suggested = suggestTargetClass(source, classes);
    return suggested ? shortClassLabel(suggested) : '—';
  }

  function currentLabel(student: Student): string {
    const enrollment = getEnrollmentForYear(student, fromYear);
    return enrollment?.class ? shortClassLabel(enrollment.class) : '—';
  }

  if (students.length === 0) return null;

  return (
    <Box sx={{ border: '1px solid rgba(0,4,53,0.08)', borderRadius: 2, overflow: 'hidden', bgcolor: 'white' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: selectedIds.size > 0 ? NAVY : '#f8fafc',
          color: selectedIds.size > 0 ? 'white' : 'inherit',
        }}
      >
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
          {selectedIds.size} / {students.length} selected for promotion
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
              minWidth: 0,
              px: 1,
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
              minWidth: 0,
              px: 1,
            }}
          >
            Clear
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 280 }}>
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
              <TableCell sx={headerSx}>Code</TableCell>
              <TableCell sx={headerSx}>Current</TableCell>
              <TableCell sx={headerSx}>Promote To</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, idx) => {
              const isSelected = selectedIds.has(student.id);
              return (
                <TableRow
                  key={student.id}
                  hover
                  selected={isSelected}
                  onClick={() => onToggle(student.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isSelected ? 'rgba(252,176,56,0.06)' : idx % 2 ? 'rgba(0,4,53,0.015)' : 'white',
                  }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={isSelected} onChange={() => onToggle(student.id)} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{studentDisplayName(student)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {student.studentCode || student.studentUid}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{currentLabel(student)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY }}>
                    {promoteToLabel(student)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

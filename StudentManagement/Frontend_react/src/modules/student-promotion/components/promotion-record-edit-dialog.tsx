import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { Student } from '@/types';
import type { PromotionGroup } from '../types';
import { formatYearDisplay, getEnrollmentForYear, shortClassLabel, studentDisplayName, NAVY } from '../utils';

const headerSx = {
  fontWeight: 700,
  fontSize: '0.6875rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#64748b',
  bgcolor: '#f8fafc',
};

interface PromotionRecordEditDialogProps {
  open: boolean;
  group: PromotionGroup | null;
  students: Student[];
  busy?: boolean;
  onClose: () => void;
  onRemove: (recordId: string) => Promise<void>;
  onAdd: (enrollmentId: string) => Promise<void>;
}

export function PromotionRecordEditDialog({
  open,
  group,
  students,
  busy,
  onClose,
  onRemove,
  onAdd,
}: PromotionRecordEditDialogProps) {
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const promotedStudentIds = useMemo(
    () => new Set(group?.records.map((r) => r.studentId) ?? []),
    [group]
  );

  const addableStudents = useMemo(() => {
    if (!group) return [];
    return students.filter((s) => {
      if (promotedStudentIds.has(s.id)) return false;
      const en = getEnrollmentForYear(s, group.fromYear);
      return en?.classId === group.fromClassId && en.status === 'ACTIVE';
    });
  }, [group, students, promotedStudentIds]);

  const filteredAddable = useMemo(() => {
    if (!search.trim()) return addableStudents;
    const q = search.trim().toLowerCase();
    return addableStudents.filter((s) => {
      const en = group ? getEnrollmentForYear(s, group.fromYear) : undefined;
      const className = en?.class?.name?.toLowerCase() ?? '';
      return (
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentUid.toLowerCase().includes(q) ||
        (s.studentCode ?? '').toLowerCase().includes(q) ||
        (s.sdmCode ?? '').toLowerCase().includes(q) ||
        className.includes(q)
      );
    });
  }, [addableStudents, search, group]);

  async function handleRemove(recordId: string) {
    setActionId(recordId);
    try {
      await onRemove(recordId);
    } finally {
      setActionId(null);
    }
  }

  async function handleAdd(student: Student) {
    if (!group) return;
    const en = getEnrollmentForYear(student, group.fromYear);
    if (!en) return;
    setActionId(student.id);
    try {
      await onAdd(en.id);
    } finally {
      setActionId(null);
    }
  }

  if (!group) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '85vh' } } }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Edit Promotion Students</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography sx={{ fontWeight: 800, color: NAVY }}>{shortClassLabel(group.fromClass)}</Typography>
          <ArrowForwardIcon sx={{ fontSize: 18, color: '#FCB038' }} />
          <Typography sx={{ fontWeight: 800, color: NAVY }}>
            {group.toClass ? shortClassLabel(group.toClass) : '—'}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', ml: 1 }}>
            {formatYearDisplay(group.fromYear)} → {group.toYear ? formatYearDisplay(group.toYear) : '—'}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 1, textTransform: 'uppercase' }}>
          Current Students ({group.studentCount})
        </Typography>

        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Student</TableCell>
                <TableCell sx={headerSx}>Code</TableCell>
                <TableCell sx={headerSx} align="right">
                  Remove
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {group.records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                    No students in this promotion.
                  </TableCell>
                </TableRow>
              ) : (
                group.records.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {studentDisplayName(record.student)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {record.student.studentCode || record.student.studentUid}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove from promotion">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={busy || actionId === record.id || group.records.length === 1}
                            onClick={() => handleRemove(record.id)}
                          >
                            {actionId === record.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <DeleteOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>

        {group.records.length === 1 && (
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem' }}>
            At least one student must remain. To revert the entire promotion, use Delete on the dashboard.
          </Alert>
        )}

        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 1, textTransform: 'uppercase' }}>
          Add Students from {shortClassLabel(group.fromClass)}
        </Typography>

        <TextField
          size="small"
          fullWidth
          placeholder="Search by name, code, SDMS…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', maxHeight: 240 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Student</TableCell>
                <TableCell sx={headerSx}>Code</TableCell>
                <TableCell sx={headerSx} align="right">
                  Add
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAddable.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: '0.8125rem' }}>
                    {addableStudents.length === 0
                      ? 'No eligible students left in this class.'
                      : 'No students match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAddable.map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {studentDisplayName(student)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {student.studentCode || student.studentUid}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Add to promotion">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ color: NAVY }}
                            disabled={busy || actionId === student.id}
                            onClick={() => handleAdd(student)}
                          >
                            {actionId === student.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <AddIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onClose}
          disabled={busy}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: NAVY, '&:hover': { bgcolor: '#0a1055' } }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

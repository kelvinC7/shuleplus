import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import type { ApiClass } from '@/types';
import { classLabel, formatYearDisplay, NAVY } from '../utils';

interface IndividualAssignmentPanelProps {
  toYear: string;
  classes: ApiClass[];
  selectedCount: number;
  classId: string | null;
  stream: string | null;
  onClassChange: (id: string | null) => void;
  onStreamChange: (stream: string | null) => void;
  onApply: () => void;
}

export function IndividualAssignmentPanel({
  toYear,
  classes,
  selectedCount,
  classId,
  stream,
  onClassChange,
  onStreamChange,
  onApply,
}: IndividualAssignmentPanelProps) {
  if (selectedCount === 0) return null;

  const selectedClass = classes.find((c) => c.id === classId);
  const streamOptions = selectedClass
    ? [...new Set(classes.filter((c) => c.name === selectedClass.name && c.stream).map((c) => c.stream!))]
    : [];

  return (
    <Box
      sx={{
        border: '1px solid rgba(252,176,56,0.35)',
        borderRadius: 2,
        bgcolor: 'rgba(252,176,56,0.06)',
        p: 2.5,
      }}
    >
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, mb: 0.5 }}>
        {selectedCount} Student{selectedCount !== 1 ? 's' : ''} Selected
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 2 }}>
        Assign a default class for the new academic year ({formatYearDisplay(toYear)}). You can still adjust each student individually in the table.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>New Class</InputLabel>
          <Select
            label="New Class"
            value={classId ?? ''}
            onChange={(e) => {
              onClassChange(e.target.value || null);
              onStreamChange(null);
            }}
            sx={{ borderRadius: 2, bgcolor: 'white' }}
          >
            {[...new Map(classes.map((c) => [c.name, c])).values()].map((c) => (
              <MenuItem key={c.name} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {streamOptions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>New Stream</InputLabel>
            <Select
              label="New Stream"
              value={stream ?? ''}
              onChange={(e) => onStreamChange(e.target.value || null)}
              sx={{ borderRadius: 2, bgcolor: 'white' }}
            >
              {streamOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button
          variant="contained"
          onClick={onApply}
          disabled={!classId}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: NAVY, '&:hover': { bgcolor: '#0a1055' } }}
        >
          Apply to Selected
        </Button>
      </Box>

      {selectedClass && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1.5 }}>
          Preview: {classLabel(selectedClass)}
          {stream ? ` ${stream}` : ''}
        </Typography>
      )}
    </Box>
  );
}

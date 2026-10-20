import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from '@mui/material';
import type { ReportColumnId } from '../types';
import { EXPORT_COLUMN_LABELS } from '../utils';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

interface ExportReportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, columns: string[], scope: 'filtered' | 'selected' | 'all') => void;
  selectedCount: number;
  filteredCount: number;
  totalCount: number;
  visibleColumns: Set<ReportColumnId>;
  academicYear?: string;
  term?: string;
}

const ALL_EXPORT_COLS = ['Student Name', ...Object.values(EXPORT_COLUMN_LABELS)];

export function ExportReportModal({
  open,
  onClose,
  onExport,
  selectedCount,
  filteredCount,
  totalCount,
  visibleColumns,
  academicYear,
  term,
}: ExportReportModalProps) {
  const defaultCols = ['Student Name', ...Array.from(visibleColumns).map((id) => EXPORT_COLUMN_LABELS[id])];
  const [columns, setColumns] = useState<string[]>(defaultCols);
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [scope, setScope] = useState<'filtered' | 'selected' | 'all'>('filtered');

  useEffect(() => {
    if (open) {
      setColumns(defaultCols);
      setScope(selectedCount > 0 ? 'selected' : 'filtered');
    }
  }, [open, selectedCount, defaultCols.join('|')]);

  function toggleCol(col: string) {
    setColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: '#000435' }}>Export Student Report</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: '1fr 1fr' }}>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Academic Year</Typography>
              <Typography sx={{ fontWeight: 700 }}>{academicYear || 'All'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Term</Typography>
              <Typography sx={{ fontWeight: 700 }}>{term || 'All Terms'}</Typography>
            </Box>
          </Box>

          <FormControl size="small">
            <InputLabel>Export scope</InputLabel>
            <Select label="Export scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <MenuItem value="filtered" disabled={filteredCount === 0}>Current filtered ({filteredCount})</MenuItem>
              <MenuItem value="selected" disabled={selectedCount === 0}>Selected only ({selectedCount})</MenuItem>
              <MenuItem value="all">All students ({totalCount})</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 1 }}>Columns</Typography>
            <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {ALL_EXPORT_COLS.map((col) => (
                <FormControlLabel
                  key={col}
                  control={<Checkbox size="small" checked={columns.includes(col)} onChange={() => toggleCol(col)} />}
                  label={<Typography sx={{ fontSize: '0.8125rem' }}>{col}</Typography>}
                />
              ))}
            </FormGroup>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 1 }}>Format</Typography>
            <RadioGroup row value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
              <FormControlLabel value="xlsx" control={<Radio size="small" />} label="Excel" />
              <FormControlLabel value="csv" control={<Radio size="small" />} label="CSV" />
              <FormControlLabel value="pdf" control={<Radio size="small" />} label="PDF (Print)" />
            </RadioGroup>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={columns.length === 0}
          onClick={() => onExport(format, columns, scope)}
          sx={{ bgcolor: '#000435', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Export Report
        </Button>
      </DialogActions>
    </Dialog>
  );
}

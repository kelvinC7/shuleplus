import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, FormControl, InputLabel, Select, MenuItem,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import GradeIcon from '@mui/icons-material/Grade';
import SaveIcon from '@mui/icons-material/Save';
import { getGradingScale, upsertGradingScale } from '@/services/api';
import type { ApiGradingScale } from '@/types';

const LEVELS = [
  { value: 'NURSERY', label: 'Nursery' },
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'O_LEVEL', label: 'O-Level' },
  { value: 'A_LEVEL', label: 'A-Level' },
  { value: 'UNIVERSITY', label: 'University' },
];

interface GradeRow {
  minPercentage: string;
  maxPercentage: string;
  grade: string;
  description: string;
  remarks: string;
}

const DEFAULT_GRADES: GradeRow[] = [
  { minPercentage: '80', maxPercentage: '100', grade: 'A', description: 'Excellent', remarks: '' },
  { minPercentage: '70', maxPercentage: '79.99', grade: 'B', description: 'Very Good', remarks: '' },
  { minPercentage: '60', maxPercentage: '69.99', grade: 'C', description: 'Good', remarks: '' },
  { minPercentage: '50', maxPercentage: '59.99', grade: 'D', description: 'Satisfactory', remarks: '' },
  { minPercentage: '0', maxPercentage: '49.99', grade: 'E', description: 'Needs Improvement', remarks: '' },
];

export default function GradingScalePage() {
  const [level, setLevel] = useState('PRIMARY');
  const [scaleName, setScaleName] = useState('School Standard');
  const [grades, setGrades] = useState<GradeRow[]>(DEFAULT_GRADES);
  const [existing, setExisting] = useState<ApiGradingScale[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getGradingScale(level)
      .then((data) => {
        setExisting(data);
        if (data.length > 0) {
          setScaleName(data[0].name);
          setGrades(data.map((g: ApiGradingScale) => ({
            minPercentage: String(g.minPercentage),
            maxPercentage: String(g.maxPercentage),
            grade: g.grade,
            description: g.description || '',
            remarks: g.remarks || '',
          })));
        } else {
          setGrades(DEFAULT_GRADES);
          setScaleName('School Standard');
        }
      })
      .catch(() => setGrades(DEFAULT_GRADES))
      .finally(() => setLoading(false));
  }, [level]);

  const addRow = () => {
    setGrades([...grades, { minPercentage: '', maxPercentage: '', grade: '', description: '', remarks: '' }]);
  };

  const removeRow = (idx: number) => {
    setGrades(grades.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof GradeRow, value: string) => {
    setGrades(grades.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertGradingScale({
        name: scaleName,
        academicLevel: level,
        grades: grades
          .filter((g) => g.grade && g.minPercentage && g.maxPercentage)
          .map((g) => ({
            minPercentage: parseFloat(g.minPercentage),
            maxPercentage: parseFloat(g.maxPercentage),
            grade: g.grade,
            description: g.description || undefined,
            remarks: g.remarks || undefined,
          })),
      });
      const data = await getGradingScale(level);
      setExisting(data);
    } catch {
      /* interceptor toasts the error */
    }
    setSaving(false);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GradeIcon sx={{ color: '#000435', fontSize: 20 }} />
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>Grading Scale</Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
          {saving ? 'Saving...' : 'Save Scale'}
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Education Level</InputLabel>
            <Select label="Education Level" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Scale Name" size="small" value={scaleName} onChange={(e) => setScaleName(e.target.value)} sx={{ minWidth: 200 }} />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : (
          <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Grade Boundaries ({LEVELS.find((l) => l.value === level)?.label})
              </Typography>
              <Button startIcon={<AddIcon />} onClick={addRow} size="small" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                Add Grade
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Grade', 'Min %', 'Max %', 'Description', 'Remarks', ''].map((h) => (
                      <TableCell key={h} sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grades.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ width: 80 }}>
                        <TextField size="small" value={row.grade} onChange={(e) => updateRow(idx, 'grade', e.target.value)} placeholder="A" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                      </TableCell>
                      <TableCell sx={{ width: 100 }}>
                        <TextField size="small" type="number" value={row.minPercentage} onChange={(e) => updateRow(idx, 'minPercentage', e.target.value)} inputProps={{ min: 0, max: 100 }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                      </TableCell>
                      <TableCell sx={{ width: 100 }}>
                        <TextField size="small" type="number" value={row.maxPercentage} onChange={(e) => updateRow(idx, 'maxPercentage', e.target.value)} inputProps={{ min: 0, max: 100 }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={row.description} onChange={(e) => updateRow(idx, 'description', e.target.value)} placeholder="e.g. Excellent" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={row.remarks} onChange={(e) => updateRow(idx, 'remarks', e.target.value)} placeholder="Optional" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                      </TableCell>
                      <TableCell sx={{ width: 40 }}>
                        <IconButton size="small" onClick={() => removeRow(idx)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
                          <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </Box>
  );
}

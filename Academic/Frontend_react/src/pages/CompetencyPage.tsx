import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, FormControl, InputLabel, Select, MenuItem,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import PsychologyIcon from '@mui/icons-material/Psychology';
import EditIcon from '@mui/icons-material/Edit';
import {
  listCompetencyTemplates, createCompetencyTemplate, updateCompetencyTemplate,
  deleteCompetencyTemplate, recordStudentCompetency, getStudentCompetencies,
} from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type { CompetencyTemplate, StudentCompetency } from '@/types';

const LEVELS = [
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'O_LEVEL', label: 'O-Level' },
  { value: 'A_LEVEL', label: 'A-Level' },
  { value: 'UNIVERSITY', label: 'University' },
];

interface CompetencyItem {
  name: string;
  description: string;
  ratingLevels: string[];
}

function emptyCompetencies(): CompetencyItem[] {
  return [{ name: '', description: '', ratingLevels: ['Developing', 'Competent', 'Proficient'] }];
}

export default function CompetencyPage() {
  const { settings } = useAcademicSettings();
  const [templates, setTemplates] = useState<CompetencyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateLevel, setTemplateLevel] = useState('PRIMARY');
  const [templateDesc, setTemplateDesc] = useState('');
  const [competencies, setCompetencies] = useState<CompetencyItem[]>(emptyCompetencies());

  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [studentRecords, setStudentRecords] = useState<StudentCompetency[]>([]);

  const loadTemplates = () => {
    setLoading(true);
    listCompetencyTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTemplates(); }, []);

  const openCreateDialog = () => {
    setEditId(null);
    setTemplateName('');
    setTemplateLevel('PRIMARY');
    setTemplateDesc('');
    setCompetencies(emptyCompetencies());
    setDialogOpen(true);
  };

  const openEditDialog = (t: CompetencyTemplate) => {
    setEditId(t.id);
    setTemplateName(t.name);
    setTemplateLevel(t.academicLevel);
    setTemplateDesc(t.description || '');
    const parsed = Array.isArray(t.competencies) ? t.competencies : [];
    setCompetencies(parsed.length > 0 ? parsed : emptyCompetencies());
    setDialogOpen(true);
  };

  const addCompetency = () => {
    setCompetencies([...competencies, { name: '', description: '', ratingLevels: ['Developing', 'Competent', 'Proficient'] }]);
  };

  const removeCompetency = (idx: number) => {
    setCompetencies(competencies.filter((_, i) => i !== idx));
  };

  const updateCompetency = (idx: number, field: keyof CompetencyItem, value: any) => {
    setCompetencies(competencies.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const handleSaveTemplate = async () => {
    const valid = competencies.filter((c) => c.name.trim());
    if (!templateName.trim() || valid.length === 0) return;
    try {
      if (editId) {
        await updateCompetencyTemplate(editId, {
          name: templateName,
          academicLevel: templateLevel,
          competencies: valid,
          description: templateDesc || undefined,
        });
      } else {
        await createCompetencyTemplate({
          name: templateName,
          academicLevel: templateLevel,
          competencies: valid,
          description: templateDesc || undefined,
        });
      }
      setDialogOpen(false);
      loadTemplates();
    } catch {
      /* interceptor toasts the error */
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteCompetencyTemplate(id);
      loadTemplates();
    } catch {
      /* interceptor toasts the error */
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PsychologyIcon sx={{ color: '#000435', fontSize: 20 }} />
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>Competency Assessment</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
          New Template
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : templates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <PsychologyIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>No competency templates yet</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            {templates.map((t) => {
              const items = Array.isArray(t.competencies) ? t.competencies : [];
              return (
                <Box key={t.id} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b' }}>{t.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => openEditDialog(t)} sx={{ color: '#94a3b8' }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => handleDeleteTemplate(t.id)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}><DeleteOutlinedIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                  </Box>
                  <Chip label={LEVELS.find((l) => l.value === t.academicLevel)?.label || t.academicLevel} size="small" sx={{ mb: 1, height: 20, fontSize: '0.625rem', fontWeight: 600, bgcolor: 'rgba(0,4,53,0.05)' }} />
                  {t.description && <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 1 }}>{t.description}</Typography>}
                  <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>Competencies ({items.length})</Typography>
                  {items.map((c: any, idx: number) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#000435', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.75rem', color: '#334155' }}>{c.name}</Typography>
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editId ? 'Edit' : 'New'} Competency Template</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField label="Template Name" size="small" value={templateName} onChange={(e) => setTemplateName(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <FormControl size="small" sx={{ minWidth: 180, mb: 2 }}>
            <InputLabel>Education Level</InputLabel>
            <Select label="Education Level" value={templateLevel} onChange={(e) => setTemplateLevel(e.target.value)}>
              {LEVELS.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Description (Optional)" size="small" value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} fullWidth multiline rows={2} sx={{ mb: 2 }} />

          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>Competencies</Typography>
          {competencies.map((c, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-end' }}>
              <TextField label="Competency Name" size="small" value={c.name} onChange={(e) => updateCompetency(idx, 'name', e.target.value)} sx={{ flex: 2 }} />
              <TextField label="Description" size="small" value={c.description} onChange={(e) => updateCompetency(idx, 'description', e.target.value)} sx={{ flex: 3 }} />
              <IconButton size="small" onClick={() => removeCompetency(idx)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addCompetency} size="small" sx={{ textTransform: 'none', mt: 0.5 }}>
            Add Competency
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplate} disabled={!templateName.trim()} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
            {editId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

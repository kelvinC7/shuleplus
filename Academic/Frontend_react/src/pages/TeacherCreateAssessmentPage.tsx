import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, CircularProgress, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createAssessment, listAssessmentTemplates, smListClasses, smListStudents, smListSubjects } from '@/services/api';
import { toast } from '@/lib/toast';
import { useAcademicSettings } from '@/contexts/academic-settings-context';

export default function TeacherCreateAssessmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useAcademicSettings();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subjectId: searchParams.get('subjectId') || '',
    classId: searchParams.get('classId') || '',
    templateId: '',
    componentId: '',
    maxMark: '20',
    assessmentDate: new Date().toISOString().split('T')[0],
    duration: '',
    description: '',
    academicYear: settings?.currentAcademicYear || '',
    term: settings?.currentTerm || '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subj, cls, tmpl] = await Promise.all([
        smListSubjects().catch(() => []),
        smListClasses().catch(() => []),
        listAssessmentTemplates({ academicYear: form.academicYear, term: form.term }).catch(() => []),
      ]);
      setSubjects(subj);
      setClasses(cls);
      setTemplates(tmpl);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [form.academicYear, form.term]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (settings?.currentAcademicYear) setForm((p) => ({ ...p, academicYear: settings.currentAcademicYear! }));
    if (settings?.currentTerm) setForm((p) => ({ ...p, term: settings.currentTerm! }));
  }, [settings]);

  const selectedTemplate = templates.find((t: any) => t.id === form.templateId);
  const components = selectedTemplate?.components || [];

  const selectedClass = classes.find((c: any) => c.id === form.classId);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!form.classId) { setEnrolledStudents([]); return; }
    smListStudents({ classId: form.classId }).then((data) => setEnrolledStudents(data ?? [])).catch(() => setEnrolledStudents([]));
  }, [form.classId]);

  const handleSave = async () => {
    if (!form.title || !form.subjectId || !form.classId) {
      toast.warning('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const result = await createAssessment({
        title: form.title.trim(),
        subjectId: form.subjectId,
        classId: form.classId,
        templateId: form.templateId || undefined,
        componentId: form.componentId || undefined,
        maxMark: parseFloat(form.maxMark) || 20,
        assessmentDate: form.assessmentDate || undefined,
        duration: form.duration || undefined,
        description: form.description || undefined,
        academicYear: form.academicYear,
        term: form.term,
      });
      setTimeout(() => navigate(`/teacher/mark-entry/${result.id}`), 700);
    } catch {
      /* interceptor toasts the error */
    }
    setSaving(false);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f4f6f9' }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/teacher')} size="small" sx={{ color: '#64748b' }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>Create Assessment</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Create a new assessment for your class</Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'center' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : (
          <Box sx={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Course Info */}
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Course Information</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Assessment Title" required fullWidth size="small" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mathematics Quiz 1" />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Subject</InputLabel>
                      <Select label="Subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                        {subjects.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Class</InputLabel>
                      <Select label="Class" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                        {classes.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.stream ? `${c.name} ${c.stream}` : c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  {form.classId && enrolledStudents.length > 0 && (
                    <Box sx={{ bgcolor: '#f8fafc', borderRadius: 1, p: 1.5, border: '1px solid #e2e8f0' }}>
                      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                        {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''} enrolled
                      </Typography>
                      <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                        Students will appear when you enter marks
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Assessment Details */}
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Assessment Details</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Template (optional)</InputLabel>
                      <Select label="Template (optional)" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value, componentId: '' })}>
                        <MenuItem value=""><em>None</em></MenuItem>
                        {templates.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                    {components.length > 0 && (
                      <FormControl fullWidth size="small">
                        <InputLabel>Category</InputLabel>
                        <Select label="Category" value={form.componentId} onChange={(e) => setForm({ ...form, componentId: e.target.value })}>
                          {components.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name} ({c.weightPercentage}%)</MenuItem>)}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="Maximum Mark" type="number" required size="small" fullWidth value={form.maxMark} onChange={(e) => setForm({ ...form, maxMark: e.target.value })} inputProps={{ min: 1 }} />
                    <TextField label="Date" type="date" size="small" fullWidth value={form.assessmentDate} onChange={(e) => setForm({ ...form, assessmentDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                  </Box>
                  <TextField label="Duration (optional)" size="small" fullWidth value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 45 minutes" />
                  <TextField label="Description (optional)" size="small" fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Box>
              </CardContent>
            </Card>

            {/* Period */}
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Period</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Academic Year</InputLabel>
                    <Select label="Academic Year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
                      {settings?.academicYears?.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Term</InputLabel>
                    <Select label="Term" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                      {settings?.terms?.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              </CardContent>
            </Card>

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/teacher')} sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}>
                Cancel
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving || !form.title || !form.subjectId || !form.classId} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
                {saving ? 'Creating...' : 'Create & Enter Marks'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

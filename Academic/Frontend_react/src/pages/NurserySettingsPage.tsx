import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import {
  deleteNurseryClassConfig,
  getNurserySettings,
  listNurseryClasses,
  saveNurseryClassConfig,
  saveNurseryPerformanceBands,
  saveNurseryTemplate,
} from '@/services/api';
import type {
  NurseryClassRow,
  NurseryPerformanceBand,
  NurseryReportSnapshot,
  NurserySettings,
  NurseryTemplateSettings,
} from '@/types/nursery';
import NurseryReportCard from '@/components/nursery/NurseryReportCard';
import { toast } from '@/lib/toast';

const NAVY = '#000435';
const BORDER = '#e2e8f0';
const MUTED = '#64748b';
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', fontSize: '0.875rem' } };

const TABS: Array<{ label: string; icon: ReactElement }> = [
  { label: 'Class Configuration', icon: <SchoolOutlinedIcon fontSize="small" /> },
  { label: 'Performance Colors', icon: <PaletteOutlinedIcon fontSize="small" /> },
  { label: 'Report Template', icon: <ArticleOutlinedIcon fontSize="small" /> },
];

const TOGGLE_FIELDS: Array<{ key: keyof NurseryTemplateSettings; label: string }> = [
  { key: 'showLogo', label: 'School logo' },
  { key: 'showHeaderLines', label: 'School header lines' },
  { key: 'showStudentPhoto', label: 'Student photo' },
  { key: 'showStudentDetails', label: 'Student details' },
  { key: 'showPerformanceLegend', label: 'Performance legend' },
  { key: 'showQR', label: 'QR verification' },
  { key: 'showTeacherSignature', label: 'Teacher signature' },
  { key: 'showHeadTeacherSignature', label: 'Head teacher signature' },
  { key: 'showParentSignature', label: 'Parent signature' },
];

function SectionCard({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2.5, border: `1px solid ${BORDER}`, boxShadow: 'none' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: NAVY }}>{title}</Typography>
          {subtitle ? <Typography sx={{ fontSize: '0.8125rem', color: MUTED, mt: 0.25 }}>{subtitle}</Typography> : null}
        </Box>
        {actions}
      </Box>
      {children}
    </Paper>
  );
}

function ClassConfigTab({
  classes,
  academicYear,
  loading,
  onRefresh,
}: {
  classes: NurseryClassRow[];
  academicYear: string;
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(row: NurseryClassRow, patch: { enabled?: boolean; templateKey?: string }) {
    setSavingId(row.classId);
    try {
      await saveNurseryClassConfig({
        classId: row.classId,
        className: row.label,
        academicYear,
        templateKey: patch.templateKey ?? row.templateKey,
        enabled: patch.enabled ?? row.enabled ?? true,
      });
      toast.success(`${row.label} configuration saved`);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the class configuration');
    } finally {
      setSavingId(null);
    }
  }

  async function remove(row: NurseryClassRow) {
    if (!row.configId) return;
    if (!window.confirm(`Remove the nursery report configuration for ${row.label}?`)) return;
    setSavingId(row.classId);
    try {
      await deleteNurseryClassConfig(row.configId);
      toast.success(`${row.label} configuration removed`);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the configuration');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <SectionCard
      title="Class configuration"
      subtitle={`Assign the nursery report template to existing classes for ${academicYear}. Duplicate class + year configurations are prevented automatically.`}
      actions={
        <Button variant="outlined" size="small" onClick={() => void onRefresh()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Refresh classes
        </Button>
      }
    >
      {loading ? <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} /> : null}
      {!loading && !classes.length ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No classes found for {academicYear}. Add classes in Student Management first, then return here.
        </Alert>
      ) : null}
      {classes.length ? (
        <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Class', 'Source', 'Subjects', 'Template', 'Enabled', ''].map((heading) => (
                  <TableCell key={heading || 'actions'} sx={{ bgcolor: '#f8fafc', color: MUTED, fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {classes.map((row) => {
                const busy = savingId === row.classId;
                return (
                  <TableRow key={row.classId} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: NAVY }}>{row.label}</Typography>
                      <Typography sx={{ fontSize: '0.6875rem', color: MUTED }}>
                        {[row.name, row.stream].filter(Boolean).join(' · ') || row.classId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={row.source === 'student-management' ? 'Student Mgmt' : 'Academic'} sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8125rem', color: '#334155' }}>{row.subjectCount}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={row.templateKey || 'nursery-standard'}
                        onChange={(event) => void save(row, { templateKey: event.target.value, enabled: true })}
                        disabled={busy}
                        sx={{ ...fieldSx, minWidth: 160 }}
                      >
                        <MenuItem value="nursery-standard">Nursery standard</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={row.configured && row.enabled}
                        disabled={busy}
                        onChange={(event) => void save(row, { enabled: event.target.checked })}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {busy ? <CircularProgress size={18} /> : null}
                      {row.configId ? (
                        <Tooltip title="Remove configuration">
                          <IconButton size="small" onClick={() => void remove(row)} disabled={busy}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Button size="small" onClick={() => void save(row, { enabled: true })} sx={{ textTransform: 'none', fontWeight: 700 }}>
                          Configure
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </SectionCard>
  );
}

function PerformanceTab({
  bands,
  onSaved,
}: {
  bands: NurseryPerformanceBand[];
  onSaved: (bands: NurseryPerformanceBand[]) => void;
}) {
  const [rows, setRows] = useState<NurseryPerformanceBand[]>(bands);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(bands);
  }, [bands]);

  function update(index: number, patch: Partial<NurseryPerformanceBand>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function validate(): string {
    if (rows.length < 2) return 'Use at least two performance levels.';
    if (rows.length > 8) return 'Use at most eight performance levels.';
    const labels = new Set<string>();
    for (const row of rows) {
      if (!row.label.trim()) return 'Every performance level needs a label.';
      if (labels.has(row.label.trim().toLowerCase())) return 'Performance level labels must be different.';
      labels.add(row.label.trim().toLowerCase());
      if (!/^#[0-9a-f]{6}$/i.test(row.color)) return `Choose a valid colour for “${row.label}”.`;
      if (!Number.isFinite(row.minPercentage) || !Number.isFinite(row.maxPercentage)) return 'Every level needs a minimum and maximum.';
      if (row.minPercentage < 0 || row.maxPercentage > 100 || row.minPercentage >= row.maxPercentage) {
        return `“${row.label}” must satisfy 0 ≤ min < max ≤ 100.`;
      }
    }
    const ascending = [...rows].sort((a, b) => a.minPercentage - b.minPercentage);
    if (ascending[0].minPercentage > 0.001) return 'The lowest level must start at 0.';
    if (ascending[ascending.length - 1].maxPercentage < 99.999) return 'The highest level must end at 100.';
    for (let index = 1; index < ascending.length; index += 1) {
      const previous = ascending[index - 1];
      const current = ascending[index];
      if (current.minPercentage < previous.maxPercentage - 0.001) {
        return `“${previous.label}” and “${current.label}” overlap.`;
      }
      if (current.minPercentage > previous.maxPercentage + 1.01) {
        return `Marks between ${previous.maxPercentage} and ${current.minPercentage} are not covered.`;
      }
    }
    return '';
  }

  async function save() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const result = await saveNurseryPerformanceBands(rows);
      onSaved(result.performance);
      toast.success('Performance colours saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save performance colours');
    } finally {
      setSaving(false);
    }
  }

  const ascending = [...rows].sort((a, b) => a.minPercentage - b.minPercentage);

  return (
    <SectionCard
      title="Performance colours"
      subtitle="These labels, ranges and colours are used on every nursery report card. Ranges must cover 0–100 without overlaps or gaps."
      actions={
        <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => void save()} disabled={saving} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY }}>
          {saving ? 'Saving…' : 'Save colours'}
        </Button>
      }
    >
      {error ? <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert> : null}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {ascending.map((row) => (
          <Box key={`${row.label}-${row.minPercentage}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5, borderRadius: 999, bgcolor: `${row.color}18`, border: `1px solid ${row.color}55` }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>{row.label || 'Untitled'}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: MUTED }}>{row.minPercentage}–{row.maxPercentage}%</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', border: `1px solid ${BORDER}`, mb: 2.5 }}>
        {ascending.map((row) => (
          <Box key={`${row.label}-bar`} sx={{ width: `${Math.max(0, row.maxPercentage - row.minPercentage + 1)}%`, bgcolor: row.color }} />
        ))}
      </Box>

      <Stack spacing={1.25}>
        {rows.map((row, index) => (
          <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(160px, 1.4fr) 110px 110px 130px 44px' }, gap: 1, alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 2, p: 1.25 }}>
            <TextField size="small" label="Label" value={row.label} onChange={(event) => update(index, { label: event.target.value })} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 40 } }} />
            <TextField
              size="small"
              type="number"
              label="Min %"
              value={row.minPercentage}
              onChange={(event) => update(index, { minPercentage: Number(event.target.value) })}
              sx={fieldSx}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Max %"
              value={row.maxPercentage}
              onChange={(event) => update(index, { maxPercentage: Number(event.target.value) })}
              sx={fieldSx}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="input" type="color" value={row.color} onChange={(event: ChangeEvent<HTMLInputElement>) => update(index, { color: event.target.value.toUpperCase() })} sx={{ width: 38, height: 34, border: `1px solid ${BORDER}`, borderRadius: 1, p: 0.25, bgcolor: '#fff', cursor: 'pointer' }} />
              <TextField size="small" value={row.color} onChange={(event) => update(index, { color: event.target.value.toUpperCase() })} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 7 } }} />
            </Box>
            <Tooltip title="Remove level">
              <span>
                <IconButton size="small" disabled={rows.length <= 2} onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}
      </Stack>

      <Button
        startIcon={<AddRoundedIcon />}
        onClick={() => setRows((prev) => [...prev, { label: 'New level', minPercentage: 0, maxPercentage: 0, color: '#64748B' }])}
        disabled={rows.length >= 8}
        sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}
      >
        Add performance level
      </Button>
    </SectionCard>
  );
}

function sampleSnapshot(template: NurseryTemplateSettings, bands: NurseryPerformanceBand[]): NurseryReportSnapshot {
  const subjects = [
    { subjectName: 'Counting and Numbers', learningArea: 'Numbers', percentage: 92, maxMark: 100 },
    { subjectName: 'Number Writing', learningArea: 'Numbers', percentage: 86, maxMark: 100 },
    { subjectName: 'Listening and Speaking', learningArea: 'English', percentage: 78, maxMark: 100 },
    { subjectName: 'Reading Readiness', learningArea: 'English', percentage: 74, maxMark: 100 },
    { subjectName: 'Kinyarwanda Conversation', learningArea: 'Kinyarwanda', percentage: 88, maxMark: 100 },
    { subjectName: 'French Songs', learningArea: 'French', percentage: 65, maxMark: 100 },
    { subjectName: 'Health Habits', learningArea: 'Social Development and Health Habits', percentage: 95, maxMark: 100 },
  ].map((row) => ({
    subjectId: row.subjectName,
    subjectName: row.subjectName,
    learningArea: row.learningArea,
    maxMark: row.maxMark,
    percentage: row.percentage,
    score: (row.percentage / 100) * row.maxMark,
    band: bands.find((band) => row.percentage >= band.minPercentage && row.percentage <= band.maxPercentage) ?? bands[bands.length - 1] ?? null,
    isVisible: true,
    contributesToTotal: true,
  }));
  const totalScore = subjects.reduce((sum, row) => sum + (row.score ?? 0), 0);
  const totalMax = subjects.reduce((sum, row) => sum + row.maxMark, 0);
  const average = (totalScore / totalMax) * 100;
  const groups = new Map<string, typeof subjects>();
  for (const subject of subjects) {
    if (!groups.has(subject.learningArea)) groups.set(subject.learningArea, []);
    groups.get(subject.learningArea)!.push(subject);
  }
  return {
    kind: 'nursery',
    reportKind: 'standard',
    school: {
      name: 'Shule+ Nursery School',
      motto: 'Learn · Play · Grow',
      address: 'Kigali, Rwanda',
      phone: '+250 788 000 000',
      email: 'school@example.rw',
      logoUrl: null,
      rightLogoUrl: null,
      stampUrl: null,
      headerLines: ['Kigali, Rwanda', 'Tel: +250 788 000 000 · school@example.rw'],
      organizationCode: 'DEMO',
    },
    student: {
      id: 'demo',
      name: 'Aline Uwase',
      studentCode: 'SP-2026-014',
      gender: 'FEMALE',
      photoUrl: null,
    },
    class: { id: 'demo', name: 'Nursery 2' },
    academicYear: '2025-2026',
    term: 'Term 1',
    template,
    bands,
    subjects,
    groups: [...groups.entries()].map(([learningArea, groupSubjects]) => ({ learningArea, subjects: groupSubjects })),
    totals: { totalScore, totalMax, average, classAverage: 79.4, position: 3, classSize: 24 },
    comments: {
      teacher: 'Aline is a confident learner who enjoys number games and participates well in class activities.',
      headTeacher: 'Good progress. Keep encouraging reading at home.',
    },
    meta: {
      reportNumber: 'NRC-2026-DEMO0001',
      verificationCode: 'NRC-2026-DEMO0001',
      verifyUrl: 'https://parents.shuleplus.rw/verify/report?ref=NRC-2026-DEMO0001',
      generatedAt: new Date().toISOString(),
    },
  };
}

function TemplateTab({
  template,
  bands,
  onSaved,
}: {
  template: NurseryTemplateSettings;
  bands: NurseryPerformanceBand[];
  onSaved: (template: NurseryTemplateSettings) => void;
}) {
  const [value, setValue] = useState<NurseryTemplateSettings>(template);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(template);
  }, [template]);

  const preview = useMemo(() => sampleSnapshot(value, bands), [value, bands]);

  function update<K extends keyof NurseryTemplateSettings>(key: K, next: NurseryTemplateSettings[K]) {
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  async function save() {
    if (!value.title.trim()) {
      setError('Report title is required.');
      return;
    }
    if (!/^#[0-9a-f]{6}$/i.test(value.accentColor)) {
      setError('Accent colour must be a hex value such as #000435.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const result = await saveNurseryTemplate(value);
      onSaved(result.template);
      toast.success('Report template saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.15fr) minmax(0, 1fr)' }, gap: 2, alignItems: 'start' }}>
      <SectionCard
        title="Report template"
        subtitle="Control the school header, student information, performance table, legend, overall performance, comments, signatures and QR verification."
        actions={
          <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => void save()} disabled={saving} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY }}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
        }
      >
        {error ? <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert> : null}
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <TextField size="small" label="Report title" value={value.title} onChange={(event) => update('title', event.target.value)} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 80 } }} />
            <TextField size="small" label="Subtitle" value={value.subtitle} onChange={(event) => update('subtitle', event.target.value)} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 120 } }} />
            <TextField size="small" label="Teacher title" value={value.teacherTitle} onChange={(event) => update('teacherTitle', event.target.value)} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 60 } }} />
            <TextField size="small" label="Head teacher name" value={value.headTeacherName} onChange={(event) => update('headTeacherName', event.target.value)} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 120 } }} />
            <TextField size="small" label="Head teacher title" value={value.headTeacherTitle} onChange={(event) => update('headTeacherTitle', event.target.value)} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 60 } }} />
            <TextField size="small" label="Parent signature label" value={value.parentLabel} onChange={(event) => update('parentLabel', event.target.value)} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 60 } }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="input" type="color" value={value.accentColor} onChange={(event: ChangeEvent<HTMLInputElement>) => update('accentColor', event.target.value.toUpperCase())} sx={{ width: 42, height: 38, border: `1px solid ${BORDER}`, borderRadius: 1, p: 0.25, bgcolor: '#fff', cursor: 'pointer' }} />
              <TextField size="small" label="Accent colour" value={value.accentColor} onChange={(event) => update('accentColor', event.target.value.toUpperCase())} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 7 } }} />
            </Box>
            <TextField size="small" label="Footer note" value={value.footerNote} onChange={(event) => update('footerNote', event.target.value)} sx={fieldSx} slotProps={{ htmlInput: { maxLength: 240 } }} />
          </Box>

          <Divider />

          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
              Sections to show
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.25 }}>
              {TOGGLE_FIELDS.map((field) => (
                <FormControlLabel
                  key={field.key}
                  control={
                    <Switch
                      size="small"
                      checked={Boolean(value[field.key])}
                      onChange={(event) =>
                        setValue((prev) => ({ ...prev, [field.key]: event.target.checked } as NurseryTemplateSettings))
                      }
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.8125rem', color: '#334155' }}>{field.label}</Typography>}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </SectionCard>

      <Box sx={{ position: { xl: 'sticky' }, top: 16 }}>
        <Paper sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${BORDER}`, boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Live A4 preview
            </Typography>
            <Chip size="small" label="Sample data" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700 }} />
          </Box>
          <Box sx={{ height: { xs: 700, xl: 900 }, overflow: 'hidden', border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: '#e2e8f0', position: 'relative' }}>
            <Box sx={{ width: 794, transform: 'scale(0.74)', transformOrigin: 'top left', position: 'absolute', top: 8, left: '50%', ml: '-293px' }}>
              <NurseryReportCard report={preview} />
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default function NurserySettingsPage() {
  const { ready, academicYear, term } = useOrgAcademicPeriod();
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<NurserySettings | null>(null);
  const [classes, setClasses] = useState<NurseryClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    if (!academicYear) return;
    setClassesLoading(true);
    try {
      const rows = await listNurseryClasses(academicYear);
      setClasses(rows);
    } catch (err) {
      setClasses([]);
      setError(err instanceof Error ? err.message : 'Could not load classes');
    } finally {
      setClassesLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getNurserySettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load nursery settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadClasses();
  }, [ready, loadClasses]);

  const bands = settings?.performance ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100%' }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: NAVY }}>Nursery Settings</Typography>
        <Typography sx={{ fontSize: '0.875rem', color: MUTED, mt: 0.5 }}>
          Configure nursery classes, performance colours and the A4 report template. Courses are taken from Smart Timetable → Config Class.
        </Typography>
        {academicYear ? (
          <Typography sx={{ fontSize: '0.75rem', color: MUTED, mt: 0.5 }}>
            Working year: <strong>{academicYear}</strong> · Term: <strong>{term || '—'}</strong>
          </Typography>
        ) : null}
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert> : null}
      {loading ? <LinearProgress sx={{ mb: 2, borderRadius: 1 }} /> : null}

      <Paper sx={{ borderRadius: 2.5, border: `1px solid ${BORDER}`, boxShadow: 'none', mb: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 800, minHeight: 52 } }}
        >
          {TABS.map((item) => (
            <Tab key={item.label} icon={item.icon} iconPosition="start" label={item.label} />
          ))}
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <ClassConfigTab classes={classes} academicYear={academicYear} loading={classesLoading} onRefresh={loadClasses} />
      ) : null}

      {tab === 1 ? (
        <PerformanceTab
          bands={bands}
          onSaved={(next) =>
            setSettings((prev) =>
              prev ? { ...prev, performance: next } : prev
            )
          }
        />
      ) : null}

      {tab === 2 && settings ? (
        <TemplateTab
          template={settings.template}
          bands={bands}
          onSaved={(next) => setSettings((prev) => (prev ? { ...prev, template: next } : prev))}
        />
      ) : null}
    </Box>
  );
}

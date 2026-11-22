import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  getLessonPlan,
  saveLessonPlan,
  regenerateSection,
  downloadLessonPlanExport,
  fetchAiStatus,
} from '../../services/lessonPlansApi';
import LessonPlanCurriculumSection from '../../components/lessonPlanning/LessonPlanCurriculumSection';
import { brand } from '../../theme/theme';

const PROV_LABEL = {
  source: 'Curriculum',
  ai_suggestion: 'AI',
  teacher: 'Edited',
  missing: 'Missing',
};

const fieldSx = {
  width: '100%',
  minHeight: 44,
  borderRadius: 1,
  border: '1px solid #E2E8F0',
  bgcolor: '#fff',
  px: 1.5,
  py: 1.25,
  fontSize: 14,
  lineHeight: 1.6,
  color: '#0F172A',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
  '&:focus': { borderColor: '#94A3B8', boxShadow: '0 0 0 2px #E2E8F0' },
};

function ProvenanceBadge({ provenance }) {
  if (!provenance || provenance === 'source') return null;
  const label = PROV_LABEL[provenance] || provenance;
  return (
    <Typography sx={{ flexShrink: 0, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8' }}>
      {label}
    </Typography>
  );
}

function EditableField({ label, field, onChange, multiline, action }) {
  if (!field) return null;
  const val = field.value ?? '';
  return (
    <Box component="label" sx={{ display: 'block', py: 2, '&:first-of-type': { pt: 0 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>{label}</Typography>
        {action}
      </Stack>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box
          component={multiline ? 'textarea' : 'input'}
          sx={fieldSx}
          value={Array.isArray(val) ? val.join('\n') : String(val ?? '')}
          rows={multiline ? 5 : undefined}
          onChange={(e) => {
            const next = multiline && label.toLowerCase().includes('question')
              ? e.target.value.split('\n').filter(Boolean)
              : e.target.value;
            onChange({ ...field, value: next, provenance: 'teacher' });
          }}
        />
        <ProvenanceBadge provenance={field.provenance} />
      </Stack>
    </Box>
  );
}

function SectionTitle({ children }) {
  return <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{children}</Typography>;
}

function setDeep(obj, path, value) {
  const parts = path.split('.');
  const clone = structuredClone(obj);
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = { ...cur[parts[i]] };
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  return clone;
}

function fieldVal(f) {
  if (!f) return '';
  const v = f.value;
  return Array.isArray(v) ? v.join(', ') : String(v ?? '');
}

export default function LessonPlanEditor() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(null);
  const [plan, setPlan] = useState(null);
  const [content, setContent] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    fetchAiStatus().then(setAiStatus).catch(() => setAiStatus(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getLessonPlan(id);
        if (!cancelled) {
          setPlan(data);
          setContent(data.planContent);
        }
      } catch (e) {
        if (!cancelled) setMessage(e.message || 'Failed to load plan');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await saveLessonPlan(id, content, 'Teacher save from portal');
      setPlan(updated);
      setContent(updated.planContent);
      setMessage('Saved');
    } catch (e) {
      setMessage(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onRegenerate = async (target, key = target) => {
    setRegenerating(key);
    setMessage('');
    setErrorMsg('');
    try {
      const updated = await regenerateSection(id, target);
      setPlan(updated);
      setContent(updated.planContent);
      setMessage('Updated');
    } catch (e) {
      setErrorMsg(e.message || 'Improve failed. Check Curriculum API and AI settings.');
    } finally {
      setRegenerating(null);
    }
  };

  const onRegenerateStage = (stageKey) => onRegenerate(`procedure.${stageKey}`, stageKey);

  const onExport = async (format) => {
    try {
      await downloadLessonPlanExport(id, format);
    } catch (e) {
      setMessage(e.message || 'Export failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ color: '#94A3B8' }} />
      </Box>
    );
  }

  if (!content) {
    return <Typography sx={{ fontSize: 14, color: '#DC2626' }}>{message || 'Plan not found'}</Typography>;
  }

  const flags = plan?.qualityFlags || [];
  const general = content.general || {};
  const prep = content.preparation || {};
  const stages = content.procedure?.stages || [];
  const hasIntelligence = Boolean(content.curriculumIntelligence);
  const showObjectivesSection = content.learningObjectives?.length && !hasIntelligence;

  const aiImprove =
    aiStatus?.policy?.enabled !== false && (aiStatus?.ready || aiStatus?.provider === 'local');

  const improveBtnSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    p: 0,
    minWidth: 0,
    fontSize: 12,
    fontWeight: 500,
    color: '#475569',
    textTransform: 'none',
    '&:hover': { bgcolor: 'transparent', color: '#0F172A' },
    '&.Mui-disabled': { opacity: 0.5 },
  };

  const sectionBorderSx = { borderTop: '1px solid #E2E8F0', pt: 3 };

  return (
    <Stack spacing={3} sx={{ mx: 'auto', maxWidth: 768, pb: 8 }}>
      <Box component="header" sx={{ borderBottom: '1px solid #E2E8F0', pb: 2.5 }}>
        <Box
          component={Link}
          to="/lesson-planning/all"
          sx={{ fontSize: 12, fontWeight: 500, color: '#64748B', textDecoration: 'none', '&:hover': { color: '#1E293B' } }}
        >
          All lesson plans
        </Box>
        <Typography sx={{ mt: 1, fontSize: { xs: 20, sm: 24 }, fontWeight: 600, color: '#0F172A' }}>
          {fieldVal(prep.lessonTitle) || plan?.lesson?.title || 'Lesson plan'}
        </Typography>
        <Box component="dl" sx={{ mt: 1.5, m: 0, display: 'flex', flexWrap: 'wrap', columnGap: 2.5, rowGap: 0.5, fontSize: 14, color: '#475569' }}>
          <Box>
            <Box component="span" sx={{ color: '#94A3B8' }}>Subject </Box>
            {fieldVal(general.subject) || plan?.subjectLabel}
          </Box>
          <Box>
            <Box component="span" sx={{ color: '#94A3B8' }}>Class </Box>
            {fieldVal(general.className) || plan?.className}
          </Box>
          <Box>
            <Box component="span" sx={{ color: '#94A3B8' }}>Teacher </Box>
            {fieldVal(general.teacherName) || plan?.teacherName}
          </Box>
        </Box>
        {flags.length ? (
          <Typography sx={{ mt: 1.5, fontSize: 12, color: '#64748B' }}>{flags.map((f) => f.replace(/_/g, ' ')).join(' · ')}</Typography>
        ) : null}
      </Box>

      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
        <Button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
          sx={{ minHeight: 40, borderRadius: 1, px: 2, py: 1, bgcolor: brand.navy, color: '#fff', fontSize: 14, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: brand.navy2 }, '&.Mui-disabled': { opacity: 0.6 } }}
        >
          Save
        </Button>
        <Button
          type="button"
          onClick={() => onExport('pdf')}
          startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
          sx={{ minHeight: 40, borderRadius: 1, border: '1px solid #E2E8F0', bgcolor: '#fff', px: 1.5, py: 1, fontSize: 14, fontWeight: 500, color: '#334155', textTransform: 'none', '&:hover': { bgcolor: '#F8FAFC' } }}
        >
          PDF
        </Button>
        <Button
          type="button"
          onClick={() => onExport('docx')}
          startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
          sx={{ minHeight: 40, borderRadius: 1, border: '1px solid #E2E8F0', bgcolor: '#fff', px: 1.5, py: 1, fontSize: 14, fontWeight: 500, color: '#334155', textTransform: 'none', '&:hover': { bgcolor: '#F8FAFC' } }}
        >
          DOCX
        </Button>
        {message ? <Typography sx={{ fontSize: 14, color: '#475569' }}>{message}</Typography> : null}
        {errorMsg ? <Typography sx={{ fontSize: 14, color: '#DC2626' }}>{errorMsg}</Typography> : null}
      </Stack>

      <Paper component="article" variant="outlined" sx={{ borderRadius: 2, borderColor: '#E2E8F0', px: { xs: 2.5, sm: 4 }, py: 3 }}>
        <LessonPlanCurriculumSection
          intelligence={content.curriculumIntelligence}
          objectives={content.learningObjectives}
          onApplyMaterials={(text) =>
            setContent(
              setDeep(content, 'preparation.learningMaterials', {
                ...(prep.learningMaterials || {}),
                value: text,
                provenance: 'source',
              })
            )
          }
        />

        <Box sx={hasIntelligence ? sectionBorderSx : undefined}>
          <SectionTitle>General</SectionTitle>
          <EditableField
            label="School name"
            field={general.schoolName}
            onChange={(f) => setContent(setDeep(content, 'general.schoolName', f))}
          />
          <EditableField
            label="Teacher name"
            field={general.teacherName}
            onChange={(f) => setContent(setDeep(content, 'general.teacherName', f))}
          />
          <EditableField
            label="Special educational needs"
            field={general.specialEducationalNeeds}
            multiline
            onChange={(f) => setContent(setDeep(content, 'general.specialEducationalNeeds', f))}
          />
        </Box>

        <Box sx={sectionBorderSx}>
          <SectionTitle>Preparation</SectionTitle>
          <EditableField
            label="Instructional objective"
            field={prep.instructionalObjective}
            multiline
            action={
              aiImprove ? (
                <Button
                  type="button"
                  disabled={regenerating === 'objective'}
                  onClick={() => void onRegenerate('preparation.instructionalObjective', 'objective')}
                  startIcon={regenerating === 'objective' ? <CircularProgress size={12} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 12 }} />}
                  sx={improveBtnSx}
                >
                  Improve
                </Button>
              ) : null
            }
            onChange={(f) => setContent(setDeep(content, 'preparation.instructionalObjective', f))}
          />
          <EditableField
            label="Learning materials"
            field={prep.learningMaterials}
            multiline
            onChange={(f) => setContent(setDeep(content, 'preparation.learningMaterials', f))}
          />
        </Box>

        {showObjectivesSection ? (
          <Box sx={sectionBorderSx}>
            <SectionTitle>Learning objectives</SectionTitle>
            <Stack spacing={1} sx={{ mt: 1.5, fontSize: 14, lineHeight: 1.65, color: '#1E293B' }}>
              {content.learningObjectives.map((o) => (
                <Typography key={(o.statement || o.value || '').slice(0, 50)} sx={{ fontSize: 14, lineHeight: 1.65 }}>
                  {o.statement || o.value}
                </Typography>
              ))}
            </Stack>
          </Box>
        ) : null}

        {content.assessment ? (
          <Box sx={sectionBorderSx}>
            <SectionTitle>Assessment</SectionTitle>
            <EditableField
              label="Questions"
              field={content.assessment.questions}
              multiline
              onChange={(f) => setContent(setDeep(content, 'assessment.questions', f))}
            />
          </Box>
        ) : null}

        <Box sx={sectionBorderSx}>
          <SectionTitle>Teaching process</SectionTitle>
          <Stack spacing={4} sx={{ mt: 2 }}>
            {stages.map((stage) => (
              <Box key={stage.key} sx={{ borderBottom: '1px solid #F1F5F9', pb: 4, '&:last-of-type': { borderBottom: 'none', pb: 0 } }}>
                <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{stage.title}</Typography>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ fontSize: 12, color: '#64748B' }}>
                    <Box component="span">{stage.minutes} min</Box>
                    {aiImprove ? (
                      <Button
                        type="button"
                        disabled={regenerating === stage.key}
                        onClick={() => void onRegenerateStage(stage.key)}
                        startIcon={regenerating === stage.key ? <CircularProgress size={12} color="inherit" /> : <RefreshIcon sx={{ fontSize: 12 }} />}
                        sx={improveBtnSx}
                      >
                        Improve
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
                <EditableField
                  label="Teacher activities"
                  field={stage.teacherActivities}
                  multiline
                  onChange={(f) => {
                    const idx = stages.findIndex((s) => s.key === stage.key);
                    const nextStages = [...stages];
                    nextStages[idx] = { ...nextStages[idx], teacherActivities: f };
                    setContent({ ...content, procedure: { stages: nextStages } });
                  }}
                />
                <EditableField
                  label="Learner activities"
                  field={stage.learnerActivities}
                  multiline
                  onChange={(f) => {
                    const idx = stages.findIndex((s) => s.key === stage.key);
                    const nextStages = [...stages];
                    nextStages[idx] = { ...nextStages[idx], learnerActivities: f };
                    setContent({ ...content, procedure: { stages: nextStages } });
                  }}
                />
              </Box>
            ))}
          </Stack>
        </Box>
      </Paper>

      {aiStatus ? (
        <Typography sx={{ textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
          {aiStatus.policy?.enabled === false
            ? 'AI off for your school.'
            : aiStatus.provider === 'local'
              ? 'Local curriculum engine.'
              : aiStatus.ready
                ? `${aiStatus.providerLabel || aiStatus.provider}`
                : 'Edit manually or configure AI on the server.'}
        </Typography>
      ) : null}
    </Stack>
  );
}

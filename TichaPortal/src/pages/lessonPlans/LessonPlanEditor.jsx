import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Loader2, RefreshCw, Save, Sparkles } from 'lucide-react';
import {
  getLessonPlan,
  saveLessonPlan,
  regenerateSection,
  downloadLessonPlanExport,
  fetchAiStatus,
} from '../../services/lessonPlansApi';
import LessonPlanCurriculumSection from '../../components/lessonPlanning/LessonPlanCurriculumSection';

const NAVY = '#000435';

const PROV_LABEL = {
  source: 'Curriculum',
  ai_suggestion: 'AI',
  teacher: 'Edited',
  missing: 'Missing',
};

function ProvenanceBadge({ provenance }) {
  if (!provenance || provenance === 'source') return null;
  const label = PROV_LABEL[provenance] || provenance;
  return <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</span>;
}

const fieldClass =
  'min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300';

function EditableField({ label, field, onChange, multiline, action }) {
  if (!field) return null;
  const val = field.value ?? '';
  const Input = multiline ? 'textarea' : 'input';
  return (
    <label className="block py-4 first:pt-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {action}
      </div>
      <div className="flex items-start gap-2">
        <Input
          className={fieldClass}
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
      </div>
    </label>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-semibold text-slate-900">{children}</h2>;
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
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!content) {
    return <p className="text-sm text-red-600">{message || 'Plan not found'}</p>;
  }

  const flags = plan?.qualityFlags || [];
  const general = content.general || {};
  const prep = content.preparation || {};
  const stages = content.procedure?.stages || [];
  const hasIntelligence = Boolean(content.curriculumIntelligence);
  const showObjectivesSection =
    content.learningObjectives?.length && !hasIntelligence;

  const aiImprove =
    aiStatus?.policy?.enabled !== false && (aiStatus?.ready || aiStatus?.provider === 'local');

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <header className="border-b border-slate-200 pb-5">
        <Link to="/lesson-planning/all" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          All lesson plans
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
          {fieldVal(prep.lessonTitle) || plan?.lesson?.title || 'Lesson plan'}
        </h1>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          <div>
            <span className="text-slate-400">Subject </span>
            {fieldVal(general.subject) || plan?.subjectLabel}
          </div>
          <div>
            <span className="text-slate-400">Class </span>
            {fieldVal(general.className) || plan?.className}
          </div>
          <div>
            <span className="text-slate-400">Teacher </span>
            {fieldVal(general.teacherName) || plan?.teacherName}
          </div>
        </dl>
        {flags.length ? (
          <p className="mt-3 text-xs text-slate-500">{flags.map((f) => f.replace(/_/g, ' ')).join(' · ')}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: NAVY }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
        <button
          type="button"
          onClick={() => onExport('pdf')}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download size={16} /> PDF
        </button>
        <button
          type="button"
          onClick={() => onExport('docx')}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download size={16} /> DOCX
        </button>
        {message ? <span className="text-sm text-slate-600">{message}</span> : null}
        {errorMsg ? <span className="text-sm text-red-600">{errorMsg}</span> : null}
      </div>

      <article className="rounded-lg border border-slate-200 bg-white px-5 py-6 sm:px-8">
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

        <div className={hasIntelligence ? 'border-t border-slate-200 pt-6' : ''}>
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
        </div>

        <div className="border-t border-slate-200 pt-6">
          <SectionTitle>Preparation</SectionTitle>
          <EditableField
            label="Instructional objective"
            field={prep.instructionalObjective}
            multiline
            action={
              aiImprove ? (
                <button
                  type="button"
                  disabled={regenerating === 'objective'}
                  onClick={() => void onRegenerate('preparation.instructionalObjective', 'objective')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
                >
                  {regenerating === 'objective' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Improve
                </button>
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
        </div>

        {showObjectivesSection ? (
          <div className="border-t border-slate-200 pt-6">
            <SectionTitle>Learning objectives</SectionTitle>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-800">
              {content.learningObjectives.map((o) => (
                <p key={(o.statement || o.value || '').slice(0, 50)}>{o.statement || o.value}</p>
              ))}
            </div>
          </div>
        ) : null}

        {content.assessment ? (
          <div className="border-t border-slate-200 pt-6">
            <SectionTitle>Assessment</SectionTitle>
            <EditableField
              label="Questions"
              field={content.assessment.questions}
              multiline
              onChange={(f) => setContent(setDeep(content, 'assessment.questions', f))}
            />
          </div>
        ) : null}

        <div className="border-t border-slate-200 pt-6">
          <SectionTitle>Teaching process</SectionTitle>
          <div className="mt-4 space-y-8">
            {stages.map((stage) => (
              <div key={stage.key} className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-900">{stage.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{stage.minutes} min</span>
                    {aiImprove ? (
                      <button
                        type="button"
                        disabled={regenerating === stage.key}
                        onClick={() => void onRegenerateStage(stage.key)}
                        className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      >
                        {regenerating === stage.key ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        Improve
                      </button>
                    ) : null}
                  </div>
                </div>
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
              </div>
            ))}
          </div>
        </div>
      </article>

      {aiStatus ? (
        <p className="text-center text-xs text-slate-400">
          {aiStatus.policy?.enabled === false
            ? 'AI off for your school.'
            : aiStatus.provider === 'local'
              ? 'Local curriculum engine.'
              : aiStatus.ready
                ? `${aiStatus.providerLabel || aiStatus.provider}`
                : 'Edit manually or configure AI on the server.'}
        </p>
      ) : null}
    </div>
  );
}

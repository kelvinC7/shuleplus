'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Loader2, Sparkles, Trash2, Edit2,
  ChevronRight, X, Check, FileStack, Target, ListChecks,
} from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { buildWizardFromTemplate, WIZARD_BOOTSTRAP_KEY } from '@/lib/plan-wizard-types';
import type { Template, TemplateCatalog, TemplateRecommendation, TemplateData } from '@/types';

const OWNERSHIP_TABS = [
  { id: 'all', label: 'All Templates' },
  { id: 'official', label: 'Official' },
  { id: 'school', label: 'School' },
  { id: 'personal', label: 'My Templates' },
] as const;

const SCHOOL_TYPES = ['Primary', 'Secondary', 'TVET', 'Combined'];

function severityColor(severity: string) {
  if (severity === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (severity === 'medium') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

function ownershipBadge(t: Template) {
  if (t.isOfficial || t.ownership === 'official') {
    return { label: 'Official', className: 'bg-indigo-100 text-indigo-800' };
  }
  if (t.ownership === 'personal') {
    return { label: 'My Template', className: 'bg-violet-100 text-violet-800' };
  }
  return { label: 'School', className: 'bg-teal-100 text-teal-800' };
}

function categoryLabel(catalog: TemplateCatalog | null, categoryId?: string) {
  if (!categoryId || !catalog) return categoryId ?? 'General';
  return catalog.categories.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function TemplatesView() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<TemplateCatalog | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recommended, setRecommended] = useState<TemplateRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [useTemplate, setUseTemplate] = useState<Template | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, recRes, tplRes] = await Promise.all([
        apApi.getTemplateCatalog(),
        apApi.getRecommendedTemplates(),
        apApi.listTemplates({
          categoryId: selectedCategory ?? undefined,
          ownership: ownershipFilter === 'all' ? undefined : ownershipFilter,
          search: search.trim() || undefined,
        }),
      ]);
      setCatalog(catRes.data.data);
      setRecommended(recRes.data.data ?? []);
      setTemplates(tplRes.data.data ?? []);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to load templates';
      setError(msg);
      try {
        await apApi.seedOfficialTemplates();
        const [catRes, recRes, tplRes] = await Promise.all([
          apApi.getTemplateCatalog(),
          apApi.getRecommendedTemplates(),
          apApi.listTemplates({
            categoryId: selectedCategory ?? undefined,
            ownership: ownershipFilter === 'all' ? undefined : ownershipFilter,
            search: search.trim() || undefined,
          }),
        ]);
        setCatalog(catRes.data.data);
        setRecommended(recRes.data.data ?? []);
        setTemplates(tplRes.data.data ?? []);
        setError(null);
      } catch (retryErr) {
        console.error(retryErr);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, ownershipFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.categoryId?.toLowerCase().includes(q)
    );
  }, [templates, search]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await apApi.deleteTemplate(id);
      load();
    } catch (err) {
      console.error(err);
      alert('Cannot delete this template.');
    }
  }

  return (
    <ApPageLayout
      actions={
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={14} />
          Create Template
        </button>
      }
    >
      {/* Recommended */}
      {recommended.length > 0 && (
        <section className="card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-navy">Recommended for Your School</h2>
              <p className="text-xs text-muted">Based on your school&apos;s latest performance data</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.slice(0, 8).map((rec) => {
              const tpl = templates.find((t) => t.id === rec.templateId || t.officialSlug === rec.slug);
              return (
                <button
                  key={rec.slug}
                  type="button"
                  onClick={() => tpl && setUseTemplate(tpl)}
                  className="rounded-xl border border-border bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityColor(rec.severity)}`}>
                      {rec.severity === 'high' ? 'Priority' : rec.severity}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-navy">{rec.name}</h3>
                  <p className="mt-1 text-xs text-muted">{rec.metricLabel}</p>
                  <p className="mt-2 text-sm font-bold text-navy">
                    {rec.currentValue}{rec.unit === '%' ? '%' : ` ${rec.unit}`}
                    <span className="mx-1 font-normal text-muted">→</span>
                    Target {rec.targetValue}{rec.unit === '%' ? '%' : ` ${rec.unit}`}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">{rec.reason}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Categories sidebar */}
        <aside className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Categories</h3>
            </div>
            <div className="max-h-[480px] overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  !selectedCategory ? 'bg-navy text-white' : 'text-navy hover:bg-slate-100'
                }`}
              >
                <span>All Categories</span>
                <span className="text-xs opacity-70">{catalog?.totalOfficial ?? '—'}</span>
              </button>
              {catalog?.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedCategory === cat.id ? 'bg-navy text-white' : 'text-navy hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  <span className="ml-2 shrink-0 text-xs opacity-70">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ownership</p>
            <div className="flex flex-col gap-1">
              {OWNERSHIP_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOwnershipFilter(tab.id)}
                  className={`rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                    ownershipFilter === tab.id ? 'bg-primary/15 text-navy' : 'text-muted hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="input pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted">
              <Loader2 className="mr-2 animate-spin" size={16} />
              Loading templates…
            </div>
          ) : error ? (
            <div className="card py-16 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <p className="mt-2 text-xs text-muted">
                If this persists, run: <code className="rounded bg-slate-100 px-1">npx prisma migrate deploy</code> in ActionPlanMIS/Backend
              </p>
              <button type="button" onClick={load} className="btn-primary mt-4">
                Retry
              </button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="card py-16 text-center">
              <FileStack size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-sm text-muted">No templates match your filters</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((t) => {
                const badge = ownershipBadge(t);
                const td = (t.templateData ?? {}) as TemplateData;
                const activityCount = td.suggestedActivities?.length ?? 0;
                return (
                  <div key={t.id} className="card group flex flex-col">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/[0.06]">
                        <FileStack size={18} className="text-navy" />
                      </div>
                      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditTemplate(t)}
                          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-navy"
                          title="Edit template"
                        >
                          <Edit2 size={14} />
                        </button>
                        {!t.isOfficial && t.ownership !== 'official' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                            title="Delete template"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-navy">{t.name}</h3>
                    <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted">{t.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`badge ${badge.className}`}>{badge.label}</span>
                      <span className="badge bg-slate-100 text-slate-600">
                        {categoryLabel(catalog, t.categoryId)}
                      </span>
                      {activityCount > 0 && (
                        <span className="text-[11px] text-muted">{activityCount} activities</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseTemplate(t)}
                      className="btn-primary mt-4 w-full"
                    >
                      Use Template
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <TemplateFormModal
          catalog={catalog}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}

      {editTemplate && (
        <TemplateFormModal
          catalog={catalog}
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSaved={() => { setEditTemplate(null); load(); }}
        />
      )}

      {useTemplate && (
        <UseTemplateModal
          template={useTemplate}
          onClose={() => setUseTemplate(null)}
        />
      )}
    </ApPageLayout>
  );
}

function templateToForm(template: Template | null, catalog: TemplateCatalog | null) {
  const td = (template?.templateData ?? {}) as TemplateData;
  return {
    name: template?.name ?? '',
    description: template?.description ?? '',
    categoryId: template?.categoryId ?? catalog?.categories[0]?.id ?? 'academic',
    schoolType: template?.schoolType ?? td.schoolTypes?.[0] ?? 'Primary',
    ownership: (template?.ownership === 'personal' ? 'personal' : 'school') as 'school' | 'personal',
    goals: (td.goals ?? []).join('\n'),
    objectives: (td.objectives ?? []).join('\n'),
    activities: (td.suggestedActivities ?? []).map((a) => a.title).join('\n'),
    kpis: (td.suggestedKpis ?? []).map((k) => `${k.name} | ${k.target} | ${k.unit}`).join('\n'),
    evidence: (td.evidenceRequirements ?? []).join('\n'),
    timeline: String(td.suggestedTimelineMonths ?? 10),
    budgetCategories: (td.budgetCategories ?? ['Materials', 'Training', 'Transport']).join(', '),
    pillars: (td.strategicPillars ?? []).join('\n'),
  };
}

function buildTemplatePayload(form: ReturnType<typeof templateToForm>) {
  return {
    name: form.name,
    description: form.description,
    categoryId: form.categoryId,
    schoolType: form.schoolType,
    ownership: form.ownership,
    templateData: {
      goals: form.goals.split('\n').map((s) => s.trim()).filter(Boolean),
      objectives: form.objectives.split('\n').map((s) => s.trim()).filter(Boolean),
      suggestedActivities: form.activities.split('\n').map((s) => s.trim()).filter(Boolean).map((title) => ({
        title,
        defaultSelected: true,
      })),
      suggestedKpis: form.kpis.split('\n').map((s) => s.trim()).filter(Boolean).map((line) => {
        const [name, target, unit] = line.split('|').map((x) => x.trim());
        return { name, target: Number(target) || 100, unit: unit || '%' };
      }),
      evidenceRequirements: form.evidence.split('\n').map((s) => s.trim()).filter(Boolean),
      suggestedTimelineMonths: Number(form.timeline) || 10,
      budgetCategories: form.budgetCategories.split(',').map((s) => s.trim()).filter(Boolean),
      strategicPillars: form.pillars.split('\n').map((s) => s.trim()).filter(Boolean),
      schoolTypes: [form.schoolType],
    },
  };
}

function TemplateFormModal({
  catalog,
  template,
  onClose,
  onSaved,
}: {
  catalog: TemplateCatalog | null;
  template?: Template;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(template);
  const isOfficial = template?.isOfficial || template?.ownership === 'official';
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => templateToForm(template ?? null, catalog));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = buildTemplatePayload(form);
      if (isEdit && template) {
        await apApi.updateTemplate(template.id, payload);
      } else {
        await apApi.createTemplate(payload);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert(isEdit ? 'Failed to update template' : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Template' : 'Create Template'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {isOfficial && (
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
            You are customizing your school&apos;s copy of this official template. Changes apply to your organization only.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Template Name *">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
          </Field>
          <Field label="Category">
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input">
              {catalog?.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="School Type">
            <select value={form.schoolType} onChange={(e) => setForm({ ...form, schoolType: e.target.value })} className="input">
              {SCHOOL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {!isOfficial && (
            <Field label="Ownership">
              <select value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value as 'school' | 'personal' })} className="input">
                <option value="school">School Template</option>
                <option value="personal">My Template</option>
              </select>
            </Field>
          )}
        </div>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px]" />
        </Field>
        <Field label="Goals (one per line)">
          <textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} className="input min-h-[60px]" placeholder="Improve student attendance across all classes" />
        </Field>
        <Field label="Objectives (one per line)">
          <textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} className="input min-h-[60px]" />
        </Field>
        <Field label="Suggested Activities (one per line)">
          <textarea value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} className="input min-h-[80px]" placeholder="Daily attendance monitoring&#10;Parent notification for repeated absence" />
        </Field>
        <Field label="KPIs (name | target | unit, one per line)">
          <textarea value={form.kpis} onChange={(e) => setForm({ ...form, kpis: e.target.value })} className="input min-h-[60px]" placeholder="Attendance rate | 95 | %" />
        </Field>
        <Field label="Evidence Requirements (one per line)">
          <textarea value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} className="input min-h-[60px]" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Timeline (months)">
            <input type="number" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} className="input" />
          </Field>
          <Field label="Budget Categories (comma-separated)">
            <input value={form.budgetCategories} onChange={(e) => setForm({ ...form, budgetCategories: e.target.value })} className="input" />
          </Field>
        </div>
        <Field label="Strategic Pillars (one per line)">
          <textarea value={form.pillars} onChange={(e) => setForm({ ...form, pillars: e.target.value })} className="input min-h-[50px]" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : isEdit ? <Check size={14} /> : <Plus size={14} />}
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UseTemplateModal({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const router = useRouter();
  const td = (template.templateData ?? {}) as TemplateData;
  const goals = td.goals ?? [template.name];
  const objectives = td.objectives ?? [];
  const activities = td.suggestedActivities ?? [];
  const kpis = td.suggestedKpis ?? [];

  function handleUseTemplate() {
    const state = buildWizardFromTemplate(template);
    sessionStorage.setItem(
      WIZARD_BOOTSTRAP_KEY,
      JSON.stringify({ templateId: template.id, state })
    );
    onClose();
    router.push('/plans/new?fromTemplate=1');
  }

  return (
    <Modal title={`Use Template: ${template.name}`} onClose={onClose} wide>
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {template.description && (
          <p className="text-sm text-muted">{template.description}</p>
        )}

        {goals.length > 0 && (
          <Section icon={Target} title="Goals">
            <ul className="space-y-1">
              {goals.map((g) => (
                <li key={g} className="text-sm text-navy">{g}</li>
              ))}
            </ul>
          </Section>
        )}

        {objectives.length > 0 && (
          <Section icon={ListChecks} title="Objectives">
            <ul className="space-y-1">
              {objectives.map((o) => (
                <li key={o} className="text-sm text-navy">{o}</li>
              ))}
            </ul>
          </Section>
        )}

        {activities.length > 0 && (
          <Section icon={ListChecks} title="Suggested Activities">
            <ul className="space-y-1">
              {activities.map((a) => (
                <li key={a.title} className="text-sm text-navy">
                  {a.title}
                  {(a.frequency || a.verification) && (
                    <span className="ml-1 text-xs text-muted">
                      ({[a.frequency, a.verification].filter(Boolean).join(' · ')})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {kpis.length > 0 && (
          <div className="rounded-xl border border-border bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold text-navy">Suggested KPIs</p>
            <ul className="space-y-1">
              {kpis.map((k) => (
                <li key={k.name} className="text-xs text-muted">
                  {k.name}: {k.baseline ?? 0} → {k.target} {k.unit}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Back
          </button>
          <button type="button" onClick={handleUseTemplate} className="btn-primary">
            Use This Template
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full rounded-2xl border border-border bg-white p-6 shadow-xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-navy">{label}</label>
      {children}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} className="text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-navy">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition hover:bg-slate-50">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 rounded border-border" />
      <div>
        <span className="text-sm text-navy">{label}</span>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
      </div>
    </label>
  );
}

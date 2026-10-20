'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MoreHorizontal, Pencil, Plus, Save, X } from 'lucide-react';
import {
  attendanceApi,
  type AttendanceScheduleRule,
  type ScheduleRuleInput,
  type ScheduleRuleRecurrence,
  type ScheduleRuleScope,
} from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type ScheduleTab = 'class' | 'weekday' | 'date';

const EMPTY_FORM: ScheduleRuleInput = {
  name: '',
  scope: 'SCHOOL',
  className: '',
  recurrence: 'EVERY_DAY',
  weekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  specificDate: '',
  schoolStarts: '',
  lateStarts: '',
  schoolEnds: '',
  staffStarts: '',
  staffEnds: '',
  effectiveFrom: '',
  effectiveTo: '',
  reason: '',
  isActive: true,
};

function defaultFormForTab(tab: ScheduleTab): ScheduleRuleInput {
  if (tab === 'class') {
    return { ...EMPTY_FORM, name: '', scope: 'CLASS', recurrence: 'EVERY_DAY' };
  }
  if (tab === 'weekday') {
    return {
      ...EMPTY_FORM,
      name: '',
      scope: 'SCHOOL',
      recurrence: 'WEEKDAYS',
      weekdays: ['FRIDAY'],
      schoolEnds: '15:00',
    };
  }
  return { ...EMPTY_FORM, name: '', scope: 'SCHOOL', recurrence: 'SPECIFIC_DATE', schoolEnds: '13:00' };
}

function formatWhen(rule: AttendanceScheduleRule) {
  if (rule.recurrence === 'SPECIFIC_DATE') return rule.specificDate ?? '—';
  if (rule.recurrence === 'WEEKDAYS') {
    return (rule.weekdays ?? []).map((d) => d.slice(0, 3)).join(', ') || '—';
  }
  return 'Daily';
}

function formatTimes(rule: AttendanceScheduleRule) {
  const parts: string[] = [];
  if (rule.schoolStarts) parts.push(rule.schoolStarts);
  if (rule.schoolEnds) parts.push(`→ ${rule.schoolEnds}`);
  if (rule.lateStarts) parts.push(`late ${rule.lateStarts}`);
  return parts.join(' ') || '—';
}

function filterRulesForTab(rules: AttendanceScheduleRule[], tab: ScheduleTab) {
  if (tab === 'class') {
    return rules.filter(
      (r) => r.scope === 'CLASS' && (r.recurrence === 'EVERY_DAY' || r.recurrence === 'WEEKDAYS'),
    );
  }
  if (tab === 'weekday') {
    return rules.filter((r) => r.scope === 'SCHOOL' && r.recurrence === 'WEEKDAYS');
  }
  return rules.filter((r) => r.recurrence === 'SPECIFIC_DATE');
}

function dedupeClassesByLabel(items: Array<{ id: string; label: string }>) {
  const seen = new Set<string>();
  const out: Array<{ id: string; label: string }> = [];
  for (const c of items) {
    const key = c.label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

const TAB_COPY: Record<ScheduleTab, { title: string; add: string }> = {
  class: { title: 'Class schedules', add: 'Add class rule' },
  weekday: { title: 'Day rules', add: 'Add day rule' },
  date: { title: 'Date overrides', add: 'Add date rule' },
};

export function ScheduleRulesPanel({ tab }: { tab: ScheduleTab }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{ rules: AttendanceScheduleRule[] } | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; label: string }>>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleRuleInput>(() => defaultFormForTab(tab));
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, classRes] = await Promise.all([
        attendanceApi.scheduleRulesSummary(),
        attendanceApi.scheduleRuleClasses(),
      ]);
      setSummary(sumRes.data.data ?? null);
      setClasses(dedupeClassesByLabel(classRes.data.data ?? []));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load schedules'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRules = useMemo(
    () => filterRulesForTab(summary?.rules ?? [], tab),
    [summary?.rules, tab],
  );

  function openCreate() {
    setEditingId(null);
    const base = defaultFormForTab(tab);
    setForm(tab === 'weekday' ? { ...base, scope: 'SCHOOL', className: '' } : base);
    setWarnings([]);
    setShowAdvanced(false);
    setFormOpen(true);
  }

  function openEdit(rule: AttendanceScheduleRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      scope: rule.scope,
      className: rule.className ?? '',
      recurrence: rule.recurrence,
      weekdays: rule.weekdays ?? [],
      specificDate: rule.specificDate ?? '',
      schoolStarts: rule.schoolStarts ?? '',
      lateStarts: rule.lateStarts ?? '',
      schoolEnds: rule.schoolEnds ?? '',
      staffStarts: rule.staffStarts ?? '',
      staffEnds: rule.staffEnds ?? '',
      effectiveFrom: rule.effectiveFrom ?? '',
      effectiveTo: rule.effectiveTo ?? '',
      reason: rule.reason ?? '',
      isActive: rule.isActive,
    });
    setWarnings([]);
    setShowAdvanced(Boolean(rule.effectiveFrom || rule.effectiveTo || rule.reason));
    setMenuId(null);
    setFormOpen(true);
  }

  async function saveForm() {
    setSaving(true);
    setWarnings([]);
    try {
      const scope: ScheduleRuleScope = tab === 'weekday' ? 'SCHOOL' : tab === 'class' ? 'CLASS' : form.scope;
      const body: ScheduleRuleInput = {
        ...form,
        scope,
        name: form.name?.trim() || TAB_COPY[tab].title,
        className: scope === 'CLASS' ? form.className?.trim() || null : null,
        specificDate: form.recurrence === 'SPECIFIC_DATE' ? form.specificDate || null : null,
        weekdays: form.recurrence === 'WEEKDAYS' ? form.weekdays : [],
        schoolStarts: form.schoolStarts || null,
        lateStarts: form.lateStarts || null,
        schoolEnds: form.schoolEnds || null,
        staffStarts: form.staffStarts || null,
        staffEnds: form.staffEnds || null,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
        reason: form.reason?.trim() || null,
      };
      const res = editingId
        ? await attendanceApi.updateScheduleRule(editingId, body)
        : await attendanceApi.createScheduleRule(body);
      const payload = res.data.data;
      if (payload?.warnings?.length) {
        setWarnings(payload.warnings);
        toast.success('Saved (check overlap warning)');
      } else {
        toast.success('Saved');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: AttendanceScheduleRule) {
    setMenuId(null);
    try {
      await attendanceApi.setScheduleRuleActive(rule.id, !rule.isActive);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    }
  }

  const copy = TAB_COPY[tab];

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-navy">{copy.title}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-muted tabular-nums">
            {visibleRules.length}
          </span>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-1.5 text-sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {copy.add}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-white">
        {visibleRules.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-muted">No rules yet.</p>
        ) : (
          <ul className="divide-y divide-border/80">
            {visibleRules.map((rule) => (
              <li key={rule.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-navy">
                      {rule.name || (tab === 'class' ? rule.className : copy.title)}
                    </p>
                    {!rule.isActive ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        Off
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {tab === 'class' && rule.className ? (
                      <span>{rule.className} · </span>
                    ) : null}
                    {formatWhen(rule)}
                    <span className="mx-1.5 text-border">|</span>
                    <span className="font-mono text-[11px] text-navy/80">{formatTimes(rule)}</span>
                  </p>
                </div>
                <div className="relative z-10 shrink-0">
                  <button
                    type="button"
                    className="rounded-lg border border-transparent p-2 text-muted hover:border-border hover:bg-white hover:text-navy"
                    aria-expanded={menuId === rule.id}
                    aria-haspopup="menu"
                    aria-label="Actions"
                    onClick={() => setMenuId(menuId === rule.id ? null : rule.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuId === rule.id ? (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-[60] cursor-default bg-transparent"
                        aria-label="Close menu"
                        onClick={() => setMenuId(null)}
                      />
                      <div
                        role="menu"
                        className="absolute right-0 z-[70] mt-1 min-w-[9.5rem] origin-top-right rounded-xl border border-border bg-white py-1.5 shadow-[0_8px_30px_rgba(0,4,53,0.12)]"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-navy hover:bg-slate-50"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted" /> Edit
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full px-3.5 py-2.5 text-left text-sm font-medium text-navy hover:bg-slate-50"
                          onClick={() => void toggleActive(rule)}
                        >
                          {rule.isActive ? 'Turn off' : 'Turn on'}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/30 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h3 className="font-semibold text-navy">{editingId ? 'Edit rule' : copy.add}</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100">
                <X className="h-5 w-5 text-muted" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {warnings.length ? (
                <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" /> Overlap with another rule
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Field label="Name">
                <input
                  className="input"
                  placeholder="Optional label"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>

              {tab === 'class' ? (
                <Field label="Class">
                  <select
                    className="input"
                    value={form.className ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, scope: 'CLASS', className: e.target.value }))}
                  >
                    <option value="">Choose class…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {tab === 'class' ? (
                <Field label="When">
                  <select
                    className="input"
                    value={form.recurrence}
                    onChange={(e) => {
                      const recurrence = e.target.value as ScheduleRuleRecurrence;
                      setForm((f) => ({
                        ...f,
                        recurrence,
                        weekdays:
                          recurrence === 'WEEKDAYS' && !(f.weekdays ?? []).length
                            ? ['FRIDAY']
                            : recurrence === 'EVERY_DAY'
                              ? []
                              : f.weekdays,
                      }));
                    }}
                  >
                    <option value="EVERY_DAY">Every school day</option>
                    <option value="WEEKDAYS">Selected days only</option>
                  </select>
                </Field>
              ) : null}

              {tab === 'date' ? (
                <Field label="Date">
                  <input
                    type="date"
                    className="input"
                    value={form.specificDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, specificDate: e.target.value, recurrence: 'SPECIFIC_DATE' }))}
                  />
                </Field>
              ) : null}

              {form.recurrence === 'WEEKDAYS' && tab !== 'date' ? (
                <Field label="Days">
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const on = (form.weekdays ?? []).includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              weekdays: on
                                ? (f.weekdays ?? []).filter((x) => x !== d)
                                : [...(f.weekdays ?? []), d],
                            }))
                          }
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                            on ? 'bg-navy text-white' : 'bg-slate-100 text-navy hover:bg-slate-200'
                          }`}
                        >
                          {d.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              ) : null}

              <div className="rounded-xl bg-slate-50/90 p-4">
                <p className="mb-3 text-xs font-medium text-muted">Times (24h)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Arrival">
                    <input
                      type="time"
                      className="input font-mono"
                      value={form.schoolStarts ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, schoolStarts: e.target.value }))}
                    />
                  </Field>
                  <Field label="Late after">
                    <input
                      type="time"
                      className="input font-mono"
                      value={form.lateStarts ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, lateStarts: e.target.value }))}
                    />
                  </Field>
                  <Field label="Departure">
                    <input
                      type="time"
                      className="input font-mono"
                      value={form.schoolEnds ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, schoolEnds: e.target.value }))}
                    />
                  </Field>
                  <Field label="Staff out">
                    <input
                      type="time"
                      className="input font-mono"
                      value={form.staffEnds ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, staffEnds: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>

              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? 'Hide optional fields' : 'Optional: date range & notes'}
              </button>

              {showAdvanced ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="From">
                      <input
                        type="date"
                        className="input"
                        value={form.effectiveFrom ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                      />
                    </Field>
                    <Field label="Until">
                      <input
                        type="date"
                        className="input"
                        value={form.effectiveTo ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field label="Notes">
                    <input
                      className="input"
                      value={form.reason ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    />
                  </Field>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
              <button type="button" className="btn-secondary text-sm" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1.5 text-sm"
                disabled={saving}
                onClick={() => void saveForm()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-navy/70">{label}</span>
      {children}
    </label>
  );
}

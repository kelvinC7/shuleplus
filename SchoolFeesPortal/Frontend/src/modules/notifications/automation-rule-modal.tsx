'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Zap,
  Clock,
  Users,
  MessageSquare,
  BellRing,
  Mail,
  Smartphone,
  MonitorSmartphone,
  ShieldCheck,
  Eye,
  Loader2,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';

export type AutomationDraft = {
  id?: string;
  name: string;
  trigger: string;
  timingDays: number;
  timingType: 'before' | 'on' | 'after';
  audience: string;
  channels: { sms: boolean; email: boolean; push: boolean; inApp: boolean };
  status: 'ACTIVE' | 'DRAFT';
  maxSmsPerDay: number;
  maxSmsPerWeek: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  combineSiblings: boolean;
  templates: { sms?: string; pushTitle?: string; pushBody?: string; inApp?: string };
};

const EMPTY_DRAFT: AutomationDraft = {
  name: '',
  trigger: 'PAYMENT_DUE_SOON',
  timingDays: 3,
  timingType: 'before',
  audience: 'parents_outstanding',
  channels: { sms: true, email: true, push: true, inApp: true },
  status: 'DRAFT',
  maxSmsPerDay: 1,
  maxSmsPerWeek: 3,
  quietHoursStart: 22,
  quietHoursEnd: 6,
  combineSiblings: true,
  templates: {},
};

const AUDIENCES = [
  { value: 'parents_outstanding', label: 'Parents with outstanding balance' },
  { value: 'parents', label: 'All parents' },
];

const CHANNEL_META = [
  { key: 'inApp' as const, label: 'In-App (ParentMIS)', Icon: MonitorSmartphone, hint: 'Always recommended' },
  { key: 'push' as const, label: 'Web Push', Icon: BellRing, hint: 'When parent enabled push' },
  { key: 'email' as const, label: 'Email', Icon: Mail, hint: 'When parent email exists' },
  { key: 'sms' as const, label: 'SMS', Icon: Smartphone, hint: 'Only SMS-allowed parents · costs RWF 25/part' },
];

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const VARIABLES = ['{{parent_name}}', '{{student_name}}', '{{balance}}', '{{due_date}}', '{{class_name}}', '{{payment_link}}'];

function Section({ icon: Icon, title, children }: { icon: typeof Zap; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-slate-50/60 p-4">
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy">
        <Icon size={14} className="text-primary" /> {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

export function AutomationRuleModal({
  open,
  triggers,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  triggers: Record<string, string[]>;
  initial?: AutomationDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<AutomationDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [previewing, setPreviewing] = useState(false);
  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (open) {
      setDraft(
        initial?.id
          ? { ...EMPTY_DRAFT, ...initial, channels: { ...EMPTY_DRAFT.channels, ...initial.channels }, templates: { ...initial.templates } }
          : { ...EMPTY_DRAFT }
      );
      setPreview('');
    }
  }, [open, initial]);

  const set = <K extends keyof AutomationDraft>(key: K, value: AutomationDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const smsPreviewSource = draft.templates.sms || '';

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        setPreviewing(true);
        const { data } = await api.post('/reminders/preview', { templates: { sms: smsPreviewSource } });
        setPreview(data.data?.rendered?.sms ?? '');
      } catch {
        /* keep last preview */
      } finally {
        setPreviewing(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [open, smsPreviewSource]);

  const needsTiming = useMemo(() => !['RECEIPT_GENERATED', 'PAYMENT_COMPLETED'].includes(draft.trigger), [draft.trigger]);

  async function save() {
    if (!draft.name.trim()) {
      toast.error('Give the rule a name');
      return;
    }
    if (!Object.values(draft.channels).some(Boolean)) {
      toast.error('Enable at least one channel');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        templates: {
          ...(draft.templates.sms ? { sms: draft.templates.sms } : {}),
          ...(draft.templates.inApp ? { inApp: draft.templates.inApp } : {}),
          ...(draft.templates.pushTitle ? { pushTitle: draft.templates.pushTitle } : {}),
          ...(draft.templates.pushBody ? { pushBody: draft.templates.pushBody } : {}),
        },
      };
      if (editing) await api.put(`/reminders/automations/${initial!.id}`, payload);
      else await api.post('/reminders/automations', payload);
      toast.success(editing ? 'Automation updated' : `Automation "${draft.name}" created`);
      onSaved();
      onClose();
    } catch {
      toast.error('Could not save automation');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Zap size={18} />
            </span>
            <div>
              <h3 className="font-bold text-navy">{editing ? 'Edit automation rule' : 'New automation rule'}</h3>
              <p className="text-xs text-muted">Reminders fire automatically when the trigger conditions are met</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted hover:bg-slate-100 hover:text-navy">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Section icon={Zap} title="Trigger">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase text-muted">
                Rule name
                <input
                  className="input mt-1 w-full text-sm normal-case"
                  placeholder="e.g. Term 2 due reminder"
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </label>
              <label className="block text-xs font-bold uppercase text-muted">
                When this happens
                <select className="input mt-1 w-full text-sm normal-case" value={draft.trigger} onChange={(e) => set('trigger', e.target.value)}>
                  {Object.entries(triggers).map(([group, items]) => (
                    <optgroup key={group} label={group.toUpperCase()}>
                      {(items as string[]).map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-muted">
                Who receives it
                <select
                  className="input mt-1 w-full text-sm normal-case"
                  value={draft.audience}
                  onChange={(e) => set('audience', e.target.value)}
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={`grid grid-cols-2 gap-2 ${needsTiming ? '' : 'opacity-40 pointer-events-none'}`}>
                <label className="block text-xs font-bold uppercase text-muted">
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> Days</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    className="input mt-1 w-full text-sm"
                    value={draft.timingDays}
                    onChange={(e) => set('timingDays', Math.max(0, Number(e.target.value)))}
                  />
                </label>
                <label className="block text-xs font-bold uppercase text-muted">
                  Relative to due date
                  <select
                    className="input mt-1 w-full text-sm normal-case"
                    value={draft.timingType}
                    onChange={(e) => set('timingType', e.target.value as AutomationDraft['timingType'])}
                  >
                    <option value="before">Before</option>
                    <option value="on">On</option>
                    <option value="after">After</option>
                  </select>
                </label>
              </div>
            </div>
          </Section>

          <Section icon={MessageSquare} title="Channels">
            <div className="grid gap-2 sm:grid-cols-2">
              {CHANNEL_META.map(({ key, label, hint, Icon }) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    draft.channels[key] ? 'border-emerald-300 bg-emerald-50/50' : 'border-border bg-white'
                  }`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${draft.channels[key] ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">{label}</p>
                    <p className="truncate text-[11px] text-muted">{hint}</p>
                  </div>
                  <Toggle checked={draft.channels[key]} onChange={(v) => set('channels', { ...draft.channels, [key]: v })} />
                </div>
              ))}
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Guardrails">
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="block text-xs font-bold uppercase text-muted">
                Quiet from
                <select className="input mt-1 w-full text-sm" value={draft.quietHoursStart} onChange={(e) => set('quietHoursStart', Number(e.target.value))}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-muted">
                Quiet until
                <select className="input mt-1 w-full text-sm" value={draft.quietHoursEnd} onChange={(e) => set('quietHoursEnd', Number(e.target.value))}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-muted">
                Max SMS / day
                <input type="number" min={0} max={10} className="input mt-1 w-full text-sm" value={draft.maxSmsPerDay} onChange={(e) => set('maxSmsPerDay', Number(e.target.value))} />
              </label>
              <label className="block text-xs font-bold uppercase text-muted">
                Max SMS / week
                <input type="number" min={0} max={30} className="input mt-1 w-full text-sm" value={draft.maxSmsPerWeek} onChange={(e) => set('maxSmsPerWeek', Number(e.target.value))} />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-navy">
                <Toggle checked={draft.combineSiblings} onChange={(v) => set('combineSiblings', v)} />
                Combine siblings into one message
              </label>
              <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
                <Toggle
                  checked={draft.status === 'ACTIVE'}
                  onChange={(v) => set('status', v ? 'ACTIVE' : 'DRAFT')}
                />
                <span className={draft.status === 'ACTIVE' ? 'text-emerald-700' : 'text-muted'}>
                  {draft.status === 'ACTIVE' ? 'Active immediately' : 'Save as draft'}
                </span>
              </label>
            </div>
          </Section>

          <Section icon={Users} title="Message (optional — defaults are used when empty)">
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-border hover:text-navy"
                      onClick={() => set('templates', { ...draft.templates, sms: `${draft.templates.sms ?? ''}${v}` })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  className="input min-h-[72px] w-full text-sm"
                  placeholder="SMS body — leave empty to use the school default"
                  value={draft.templates.sms ?? ''}
                  onChange={(e) => set('templates', { ...draft.templates, sms: e.target.value })}
                />
                <div className="mt-2 rounded-xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted">
                    <Eye size={12} /> Live SMS preview
                    {previewing && <Loader2 size={11} className="animate-spin" />}
                  </p>
                  <p className="mt-1 break-words text-sm text-navy">{preview || 'Type a message to see the rendered preview…'}</p>
                  {smsPreviewSource ? (
                    <p className="mt-1 text-[11px] text-muted">
                      {smsPreviewSource.length} chars · {smsPreviewSource.length <= 160 ? 1 : Math.ceil(smsPreviewSource.length / 153)} SMS part(s)
                    </p>
                  ) : null}
                </div>
              </div>
              <textarea
                rows={2}
                className="input min-h-[56px] w-full text-sm"
                placeholder="In-app body (ParentMIS bell) — optional"
                value={draft.templates.inApp ?? ''}
                onChange={(e) => set('templates', { ...draft.templates, inApp: e.target.value })}
              />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-slate-50/80 px-5 py-3.5">
          <p className="hidden text-xs text-muted sm:block">{needsTiming ? `Fires ${draft.timingDays} day(s) ${draft.timingType} due date` : 'Fires as soon as the event happens'}</p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" className="btn-secondary flex-1 text-sm sm:flex-none" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary flex-1 text-sm sm:flex-none disabled:opacity-50" disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editing ? 'Save changes' : 'Create rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

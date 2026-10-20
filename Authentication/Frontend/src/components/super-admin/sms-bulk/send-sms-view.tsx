'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, FileText, GraduationCap, Landmark, MapPin, MessageSquare, School, Send, Smartphone, Users, User } from 'lucide-react';
import {
  EMPTY_FILTERS,
  smsBulkApi,
  SMS_CLASSES,
  SMS_DISTRICTS,
  SMS_SCHOOLS,
  SMS_TRIGGERS,
  SMS_YEARS,
  type AudienceFilters,
} from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { SmsCard, SmsPageShell, SmsStatusPill, smsBtnNavy, smsBtnOutline, smsBtnPrimary, smsInputClass, smsSelectClass } from './sms-page-shell';

type Audience =
  | 'student'
  | 'parents'
  | 'school'
  | 'class'
  | 'district'
  | 'sector'
  | 'academicYear'
  | 'allParents'
  | 'allStudents'
  | 'custom';

const AUDIENCE_OPTIONS: { value: Audience; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'student', label: 'Individual Student', desc: 'Send to one student’s parents', icon: <User className="h-4 w-4" /> },
  { value: 'parents', label: 'Student Parents', desc: 'Parents of a filtered set of students', icon: <Users className="h-4 w-4" /> },
  { value: 'school', label: 'School', desc: 'All parents in a school', icon: <School className="h-4 w-4" /> },
  { value: 'class', label: 'Class', desc: 'Parents of a single class', icon: <GraduationCap className="h-4 w-4" /> },
  { value: 'district', label: 'District', desc: 'All parents in a district', icon: <Landmark className="h-4 w-4" /> },
  { value: 'sector', label: 'Sector', desc: 'All parents in a sector', icon: <MapPin className="h-4 w-4" /> },
  { value: 'academicYear', label: 'Academic Year', desc: 'Parents of a whole academic year', icon: <Clock className="h-4 w-4" /> },
  { value: 'allParents', label: 'All Parents', desc: 'Every parent in the platform', icon: <Users className="h-4 w-4" /> },
  { value: 'allStudents', label: 'All Students', desc: 'Every student in the platform', icon: <GraduationCap className="h-4 w-4" /> },
  { value: 'custom', label: 'Custom Audience', desc: 'Import or hand-pick recipients', icon: <FileText className="h-4 w-4" /> },
];

const VARIABLES = [
  { key: '{{parent_name}}', label: 'Parent name' },
  { key: '{{student_name}}', label: 'Student name' },
  { key: '{{student_code}}', label: 'Student code' },
  { key: '{{school_name}}', label: 'School name' },
  { key: '{{class}}', label: 'Class' },
  { key: '{{balance}}', label: 'Balance (FRW)' },
  { key: '{{academic_year}}', label: 'Academic year' },
  { key: '{{term}}', label: 'Term' },
  { key: '{{payment_deadline}}', label: 'Payment deadline' },
  { key: '{{date}}', label: 'Date' },
  { key: '{{time}}', label: 'Time' },
  { key: '{{amount}}', label: 'Amount (FRW)' },
];

const FILTER_FIELDS: { key: keyof AudienceFilters; label: string; options: string[] }[] = [
  { key: 'school', label: 'School', options: SMS_SCHOOLS },
  { key: 'district', label: 'District', options: SMS_DISTRICTS },
  { key: 'className', label: 'Class', options: SMS_CLASSES },
  { key: 'academicYear', label: 'Academic Year', options: SMS_YEARS },
  { key: 'gender', label: 'Gender', options: ['M', 'F'] },
  { key: 'status', label: 'Student status', options: ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED'] },
  { key: 'relation', label: 'Parent relationship', options: ['Father', 'Mother', 'Guardian'] },
  { key: 'phoneVerified', label: 'Phone verified', options: ['yes', 'no'] },
  { key: 'smsEnabled', label: 'SMS consent', options: ['yes', 'no'] },
];

function audienceBreadcrumb(audience: Audience, filters: AudienceFilters): string {
  const parts: string[] = [];
  if (audience === 'parents' || audience === 'school' || audience === 'class' || audience === 'academicYear') parts.push('Parents');
  if (audience === 'school') parts.push('School');
  if (filters.district) parts.push(filters.district);
  if (filters.school) parts.push(filters.school);
  if (filters.className) parts.push(filters.className);
  if (filters.gender) parts.push(filters.gender === 'M' ? 'Boys' : 'Girls');
  if (filters.trigger) parts.push(SMS_TRIGGERS.find((t) => t.value === filters.trigger)?.label.split(' → ')[1] ?? filters.trigger);
  if (parts.length === 0) {
    const map: Record<Audience, string> = {
      student: 'Individual Student',
      parents: 'Filtered Parents',
      school: 'All Schools',
      class: 'All Classes',
      district: 'All Districts',
      sector: 'All Sectors',
      academicYear: 'All Years',
      allParents: 'All Parents',
      allStudents: 'All Students',
      custom: 'Custom Audience',
    };
    parts.push(map[audience]);
  }
  return parts.join(' → ');
}

function countSmsParts(body: string): number {
  const len = body.length;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

function ComposeInner() {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState<Audience>('parents');
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_FILTERS);
  const [singleStudent, setSingleStudent] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState<'now' | 'schedule' | 'draft' | 'test'>('now');
  const [scheduleDate, setScheduleDate] = useState('20 Aug 2026');
  const [scheduleTime, setScheduleTime] = useState('08:30 AM');
  const [testNumber, setTestNumber] = useState('');
  const [sending, setSending] = useState(false);

  const preselectedStudent = searchParams.get('student');

  useEffect(() => {
    if (preselectedStudent) {
      setAudience('student');
      setSingleStudent(preselectedStudent);
    }
  }, [preselectedStudent]);

  const recipientCount = useMemo(() => {
    if (audience === 'student') return singleStudent.trim() ? 1 : 0;
    return smsBulkApi.estimateAudience(audience, filters);
  }, [audience, filters, singleStudent]);

  const previewName = audience === 'student' ? (singleStudent || 'Your child') : 'Jean Claude';
  const parts = countSmsParts(body);
  const estimatedCredits = Math.max(1, Math.ceil(recipientCount * parts));

  const samplePreview = body
    .replace(/\{\{parent_name\}\}/g, 'Jean Pierre')
    .replace(/\{\{student_name\}\}/g, previewName)
    .replace(/\{\{student_code\}\}/g, 'SCH-2026-00451')
    .replace(/\{\{school_name\}\}/g, 'ABC School')
    .replace(/\{\{class\}\}/g, 'P5')
    .replace(/\{\{balance\}\}/g, '45,000')
    .replace(/\{\{academic_year\}\}/g, '2026–2027')
    .replace(/\{\{term\}\}/g, 'Term 1')
    .replace(/\{\{payment_deadline\}\}/g, '20 Aug 2026')
    .replace(/\{\{date\}\}/g, '15 Aug 2026')
    .replace(/\{\{time\}\}/g, '10:32 AM')
    .replace(/\{\{amount\}\}/g, '45,000');

  function insertVariable(key: string) {
    setBody((prev) => (prev ? `${prev}${key}` : `${key}`));
  }

  function patchFilter(key: keyof AudienceFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function canContinue(): boolean {
    if (step === 0) return true;
    if (step === 1) return recipientCount > 0;
    if (step === 2) return body.trim().length > 0;
    return true;
  }

  async function submit() {
    setSending(true);
    try {
      await smsBulkApi.sendSms({
        audience,
        filters,
        recipients: recipientCount,
        body,
        when,
        scheduledDate: when === 'schedule' ? scheduleDate : undefined,
        scheduledTime: when === 'schedule' ? scheduleTime : undefined,
        testNumber: when === 'test' ? testNumber : undefined,
      });
      const msg =
        when === 'now'
          ? `SMS queued for ${recipientCount.toLocaleString()} recipient${recipientCount === 1 ? '' : 's'}.`
          : when === 'schedule'
            ? `SMS scheduled for ${scheduleDate} ${scheduleTime}.`
            : when === 'draft'
              ? 'SMS saved as draft.'
              : `Test SMS sent to ${testNumber || 'your number'}.`;
      toast.success(msg);
      setBody('');
      setStep(0);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <SmsPageShell
      title="Send SMS"
      description="A step-by-step composer for personalized, targeted SMS to parents and students."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="space-y-4">
          <StepIndicator current={step} />

          {step === 0 && (
            <SmsCard>
              <h2 className="mb-1 text-sm font-semibold text-navy">Step 1 — Choose audience</h2>
              <p className="mb-4 text-xs text-muted">Who should receive this message?</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudience(opt.value)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      audience === opt.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-white hover:border-primary/40'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${audience === opt.value ? 'bg-primary text-navy' : 'bg-navy/5 text-navy'}`}>
                      {opt.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy">{opt.label}</span>
                      <span className="block text-[11px] text-muted">{opt.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              {audience === 'student' && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-muted">Student name or code</label>
                  <input
                    value={singleStudent}
                    onChange={(e) => setSingleStudent(e.target.value)}
                    placeholder="e.g. Jean Claude or SCH-2026-00451"
                    className={`${smsInputClass} mt-1`}
                  />
                </div>
              )}
              {audience === 'custom' && (
                <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center">
                  <p className="text-sm font-medium text-navy">Import custom recipients</p>
                  <p className="mt-1 text-xs text-muted">Upload an Excel/CSV with Name, Phone and Group columns. Duplicates and invalid numbers are detected automatically.</p>
                  <button type="button" className={`${smsBtnOutline} mt-3`} onClick={() => toast.info('Import wizard available in SMS Settings.')}>
                    <FileText className="h-4 w-4" /> Import CSV
                  </button>
                </div>
              )}
            </SmsCard>
          )}

          {step === 1 && (
            <SmsCard>
              <h2 className="mb-1 text-sm font-semibold text-navy">Step 2 — Smart filters</h2>
              <p className="mb-4 text-xs text-muted">Combine filters from this module and others to build the perfect audience.</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {FILTER_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <span className="text-xs font-medium text-muted">{field.label}</span>
                    <select
                      value={filters[field.key]}
                      onChange={(e) => patchFilter(field.key, e.target.value)}
                      className={`${smsSelectClass} mt-1 w-full`}
                    >
                      <option value="">Any</option>
                      {field.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <span className="text-xs font-medium text-muted">Financial / Academic triggers</span>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {SMS_TRIGGERS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => patchFilter('trigger', filters.trigger === t.value ? '' : t.value)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                        filters.trigger === t.value
                          ? 'border-primary bg-primary/5 text-navy'
                          : 'border-border bg-white text-muted hover:border-primary/40'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
                <Users className="h-4 w-4 shrink-0 text-navy" />
                <p className="text-sm text-navy">
                  Audience: <span className="font-semibold">{audienceBreadcrumb(audience, filters)}</span>
                </p>
                <span className="ml-auto shrink-0 rounded-lg bg-primary px-2.5 py-1 text-sm font-bold text-navy">
                  {recipientCount.toLocaleString()} recipients
                </span>
              </div>
            </SmsCard>
          )}

          {step === 2 && (
            <SmsCard>
              <h2 className="mb-1 text-sm font-semibold text-navy">Step 3 — Compose message</h2>
              <p className="mb-3 text-xs text-muted">Use dynamic variables so every parent receives a personalized message.</p>

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Dear {{parent_name}}, {{student_name}} has an outstanding school fee balance of {{balance}} FRW for {{academic_year}}. Please contact {{school_name}} for more information."
                className={`${smsInputClass} min-h-[150px] resize-y leading-relaxed`}
              />

              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted">Dynamic variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      title={v.label}
                      onClick={() => insertVariable(v.key)}
                      className="rounded-lg border border-border bg-slate-50 px-2 py-1 font-mono text-[11px] text-navy transition hover:border-primary hover:bg-primary/5"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat label="Characters" value={body.length} />
                <MiniStat label="SMS Parts" value={parts} />
                <MiniStat label="Recipients" value={recipientCount.toLocaleString()} />
                <MiniStat label="Est. Credits" value={estimatedCredits.toLocaleString()} />
              </div>
            </SmsCard>
          )}

          {step === 3 && (
            <SmsCard>
              <h2 className="mb-1 text-sm font-semibold text-navy">Step 4 — Send options</h2>
              <p className="mb-4 text-xs text-muted">Choose when and how this message is delivered.</p>

              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { value: 'now', label: 'Send Now', desc: 'Deliver immediately' },
                    { value: 'schedule', label: 'Schedule', desc: 'Pick a date & time' },
                    { value: 'draft', label: 'Save as Draft', desc: 'Keep for later' },
                    { value: 'test', label: 'Send Test SMS', desc: 'To your own number first' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWhen(opt.value)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      when === opt.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-white hover:border-primary/40'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${when === opt.value ? 'bg-primary text-navy' : 'bg-navy/5 text-navy'}`}>
                      {opt.value === 'now' ? <Send className="h-4 w-4" /> : opt.value === 'schedule' ? <Clock className="h-4 w-4" /> : opt.value === 'draft' ? <FileText className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-navy">{opt.label}</span>
                      <span className="block text-[11px] text-muted">{opt.desc}</span>
                    </span>
                  </button>
                ))}
              </div>

              {when === 'schedule' && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-muted">Date</span>
                    <input value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className={`${smsInputClass} mt-1`} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-muted">Time</span>
                    <input value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className={`${smsInputClass} mt-1`} />
                  </label>
                </div>
              )}

              {when === 'test' && (
                <label className="mt-4 block">
                  <span className="text-xs font-medium text-muted">Test number</span>
                  <input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="+250 7XX XXX XXX" className={`${smsInputClass} mt-1`} />
                </label>
              )}

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                This sends to {recipientCount.toLocaleString()} recipient{recipientCount === 1 ? '' : 's'} using sender ID <span className="font-semibold">SHULEPLUS</span> (~{estimatedCredits.toLocaleString()} credits).
              </div>
            </SmsCard>
          )}

          <div className="flex items-center justify-between">
            <button type="button" className={smsBtnOutline} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </button>
            {step < 3 ? (
              <button type="button" className={smsBtnPrimary} disabled={!canContinue()} onClick={() => setStep((s) => s + 1)}>
                Continue
              </button>
            ) : (
              <button type="button" className={smsBtnNavy} disabled={sending || !body.trim()} onClick={() => void submit()}>
                {sending ? 'Sending…' : when === 'now' ? 'Send SMS' : when === 'schedule' ? 'Schedule SMS' : when === 'draft' ? 'Save Draft' : 'Send Test SMS'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SmsCard>
            <h2 className="mb-3 text-sm font-semibold text-navy">Live preview</h2>
            <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] border-[6px] border-navy bg-white shadow-xl">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="ml-auto text-[9px] font-semibold text-muted">SMS · {scheduleDate}</span>
              </div>
              <div className="space-y-2 px-3 py-3">
                <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-tr-sm bg-primary/20 px-3 py-2 text-xs text-navy">
                  {samplePreview || 'Your personalized message will appear here as you type…'}
                </div>
              </div>
              <div className="border-t border-border px-3 py-2">
                <p className="text-[9px] text-muted">
                  {body.length} chars · {parts} part{parts > 1 ? 's' : ''} · ~{estimatedCredits.toLocaleString()} credits
                </p>
              </div>
            </div>
          </SmsCard>

          <SmsCard>
            <h2 className="mb-2 text-sm font-semibold text-navy">Message summary</h2>
            <dl className="space-y-2 text-xs">
              <SummaryRow label="Audience" value={audienceBreadcrumb(audience, filters)} />
              <SummaryRow label="Recipients" value={recipientCount.toLocaleString()} />
              <SummaryRow label="Sender ID" value="SHULEPLUS" />
              <SummaryRow label="Est. credits" value={estimatedCredits.toLocaleString()} />
              <SummaryRow label="When" value={when === 'now' ? 'Immediately' : when === 'draft' ? 'Draft' : when === 'test' ? `Test → ${testNumber || '—'}` : `${scheduleDate} ${scheduleTime}`} />
            </dl>
          </SmsCard>

          <SmsCard className="bg-gradient-to-br from-white via-slate-50 to-primary/10">
            <h2 className="mb-2 text-sm font-semibold text-navy">Need inspiration?</h2>
            <p className="mb-3 text-xs text-muted">Popular templates you can start from:</p>
            <div className="space-y-2">
              {[
                { label: 'Fee Reminder', body: 'Dear {{parent_name}}, this is a reminder that {{student_name}} has an outstanding balance of {{balance}} FRW.' },
                { label: 'Absent Today', body: 'Dear {{parent_name}}, {{student_name}} was marked absent from school today, {{date}}.' },
                { label: 'Payment Confirmation', body: 'Dear {{parent_name}}, payment of {{amount}} FRW for {{student_name}} has been received.' },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => setBody(tpl.body)}
                  className="block w-full rounded-xl border border-border bg-white px-3 py-2 text-left transition hover:border-primary/45"
                >
                  <span className="block text-xs font-semibold text-navy">{tpl.label}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted">{tpl.body}</span>
                </button>
              ))}
            </div>
          </SmsCard>
        </div>
      </div>
    </SmsPageShell>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = ['Audience', 'Filters', 'Compose', 'Send'];
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-white p-2 shadow-sm">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-1">
          <div className={`flex flex-1 items-center gap-1.5 rounded-xl px-2 py-1.5 ${i <= current ? 'bg-primary/10 text-navy' : 'text-muted'}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i < current ? 'bg-emerald-500 text-white' : i === current ? 'bg-navy text-primary' : 'bg-slate-200 text-muted'}`}>
              {i < current ? '✓' : i + 1}
            </span>
            <span className="hidden text-[11px] font-semibold sm:inline">{label}</span>
          </div>
          {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-bold text-navy">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-semibold text-navy">{value}</dd>
    </div>
  );
}

export function SendSmsView() {
  return (
    <Suspense fallback={<SmsPageShell title="Send SMS" description="Loading…"><SmsCard>Loading…</SmsCard></SmsPageShell>}>
      <ComposeInner />
    </Suspense>
  );
}

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Save, Settings2, X } from 'lucide-react';
import { FormField, RadioGroup, SelectField } from '@/components/hr-step-wizard';
import {
  ORGANIZATION_LEAVE_TYPES,
  STATUTORY_LEAVE_TYPES,
  type LeaveCategory,
  type LeavePolicy,
} from '@/types/leave';

const APPROVAL_ROLES = ['Manager', 'HR', 'Department Head', 'CEO'];
const DOCUMENT_OPTIONS = [
  'Medical Certificate',
  'Death Certificate',
  'Marriage Certificate',
  'Approval Letter',
  'Other',
];

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#000435] shadow-[0_1px_2px_rgba(0,4,53,0.03)] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#FCB038]/50 focus:ring-2 focus:ring-[#FCB038]/15';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#000435]">{title}</h3>
        {description ? <p className="mt-1 text-xs font-medium text-slate-500">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function MultiChip({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
              active
                ? 'border-[#FCB038] bg-[#FCB038]/10 text-[#000435] shadow-[0_1px_2px_rgba(252,176,56,0.2)]'
                : 'border-slate-200 bg-white text-slate-500 hover:border-[#FCB038]/35 hover:text-[#000435]'
            }`}
          >
            {active && <Check size={12} className="text-[#946207]" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function emptyLeavePolicy(category: LeaveCategory): Omit<LeavePolicy, 'id'> {
  return {
    leaveType: '',
    category,
    paid: true,
    maxDays: category === 'STATUTORY' ? 18 : 5,
    carryForward: category === 'STATUTORY',
    genderRestriction: 'ANY',
    eligibleDepartments: [],
    minYearsOfService: 0,
    approvalWorkflow: ['Manager', 'HR'],
    requiredDocuments: [],
    active: true,
  };
}

interface LeavePolicyModalProps {
  open: boolean;
  policy: LeavePolicy | (Omit<LeavePolicy, 'id'> & { id?: string }) | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (policy: Omit<LeavePolicy, 'id'> & { id?: string }) => void;
}

export function LeavePolicyModal({ open, policy, saving = false, onClose, onSave }: LeavePolicyModalProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(policy);
  const [customType, setCustomType] = useState('');
  const [useCustomType, setUseCustomType] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !policy) return;
    setDraft(policy);
    if (policy.category === 'ORGANIZATION' && policy.leaveType) {
      const known = ORGANIZATION_LEAVE_TYPES.includes(
        policy.leaveType as (typeof ORGANIZATION_LEAVE_TYPES)[number]
      );
      setUseCustomType(!known);
      setCustomType(known ? '' : policy.leaveType);
    } else {
      setUseCustomType(false);
      setCustomType('');
    }
  }, [open, policy]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted || !draft) return null;

  const isEdit = Boolean(draft.id);
  const typeOptions =
    draft.category === 'STATUTORY'
      ? STATUTORY_LEAVE_TYPES.map((t) => ({ value: t, label: t }))
      : ORGANIZATION_LEAVE_TYPES.map((t) => ({ value: t, label: t }));

  function update<K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) {
    setDraft((d) => (d ? { ...d, [field]: value } : d));
  }

  function toggleApproval(role: string) {
    update(
      'approvalWorkflow',
      draft.approvalWorkflow.includes(role)
        ? draft.approvalWorkflow.filter((r) => r !== role)
        : [...draft.approvalWorkflow, role]
    );
  }

  function toggleDoc(doc: string) {
    update(
      'requiredDocuments',
      draft.requiredDocuments.includes(doc)
        ? draft.requiredDocuments.filter((d) => d !== doc)
        : [...draft.requiredDocuments, doc]
    );
  }

  const resolvedType =
    draft.category === 'ORGANIZATION' && (useCustomType || draft.leaveType === 'Other')
      ? customType.trim()
      : draft.leaveType;

  const canSave = Boolean(resolvedType) && draft.maxDays >= 0 && !saving;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000435]/50 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-policy-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close policy form"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_24px_64px_-16px_rgba(0,4,53,0.45)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-[#000435] px-5 py-4 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCB038]/15 text-[#FCB038]">
              <Settings2 size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">Leave Policies</p>
              <h2 id="leave-policy-modal-title" className="text-lg font-bold">
                {isEdit ? 'Edit Leave Policy' : 'New Leave Policy'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            <X size={14} />
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <Section title="Policy basics" description="Define the leave category, type, and duration.">
            <FormField label="Leave category" required className="sm:col-span-2">
              <RadioGroup
                name="policyCategory"
                value={draft.category}
                onChange={(v) => update('category', v as LeaveCategory)}
                options={[
                  { value: 'STATUTORY', label: 'Statutory' },
                  { value: 'ORGANIZATION', label: 'Organization' },
                ]}
              />
            </FormField>

            <FormField label="Leave type" required className="sm:col-span-2">
              {draft.category === 'ORGANIZATION' && useCustomType ? (
                <input
                  className={fieldClass}
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="e.g. Sabbatical Leave"
                />
              ) : (
                <SelectField
                  label=""
                  value={draft.leaveType}
                  onChange={(v) => {
                    update('leaveType', v);
                    setUseCustomType(v === 'Other');
                  }}
                  options={typeOptions}
                  placeholder="Select leave type"
                />
              )}
              {draft.category === 'ORGANIZATION' ? (
                <button
                  type="button"
                  onClick={() => setUseCustomType((v) => !v)}
                  className="mt-2 text-xs font-bold text-[#946207] underline-offset-2 hover:underline"
                >
                  {useCustomType ? 'Choose from predefined types' : 'Enter a custom leave type'}
                </button>
              ) : null}
            </FormField>

            <FormField label="Maximum days" required className="sm:col-span-2">
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={draft.maxDays}
                onChange={(e) => update('maxDays', Number(e.target.value))}
                placeholder="0 = flexible"
              />
              <p className="mt-1.5 text-[11px] font-medium text-slate-400">Set 0 for flexible duration.</p>
            </FormField>
          </Section>

          <Section title="Entitlement rules" description="Carry-forward and service requirements.">
            <FormField label="Carry forward">
              <RadioGroup
                name="carryForward"
                value={draft.carryForward ? 'Yes' : 'No'}
                onChange={(v) => update('carryForward', v === 'Yes')}
                options={[
                  { value: 'No', label: 'No' },
                  { value: 'Yes', label: 'Yes' },
                ]}
              />
            </FormField>

            <FormField label="Minimum years of service">
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={draft.minYearsOfService}
                onChange={(e) => update('minYearsOfService', Number(e.target.value))}
              />
            </FormField>

            <FormField label="Gender restriction" className="sm:col-span-2">
              <RadioGroup
                name="gender"
                value={draft.genderRestriction}
                onChange={(v) => update('genderRestriction', v as LeavePolicy['genderRestriction'])}
                options={[
                  { value: 'ANY', label: 'Any' },
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                ]}
              />
            </FormField>
          </Section>

          <Section title="Workflow & documents" description="Who approves leave and what must be attached.">
            <FormField label="Approval workflow" className="sm:col-span-2">
              <MultiChip options={APPROVAL_ROLES} selected={draft.approvalWorkflow} onToggle={toggleApproval} />
            </FormField>

            <FormField label="Required documents" className="sm:col-span-2">
              <MultiChip options={DOCUMENT_OPTIONS} selected={draft.requiredDocuments} onToggle={toggleDoc} />
            </FormField>
          </Section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...draft, leaveType: resolvedType })}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#000435] px-5 py-2.5 text-xs font-bold text-white shadow-[0_8px_16px_-6px_rgba(0,4,53,0.5)] transition hover:scale-[1.02] disabled:opacity-40"
          >
            <Save size={14} className="text-[#FCB038]" />
            {saving ? 'Saving…' : isEdit ? 'Update Policy' : 'Save Policy'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { CheckCircle2, Clock, Eye } from 'lucide-react';
import { FieldLabel, StepSection, inputClass } from './wizard-ui';
import type { FeePolicyFormData } from './wizard-types';

interface Props {
  data: FeePolicyFormData;
  onChange: (patch: Partial<FeePolicyFormData>) => void;
}

const CHAIN = [
  { id: 'draft', label: 'Draft', icon: Clock, done: true },
  { id: 'district', label: 'District review', icon: Eye, done: false },
  { id: 'province', label: 'Provincial review', icon: Eye, done: false },
  { id: 'nesa', label: 'NESA approval', icon: CheckCircle2, done: false },
] as const;

export function StepApproval({ data, onChange }: Props) {
  return (
    <StepSection title="Approval chain" description="Configure who must review before publish.">
      <ul className="space-y-2">
        {CHAIN.map((stage) => {
          const Icon = stage.icon;
          return (
            <li
              key={stage.id}
              className="flex items-center gap-3 rounded-xl border border-navy/10 px-3 py-3 text-[13px]"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  stage.done ? 'bg-primary/20 text-navy' : 'bg-navy/[0.05] text-navy/45'
                }`}
              >
                <Icon size={15} />
              </span>
              <span className="flex-1 font-semibold text-navy">{stage.label}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">
                {stage.done ? 'Complete' : 'Queued'}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-navy/10 px-3 py-3 text-[13px] text-navy">
          <input
            type="checkbox"
            checked={data.requiresDistrictReview}
            onChange={(e) => onChange({ requiresDistrictReview: e.target.checked })}
          />
          Require district review
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-navy/10 px-3 py-3 text-[13px] text-navy">
          <input
            type="checkbox"
            checked={data.requiresProvincialReview}
            onChange={(e) => onChange({ requiresProvincialReview: e.target.checked })}
          />
          Require provincial review
        </label>
      </div>

      <label className="mt-4 block">
        <FieldLabel>Approval notes</FieldLabel>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={data.approvalNotes}
          onChange={(e) => onChange({ approvalNotes: e.target.value })}
        />
      </label>
    </StepSection>
  );
}

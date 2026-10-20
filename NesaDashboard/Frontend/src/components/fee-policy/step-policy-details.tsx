import { ChipToggle, FieldLabel, StepSection, inputClass } from './wizard-ui';
import type { FeePolicyFormData } from './wizard-types';

interface Props {
  data: FeePolicyFormData;
  onChange: (patch: Partial<FeePolicyFormData>) => void;
}

export function StepPolicyDetails({ data, onChange }: Props) {
  return (
    <StepSection title="Policy details" description="Name, code and description for this fee policy.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <FieldLabel>Policy name *</FieldLabel>
          <input
            className={inputClass}
            value={data.policyName}
            onChange={(e) => onChange({ policyName: e.target.value })}
            placeholder="e.g. National Primary Fee Cap 2026"
          />
        </label>
        <label>
          <FieldLabel>Policy code *</FieldLabel>
          <input
            className={inputClass}
            value={data.policyCode}
            onChange={(e) => onChange({ policyCode: e.target.value })}
            placeholder="e.g. FP-2026-01"
          />
        </label>
        <label className="sm:col-span-2">
          <FieldLabel>Description</FieldLabel>
          <textarea
            className={`${inputClass} min-h-[96px]`}
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Optional summary for reviewers"
          />
        </label>
      </div>
    </StepSection>
  );
}

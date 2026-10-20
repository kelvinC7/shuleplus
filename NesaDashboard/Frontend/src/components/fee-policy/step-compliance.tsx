import { FieldLabel, StepSection, inputClass } from './wizard-ui';
import type { FeePolicyFormData } from './wizard-types';

interface Props {
  data: FeePolicyFormData;
  onChange: (patch: Partial<FeePolicyFormData>) => void;
}

export function StepCompliance({ data, onChange }: Props) {
  return (
    <StepSection title="Compliance rules" description="Guardrails schools must obey under this policy.">
      <label>
        <FieldLabel>Compliance notes</FieldLabel>
        <textarea
          className={`${inputClass} min-h-[120px]`}
          value={data.complianceNotes}
          onChange={(e) => onChange({ complianceNotes: e.target.value })}
          placeholder="Describe caps, exceptions, and reporting obligations…"
        />
      </label>
    </StepSection>
  );
}

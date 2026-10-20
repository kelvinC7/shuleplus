import { ChipToggle, FieldLabel, StepSection, inputClass } from './wizard-ui';
import type { FeePolicyFormData } from './wizard-types';

const CATEGORIES = ['Public', 'Private', 'Government-Aided', 'TVET'];
const PROVINCES = ['Kigali', 'Eastern', 'Western', 'Northern', 'Southern'];

interface Props {
  data: FeePolicyFormData;
  onChange: (patch: Partial<FeePolicyFormData>) => void;
}

export function StepAcademicScope({ data, onChange }: Props) {
  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <StepSection title="Academic scope" description="When and where this policy applies.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <FieldLabel>Academic year *</FieldLabel>
          <input
            className={inputClass}
            value={data.academicYear}
            onChange={(e) => onChange({ academicYear: e.target.value })}
            placeholder="2025-2026"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <FieldLabel>Effective from</FieldLabel>
            <input
              type="date"
              className={inputClass}
              value={data.effectiveFrom}
              onChange={(e) => onChange({ effectiveFrom: e.target.value })}
            />
          </label>
          <label>
            <FieldLabel>Effective to</FieldLabel>
            <input
              type="date"
              className={inputClass}
              value={data.effectiveTo}
              onChange={(e) => onChange({ effectiveTo: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="mt-5">
        <FieldLabel>School categories</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <ChipToggle
              key={c}
              active={data.schoolCategories.includes(c)}
              onClick={() => onChange({ schoolCategories: toggle(data.schoolCategories, c) })}
            >
              {c}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <FieldLabel>Provinces</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROVINCES.map((p) => (
            <ChipToggle
              key={p}
              active={data.provinces.includes(p)}
              onClick={() => onChange({ provinces: toggle(data.provinces, p) })}
            >
              {p}
            </ChipToggle>
          ))}
        </div>
      </div>
    </StepSection>
  );
}

import { FieldLabel, StepSection } from './wizard-ui';
import type { FeePolicyFormData } from './wizard-types';

interface Props {
  data: FeePolicyFormData;
  onEditStep: (step: number) => void;
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-navy/5 py-3 last:border-0">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-navy">{value || '—'}</p>
      </div>
      <button type="button" onClick={onEdit} className="text-[12px] font-semibold text-navy hover:text-primary">
        Edit
      </button>
    </div>
  );
}

export function StepPreview({ data, onEditStep }: Props) {
  const total = data.feeItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <StepSection title="Preview & publish" description="Review everything before saving or submitting.">
      <div className="nesa-card !p-4">
        <Row label="Policy" value={`${data.policyName} (${data.policyCode})`} onEdit={() => onEditStep(0)} />
        <Row
          label="Academic scope"
          value={`${data.academicYear} · ${data.schoolCategories.join(', ') || 'No categories'} · ${data.provinces.join(', ') || 'No provinces'}`}
          onEdit={() => onEditStep(1)}
        />
        <Row
          label="Fee structure"
          value={`${data.feeItems.length} lines · ${total.toLocaleString()} ${data.currency}`}
          onEdit={() => onEditStep(2)}
        />
        <Row label="Compliance" value={data.complianceNotes.slice(0, 80) || 'No notes'} onEdit={() => onEditStep(3)} />
        <Row
          label="Approvals"
          value={`District ${data.requiresDistrictReview ? 'yes' : 'no'} · Province ${data.requiresProvincialReview ? 'yes' : 'no'}`}
          onEdit={() => onEditStep(4)}
        />
      </div>

      <div className="mt-4">
        <FieldLabel>Fee lines preview</FieldLabel>
        <ul className="mt-2 space-y-1 text-[13px] text-navy">
          {data.feeItems.length === 0 ? (
            <li className="text-navy/40">No fee lines</li>
          ) : (
            data.feeItems.map((item) => (
              <li key={item.id} className="flex justify-between border-b border-navy/5 py-2">
                <span>{item.name || 'Untitled'}</span>
                <span className="font-semibold">{Number(item.amount).toLocaleString()} {data.currency}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </StepSection>
  );
}

import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { EVIDENCE_REQUIREMENTS, EVIDENCE_STATUS_LABEL, type EvidenceStatus } from '@/government/config/workflow-stages';
import { cn } from '@/shared/cn';

function demoStatus(i: number): EvidenceStatus {
  const cycle: EvidenceStatus[] = ['VERIFIED', 'SUBMITTED', 'UNDER_VERIFICATION', 'NOT_SUBMITTED', 'EXPIRED'];
  return cycle[i % cycle.length];
}

export default function DocumentsEvidencePage() {
  return (
    <div>
      <PageHeader
        title="Documents & evidence register"
        description="Central register linking each requirement to the trip, stage, verifier, and audit history. Received ≠ verified."
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Requirement</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verifier</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {EVIDENCE_REQUIREMENTS.map((doc, i) => {
              const status = demoStatus(i);
              const tone =
                status === 'VERIFIED'
                  ? 'bg-emerald-50 text-emerald-800'
                  : status === 'NOT_SUBMITTED'
                    ? 'bg-red-50 text-red-800'
                    : status === 'EXPIRED'
                      ? 'bg-amber-soft text-amber-950'
                      : 'bg-slate-100 text-slate-700';
              return (
                <tr key={doc.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-900">{doc.name}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{doc.stage.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', tone)}>
                      {EVIDENCE_STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{status === 'VERIFIED' ? 'Assigned reviewer' : 'N/A'}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-xs font-bold text-navy hover:underline">
                      Open detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Stamp } from 'lucide-react';
import { govApi } from '@/services/api';

export type GovernanceApprovalRecord = {
  id?: string;
  stageKey: string;
  stageLabel: string;
  decision: string;
  reason?: string | null;
  decidedAt?: string | null;
  decidedByName?: string | null;
  officialRole?: string | null;
  authorityOffice?: string | null;
  signatureName?: string | null;
  stampReference?: string | null;
  signatureStorageKey?: string | null;
  stampStorageKey?: string | null;
};

function AttestationImage({ tripId, approvalId, kind, label }: { tripId: string; approvalId: string; kind: 'signature' | 'stamp'; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const { data } = await govApi.get<Blob>(`/government/applications/${tripId}/approvals/${approvalId}/${kind}`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tripId, approvalId, kind]);

  return (
    <div className="rounded-lg border border-line bg-white p-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex min-h-[72px] items-center justify-center">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : url ? (
          <img src={url} alt={label} className="max-h-20 w-full object-contain" />
        ) : (
          <span className="text-[10px] text-slate-400">Not on file</span>
        )}
      </div>
    </div>
  );
}

export function GovernanceApprovalChain({
  tripId,
  approvals,
  currentStageLabel,
}: {
  tripId?: string;
  approvals: GovernanceApprovalRecord[];
  currentStageLabel?: string;
}) {
  const signed = approvals.filter((a) => a.decision === 'APPROVED');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Governance chain of custody</h3>
        {currentStageLabel ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-950">
            Awaiting: {currentStageLabel}
          </span>
        ) : null}
      </div>

      {signed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No prior signatures yet. This file is at the first governance gate.
        </p>
      ) : (
        <ul className="space-y-3">
          {signed.map((a) => (
            <li
              key={`${a.stageKey}-${a.stampReference ?? a.decidedAt}`}
              className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
            >
              <div className="absolute right-3 top-3 opacity-[0.12]">
                <Stamp className="h-20 w-20 text-navy" strokeWidth={1.2} />
              </div>
              <div className="border-b border-line bg-gradient-to-r from-[#000435] to-[#0a1654] px-4 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-white/80">{a.stageLabel}</p>
                <p className="text-[10px] text-white/60">{a.officialRole?.replace(/_/g, ' ') ?? 'Government official'}</p>
              </div>
              <div className="relative px-4 py-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg italic text-[#000435]">{a.signatureName ?? a.decidedByName ?? 'Signed'}</p>
                    <p className="mt-1 text-xs text-slate-600">{a.authorityOffice ?? 'Authorized office'}</p>
                    {a.reason ? <p className="mt-2 text-sm text-slate-700">{a.reason}</p> : null}
                    <div className="mt-3 inline-flex flex-col rounded-lg border-2 border-[#FCB038]/60 bg-amber-50/80 px-3 py-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-amber-900/70">Stamp reference</span>
                      <span className="font-mono text-xs font-bold text-[#000435]">{a.stampReference ?? 'PENDING-STAMP'}</span>
                    </div>
                    {tripId && a.id && (a.signatureStorageKey || a.stampStorageKey) ? (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {a.signatureStorageKey ? (
                          <AttestationImage tripId={tripId} approvalId={a.id} kind="signature" label="Signature" />
                        ) : null}
                        {a.stampStorageKey ? (
                          <AttestationImage tripId={tripId} approvalId={a.id} kind="stamp" label="Stamp" />
                        ) : null}
                      </div>
                    ) : null}
                    {a.decidedAt ? (
                      <p className="mt-2 text-[10px] text-slate-500">
                        Attested {new Date(a.decidedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

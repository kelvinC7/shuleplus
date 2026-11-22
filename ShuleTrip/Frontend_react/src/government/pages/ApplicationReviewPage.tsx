import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { govApi } from '@/services/api';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReadinessReport, TripDetail } from '@/schools/types/trip';
import type { GovernanceApprovalRecord } from '@/government/components/governance-approval-chain';
import { useGovernmentAuth } from '@/contexts/government-auth-context';
import {
  GovTripDocumentsGrid,
  type GovTripDocument,
} from '@/government/components/gov-review/gov-trip-documents-grid';
import { GovDecisionModal } from '@/government/components/gov-review/gov-decision-modal';
import { ArrowLeft, CheckCircle2, FileCheck, Loader2, MoreHorizontal, ScrollText } from 'lucide-react';
import { cn } from '@/shared/cn';

type ReviewPayload = {
  trip: TripDetail & {
    tenant?: {
      organizationName: string;
      schoolCode?: string | null;
      district?: string | null;
      sector?: string | null;
    };
    correctionNote?: string | null;
    correctionDueAt?: string | null;
    currentStageKey?: string;
    submittedAt?: string | null;
    auditLogs?: Array<{ action: string; detail?: string | null; createdAt: string; actorName?: string | null }>;
    authorizations?: Array<{ authorizationNo: string; issuedAt: string }>;
    documents: GovTripDocument[];
  };
  readiness: ReadinessReport;
  workflow?: { currentStageKey: string; currentStageLabel: string; canAct: boolean; readOnly: boolean };
  governanceChain?: GovernanceApprovalRecord[];
};

type TabId = 'overview' | 'manifest' | 'transport' | 'documents' | 'safety' | 'history';
type DecisionMode = 'approve' | 'corrections' | 'reject';

const STAGE_ACTION_LABEL: Record<string, string> = {
  intake: 'Approve & release',
  education: 'Sign & release',
  transport: 'Sign & release',
  final: 'Issue authorization',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'manifest', label: 'Manifest' },
  { id: 'transport', label: 'Transport' },
  { id: 'documents', label: 'Documents' },
  { id: 'safety', label: 'Safety' },
  { id: 'history', label: 'History' },
];

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/70 bg-white px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold leading-snug text-navy">{value || '—'}</p>
    </div>
  );
}

export default function ApplicationReviewPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const openDecisionFromQuery = searchParams.get('attest') === '1';
  const { user } = useGovernmentAuth();
  const [data, setData] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('approve');
  const [showMoreActions, setShowMoreActions] = useState(false);

  async function load() {
    if (!tripId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data: res } = await govApi.get<{ data: ReviewPayload }>(`/government/applications/${tripId}`);
      setData(res.data);
      if (!signatureName && user?.name) setSignatureName(user.name);
    } catch (err: unknown) {
      setData(null);
      const apiMsg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
          ? err.response.data.message
          : null;
      setLoadError(apiMsg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tripId]);

  useEffect(() => {
    if (openDecisionFromQuery && data?.workflow?.canAct) {
      setModalOpen(true);
      setDecisionMode('approve');
    }
  }, [openDecisionFromQuery, data?.workflow?.canAct]);

  function openModal(mode: DecisionMode) {
    setDecisionMode(mode);
    setMessage(null);
    setModalOpen(true);
    setShowMoreActions(false);
  }

  async function submitDecision(
    action: 'approve' | 'reject' | 'request_corrections',
    files?: { signature: File; stamp: File }
  ) {
    if (!tripId || reason.trim().length < 3) {
      setMessage('Enter a clear reason (min 3 characters).');
      return;
    }
    if (action === 'approve' && signatureName.trim().length < 2) {
      setMessage('Enter your full name as electronic signature.');
      return;
    }
    if (action === 'approve' && (!files?.signature || !files?.stamp)) {
      setMessage('Upload signature and stamp images to approve.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('action', action);
      form.append('reason', reason.trim());
      form.append('signatureName', signatureName.trim());
      if (action === 'request_corrections' && deadline) {
        form.append('responseDeadline', deadline);
      }
      if (files?.signature && files?.stamp) {
        form.append('signatureFile', files.signature);
        form.append('stampFile', files.stamp);
      }
      await govApi.post(`/government/applications/${tripId}/decisions`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setModalOpen(false);
      setMessage(
        action === 'approve' ? 'Stage approved successfully.' : `Decision recorded: ${action.replace(/_/g, ' ')}`
      );
      await load();
    } catch (e) {
      setMessage((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Decision failed');
    } finally {
      setBusy(false);
    }
  }

  const trip = data?.trip;
  const workflow = data?.workflow;
  const chain = data?.governanceChain ?? [];
  const signedCount = chain.filter((a) => a.decision === 'APPROVED').length;
  const approveLabel = STAGE_ACTION_LABEL[workflow?.currentStageKey ?? ''] ?? 'Approve';

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <p className="font-bold text-navy">Application not available</p>
        <p className="mt-2 text-sm text-slate-600">{loadError ?? 'This trip is not in your queue or jurisdiction.'}</p>
        <Link to="/government/applications" className="mt-4 inline-block text-sm font-semibold text-navy">
          ← Applications
        </Link>
      </div>
    );
  }

  const tenant = trip.tenant;
  const auth = trip.authorizations?.[0];
  const canAct = workflow?.canAct && !workflow?.readOnly;

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-28 sm:space-y-5 sm:pb-10">
      <Link
        to="/government/applications"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy"
      >
        <ArrowLeft className="size-4" />
        Applications
      </Link>

      <header className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold text-amber-800">{trip.reference}</p>
            <h1 className="mt-0.5 text-xl font-bold leading-tight text-navy sm:text-2xl">{trip.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {[tenant?.organizationName, tenant?.district, tenant?.schoolCode ? `#${tenant.schoolCode}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={trip.status} />
            {workflow?.currentStageLabel ? (
              <span className="rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-bold text-white">
                {workflow.currentStageLabel}
              </span>
            ) : null}
          </div>
        </div>

        {signedCount > 0 ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            {signedCount} prior stage signature{signedCount === 1 ? '' : 's'} on file
          </p>
        ) : workflow?.currentStageLabel ? (
          <p className="mt-3 text-xs text-slate-500">First gate — no prior signatures yet.</p>
        ) : null}

        {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p> : null}
      </header>

      {auth ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="size-5 text-emerald-700" />
            <span className="text-sm font-bold text-navy">{auth.authorizationNo}</span>
          </div>
          <Link
            to={`/government/review/${tripId}/approval-letter`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
          >
            <ScrollText className="size-4" />
            Authorization letter
          </Link>
        </div>
      ) : null}

      {!canAct && !auth ? (
        <div className="rounded-xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {trip.status === 'CORRECTION_REQUESTED'
            ? 'Waiting for the school to resubmit corrections.'
            : workflow?.readOnly
              ? 'View only — your role cannot sign at this gate.'
              : 'Review details below. Signing opens when this file reaches your gate.'}
          {trip.correctionNote && trip.status === 'CORRECTION_REQUESTED' ? (
            <p className="mt-2 text-amber-950">{trip.correctionNote}</p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="overflow-x-auto border-b border-line [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-min gap-1 p-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-2 text-xs font-bold sm:text-sm',
                  tab === t.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {t.label}
                {t.id === 'documents' ? ` (${trip.documents?.length ?? 0})` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {tab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoTile label="Destination" value={trip.destination ?? ''} />
                <InfoTile label="Departure" value={fmtDateTime(trip.departAt)} />
                <InfoTile label="Return" value={fmtDateTime(trip.returnAt)} />
                <InfoTile label="Submitted" value={fmtDateTime(trip.submittedAt)} />
                <InfoTile label="Trip leader" value={trip.tripLeaderName ?? ''} />
                <InfoTile label="Learners" value={String(trip.participants.length)} />
                <InfoTile label="Staff" value={String(trip.staff.length)} />
                <InfoTile label="Readiness" value={data?.readiness ? `${data.readiness.score}%` : '—'} />
              </div>
              {trip.purpose ? (
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Purpose</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800">{trip.purpose}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'manifest' ? (
            <ul className="divide-y divide-line">
              {trip.participants.map((p) => (
                <li key={p.studentId} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-navy">{p.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {p.classLabel ?? 'Class N/A'} · {p.studentCode ?? '—'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'w-fit rounded-full px-2 py-0.5 text-[10px] font-bold',
                      p.guardianConsent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    )}
                  >
                    {p.guardianConsent ? 'Consent ✓' : 'Consent pending'}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === 'transport' ? (
            <div className="space-y-4">
              {trip.vehicles[0] ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <InfoTile label="Plate" value={trip.vehicles[0].plateNumber ?? ''} />
                  <InfoTile label="Vehicle" value={trip.vehicles[0].vehicleType ?? ''} />
                  <InfoTile label="Driver" value={trip.vehicles[0].driverName ?? ''} />
                  <InfoTile label="Phone" value={trip.vehicles[0].driverPhone ?? ''} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">No vehicle on record.</p>
              )}
            </div>
          ) : null}

          {tab === 'documents' && tripId ? (
            <GovTripDocumentsGrid tripId={tripId} documents={trip.documents ?? []} />
          ) : null}

          {tab === 'safety' && data?.readiness ? (
            <ul className="space-y-2">
              {[...data.readiness.blockers, ...data.readiness.warnings, ...data.readiness.advisories].map((item) => (
                <li key={item.key} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  {item.message}
                </li>
              ))}
            </ul>
          ) : null}

          {tab === 'history' ? (
            <ul className="space-y-2">
              {(trip.auditLogs ?? []).map((log) => (
                <li key={log.createdAt + log.action} className="rounded-lg border border-line px-3 py-2 text-sm">
                  <span className="font-semibold text-navy">{log.action}</span>
                  <span className="text-slate-500"> · {fmtDateTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {canAct ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur-md sm:static sm:rounded-2xl sm:border sm:p-4">
            <div className="mx-auto flex max-w-4xl gap-2">
              <Button variant="amber" className="min-h-11 flex-1 text-sm font-bold" onClick={() => openModal('approve')}>
                Approve
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  className="min-h-11 px-3"
                  aria-label="More actions"
                  onClick={() => setShowMoreActions((v) => !v)}
                >
                  <MoreHorizontal className="size-5" />
                </Button>
                {showMoreActions ? (
                  <div className="absolute bottom-full right-0 z-10 mb-2 w-52 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-navy hover:bg-slate-50"
                      onClick={() => openModal('corrections')}
                    >
                      Send for corrections
                    </button>
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => openModal('reject')}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <GovDecisionModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            mode={decisionMode}
            onModeChange={setDecisionMode}
            approveLabel={approveLabel}
            signatureName={signatureName}
            onSignatureNameChange={setSignatureName}
            reason={reason}
            onReasonChange={setReason}
            deadline={deadline}
            onDeadlineChange={setDeadline}
            busy={busy}
            message={message}
            onSubmitApprove={(files) => submitDecision('approve', files)}
            onSubmitCorrections={() => submitDecision('request_corrections')}
            onSubmitReject={() => submitDecision('reject')}
          />
        </>
      ) : null}
    </div>
  );
}

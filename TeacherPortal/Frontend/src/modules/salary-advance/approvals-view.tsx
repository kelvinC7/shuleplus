'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, X } from 'lucide-react';
import { AdvanceStatusBadge, formatRwf } from '@/components/advance-status-badge';
import {
  fetchFinanceRequests,
  fetchManagerPending,
  financeReject,
  financeSendToManager,
  managerDecision,
} from '@/services/teacher-api';
import { useAuth } from '@/contexts/auth-context';
import { SALARY_ADVANCE } from '@/config/salary-advance-brand';
import type { ShuleAvanceRequest } from '@/types';

export function SalaryAdvanceApprovalsView() {
  const { avanceAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financeQueue, setFinanceQueue] = useState<ShuleAvanceRequest[]>([]);
  const [managerQueue, setManagerQueue] = useState<ShuleAvanceRequest[]>([]);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const canFinance = avanceAccess?.canFinance ?? false;
  const canManager = avanceAccess?.canManager ?? false;

  const load = useCallback(async () => {
    if (!canFinance && !canManager) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const financePromise = canFinance
      ? fetchFinanceRequests()
      : Promise.resolve([] as ShuleAvanceRequest[]);
    const managerPromise = canManager
      ? fetchManagerPending()
      : Promise.resolve([] as ShuleAvanceRequest[]);

    try {
      const [finance, manager] = await Promise.all([financePromise, managerPromise]);
      setFinanceQueue(finance);
      setManagerQueue(manager);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load approval queues';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [canFinance, canManager]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(
    action: 'finance-forward' | 'finance-reject' | 'manager-approve' | 'manager-reject',
    id: string
  ) {
    setActing(id);
    try {
      if (action === 'finance-forward') await financeSendToManager(id, note || undefined);
      if (action === 'finance-reject') await financeReject(id, note || undefined);
      if (action === 'manager-approve') await managerDecision(id, 'approve', note || undefined);
      if (action === 'manager-reject') await managerDecision(id, 'reject', note || undefined);
      setNote('');
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Action failed';
      setError(message);
    } finally {
      setActing(null);
    }
  }

  if (!avanceAccess?.canApprove) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-navy">No approval access</h1>
        <p className="mt-2 text-sm text-muted">
          You are not designated as a finance or manager approver. Ask your organization admin to
          assign you under Manage Approvers, or use an organization admin account.
        </p>
        {avanceAccess?.canManageApprovers && (
          <Link href="/salary-advance/approvers" className="btn-primary mt-6 inline-block">
            Manage approvers
          </Link>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading approval queues…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">{SALARY_ADVANCE.approvals}</h1>
          <p className="mt-1 text-sm text-muted">
            {canFinance && canManager && 'Finance and manager queues'}
            {canFinance && !canManager && 'Finance review queue'}
            {!canFinance && canManager && 'Manager decision queue'}
            {avanceAccess.designatedRoles.length > 0 && (
              <span className="ml-1 text-primary">
                (designated: {avanceAccess.designatedRoles.join(', ')})
              </span>
            )}
          </p>
        </div>
        {avanceAccess.canManageApprovers && (
          <Link href="/salary-advance/approvers" className="btn-secondary text-sm">
            Manage approvers
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-4">
        <label className="text-xs font-semibold uppercase text-muted">Decision note (optional)</label>
        <input
          className="input mt-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for applicant or audit trail"
        />
      </div>

      {canFinance && (
        <QueueSection
          title="Finance queue"
          subtitle="Service requests awaiting accountant review"
          requests={financeQueue}
          empty="No requests pending finance review."
          renderActions={(req) => (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={acting === req.id}
                onClick={() => act('finance-forward', req.id)}
                className="btn-primary inline-flex items-center gap-1 text-xs"
              >
                <Check className="h-3.5 w-3.5" /> Forward to manager
              </button>
              <button
                type="button"
                disabled={acting === req.id}
                onClick={() => act('finance-reject', req.id)}
                className="btn-secondary inline-flex items-center gap-1 text-xs text-danger"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          )}
        />
      )}

      {canManager && (
        <QueueSection
          title="Manager queue"
          subtitle="Cashout and forwarded requests awaiting final decision"
          requests={managerQueue}
          empty="No requests pending manager approval."
          renderActions={(req) => (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={acting === req.id}
                onClick={() => act('manager-approve', req.id)}
                className="btn-primary inline-flex items-center gap-1 text-xs"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                disabled={acting === req.id}
                onClick={() => act('manager-reject', req.id)}
                className="btn-secondary inline-flex items-center gap-1 text-xs text-danger"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}

function QueueSection({
  title,
  subtitle,
  requests,
  empty,
  renderActions,
}: {
  title: string;
  subtitle: string;
  requests: ShuleAvanceRequest[];
  empty: string;
  renderActions: (req: ShuleAvanceRequest) => React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <p className="text-sm text-muted">{subtitle}</p>
      {requests.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
          {empty}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <div>
                <p className="font-semibold capitalize text-navy">
                  {req.requestType}
                  {req.serviceCategory ? ` · ${req.serviceCategory}` : ''}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatRwf(req.amountRwf)} · {req.repaymentTermMonths} months
                  {req.reason ? ` · ${req.reason}` : ''}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(req.createdAt).toLocaleString()} · Applicant {req.userId.slice(0, 8)}…
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AdvanceStatusBadge status={req.status} />
                {renderActions(req)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

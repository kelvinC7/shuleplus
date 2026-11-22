'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type ParentPortalChangeRequest, type ParentPortalIssueReport } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

type Tab = 'requests' | 'issues';

export function ParentPortalRequestsView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('requests');
  const [requestFilter, setRequestFilter] = useState<string>('PENDING');
  const [issueFilter, setIssueFilter] = useState<string>('OPEN');
  const [requests, setRequests] = useState<ParentPortalChangeRequest[]>([]);
  const [issues, setIssues] = useState<ParentPortalIssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setConfigError(null);
    try {
      const [cr, ir] = await Promise.all([
        transportApi.parentPortalChangeRequests(requestFilter || undefined),
        transportApi.parentPortalIssueReports(issueFilter || undefined),
      ]);
      setRequests(cr.data.data ?? []);
      setIssues(ir.data.data ?? []);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Could not load parent portal queue');
      setConfigError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [requestFilter, issueFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function respondRequest(id: string, status: 'APPROVED' | 'REJECTED') {
    setRespondingId(id);
    try {
      await transportApi.respondParentPortalChangeRequest(id, {
        status,
        schoolResponse: note.trim() || undefined,
      });
      toast.success(status === 'APPROVED' ? 'Request approved' : 'Request rejected');
      setNote('');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    } finally {
      setRespondingId(null);
    }
  }

  async function updateIssue(id: string, status: string) {
    setRespondingId(id);
    try {
      await transportApi.updateParentPortalIssueReport(id, {
        status,
        schoolNote: note.trim() || undefined,
      });
      toast.success('Issue updated');
      setNote('');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <TransportPageLayout
      actions={
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          Refresh
        </button>
      }
    >
      <p className="text-sm text-muted">
        Approve route change requests and respond to issue reports from the Parent MIS transport portal.
      </p>
      {configError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Parent portal link not working</p>
          <p className="mt-1">{configError}</p>
          <p className="mt-2 text-xs text-amber-900/80">
            On Transport backend set <code className="rounded bg-white/80 px-1">PARENT_MIS_API_URL=http://localhost:3048/api</code>{' '}
            and the same <code className="rounded bg-white/80 px-1">SERVICE_API_KEY</code> as Parent MIS. Run{' '}
            <code className="rounded bg-white/80 px-1">npx prisma db push</code> in ParentMIS/Backend for transport tables.
          </p>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'requests' ? 'bg-navy text-primary' : 'bg-white text-navy border border-slate-200'}`}
          onClick={() => setTab('requests')}
        >
          Change requests
        </button>
        <button
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'issues' ? 'bg-navy text-primary' : 'bg-white text-navy border border-slate-200'}`}
          onClick={() => setTab('issues')}
        >
          Issue reports
        </button>
        <select
          className="input ml-auto max-w-[180px]"
          value={tab === 'requests' ? requestFilter : issueFilter}
          onChange={(e) =>
            tab === 'requests' ? setRequestFilter(e.target.value) : setIssueFilter(e.target.value)
          }
        >
          {tab === 'requests' ? (
            <>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="">All</option>
            </>
          ) : (
            <>
              <option value="OPEN">Open</option>
              <option value="IN_REVIEW">In review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="">All</option>
            </>
          )}
        </select>
      </div>

      <label className="mb-4 block text-sm">
        <span className="text-muted">School note (optional, used on next action)</span>
        <textarea
          className="input mt-1 min-h-[72px] w-full"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Message shown to the parent in Parent MIS"
        />
      </label>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : tab === 'requests' ? (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-muted">No change requests in this filter.</p>
          ) : (
            requests.map((r) => (
              <article key={r.id} className="hr-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">
                      {r.student?.firstName} {r.student?.lastName} · {r.student?.shuleCode}
                    </p>
                    <p className="text-xs text-muted">
                      {r.student?.className} · {r.requestType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 text-sm">{r.reason}</p>
                <p className="mt-1 text-xs text-muted">
                  Parent: {r.parent?.firstName} {r.parent?.lastName}
                  {r.parent?.phone ? ` · ${r.parent.phone}` : ''}
                </p>
                {r.effectiveFrom || r.effectiveTo ? (
                  <p className="mt-1 text-xs text-muted">
                    Effective {r.effectiveFrom ? String(r.effectiveFrom).slice(0, 10) : '—'} →{' '}
                    {r.effectiveTo ? String(r.effectiveTo).slice(0, 10) : '—'}
                  </p>
                ) : null}
                {r.status === 'PENDING' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={respondingId === r.id}
                      onClick={() => void respondRequest(r.id, 'APPROVED')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={respondingId === r.id}
                      onClick={() => void respondRequest(r.id, 'REJECTED')}
                    >
                      Reject
                    </button>
                  </div>
                ) : r.schoolResponse ? (
                  <p className="mt-2 text-xs text-sky-900">Response: {r.schoolResponse}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <p className="text-sm text-muted">No issue reports in this filter.</p>
          ) : (
            issues.map((r) => (
              <article key={r.id} className="hr-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">
                      {r.student?.firstName} {r.student?.lastName} · {r.issueType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted">{r.student?.shuleCode}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 text-sm">{r.details}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(r.createdAt).toLocaleString()} · {r.parent?.phone ?? 'No phone'}
                </p>
                {r.status === 'OPEN' || r.status === 'IN_REVIEW' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === 'OPEN' ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={respondingId === r.id}
                        onClick={() => void updateIssue(r.id, 'IN_REVIEW')}
                      >
                        Mark in review
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={respondingId === r.id}
                      onClick={() => void updateIssue(r.id, 'RESOLVED')}
                    >
                      Resolve
                    </button>
                  </div>
                ) : r.schoolNote ? (
                  <p className="mt-2 text-xs text-sky-900">Note: {r.schoolNote}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      )}
    </TransportPageLayout>
  );
}

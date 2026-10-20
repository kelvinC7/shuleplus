'use client';

import { useState } from 'react';
import { CalendarClock, Send, CheckCircle2, AlertCircle, DoorOpen } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { useAuth } from '@/contexts/auth-context';
import { formatDate } from '@/lib/format';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

interface LeaveRequest {
  id: string;
  date: string;
  type: string;
  reason: string;
  status: string;
  submittedAt: string;
}

interface SchoolPermission {
  id: string;
  referenceNumber: string;
  type: string;
  reason: string;
  destination: string;
  status: string;
  departureAt: string | null;
  departureTime: string | null;
  expectedReturnAt: string | null;
  expectedReturnTime: string | null;
  actualReturnAt: string | null;
  isOverdue: boolean;
  isCurrentlyOut: boolean;
}

const permissionBadge: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

function permissionTime(date?: string | null, time?: string | null) {
  if (!date) return '—';
  const base = formatDate(date);
  return time ? `${base}, ${time}` : base;
}

export default function LeavePage() {
  const { data, loading, error, reload } = useStudentFetch<LeaveRequest[]>('/leave');
  const {
    data: permissions,
    loading: permissionsLoading,
    error: permissionsError,
    reload: reloadPermissions,
  } = useStudentFetch<SchoolPermission[]>('/permissions');
  const { studentParams } = useAuth();
  const [form, setForm] = useState({ date: '', type: 'Permission', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requests = data ?? [];
  const schoolPermissions = permissions ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);
    try {
      await api.post('/leave', { date: form.date, type: form.type, reason: form.reason, ...studentParams });
      setSuccess('Leave request submitted successfully.');
      setForm({ date: '', type: 'Permission', reason: '' });
      reload();
      reloadPermissions();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit leave request. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leave & Permission"
        title="Leave Requests"
        action={
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            <CalendarClock className="size-4 text-primary" />
            {requests.length} requests
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Submit form */}
        <div className="hr-card p-6">
          <h2 className="font-bold text-navy">Request Leave</h2>
          <p className="mt-1 text-sm text-slate-500">Submit a new leave or permission request for your child.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Leave date
              </label>
              <input
                type="date"
                required
                min={today}
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="input"
              >
                <option value="Permission">Permission</option>
                <option value="Medical">Medical</option>
                <option value="Family">Family</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reason
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain the reason for the leave request..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                className="input resize-none"
              />
            </div>

            {submitError && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{submitError}</p>
            )}
            {success && (
              <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{success}</p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
                  Submitting...
                </span>
              ) : (
                <>
                  <Send className="size-4" />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* School permission passes */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <DoorOpen className="size-5 text-primary" />
            <h2 className="font-bold text-navy">School Permission Passes</h2>
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-500">
              {schoolPermissions.length}
            </span>
          </div>
          {permissionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : permissionsError ? (
            <EmptyState
              icon={<AlertCircle className="text-red-500" />}
              title="Unable to load permission passes"
              description={permissionsError}
            />
          ) : schoolPermissions.length === 0 ? (
            <EmptyState
              title="No permission passes"
              description="Permission passes issued by the school for your child will appear here."
            />
          ) : (
            <div className="space-y-4">
              {schoolPermissions.map((p) => (
                <div
                  key={p.id}
                  className="hr-card flex flex-col gap-3 p-5 transition-all duration-300 hover:border-primary/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                        p.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-600'
                          : p.status === 'REJECTED' || p.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'
                      )}
                    >
                      <DoorOpen className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">
                        {p.type} — {permissionTime(p.departureAt, p.departureTime)}
                        {p.isOverdue && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                            Overdue
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">{p.reason}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {p.referenceNumber ? `${p.referenceNumber} · ` : ''}
                        Return expected {permissionTime(p.expectedReturnAt, p.expectedReturnTime)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center justify-self-start rounded-full px-4 py-1.5 text-xs font-bold sm:justify-self-end',
                      permissionBadge[p.status] ?? 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {p.isCurrentlyOut ? 'OUT' : p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load leave requests" description={error} />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No leave requests yet"
              description="Submitted leave requests will appear here with their approval status."
            />
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="hr-card flex flex-col gap-3 p-5 transition-all duration-300 hover:border-primary/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                        r.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-600'
                          : r.status === 'REJECTED'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'
                      )}
                    >
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">{r.type} — {formatDate(r.date)}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{r.reason}</p>
                      <p className="mt-0.5 text-xs text-slate-400">Submitted {formatDate(r.submittedAt)}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center justify-self-start rounded-full px-4 py-1.5 text-xs font-bold sm:justify-self-end',
                      r.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

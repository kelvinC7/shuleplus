import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { WelcomeHeader } from '@/components/welcome/welcome-header';
import {
  fetchSchoolRegistrations,
  reviewSchoolRegistrationApi,
  type SchoolRegistrationRow,
} from '@/services/portal-public-api';
import { clearToken, getToken } from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import { cn } from '@/shared/cn';
import { openOrganizationDashboard, redirectToIamLogin } from '@/shared/iam-login';

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-900';
  if (status === 'REJECTED') return 'bg-red-100 text-red-800';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

export default function SuperAdminRegistrationsPage() {
  const token = getToken();
  const user = token ? parseJwtPayload(token) : null;
  const isSuper = user?.roles?.some((r) => r === 'super_admin' || r === 'root_admin');

  const [rows, setRows] = useState<SchoolRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setRows(await fetchSchoolRegistrations(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || !isSuper) {
      redirectToIamLogin('/superadmin/registrations');
    }
  }, [token, isSuper]);

  if (!token || !isSuper) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Redirecting to Shule+ sign in…
      </div>
    );
  }

  async function decide(id: string, decision: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await reviewSchoolRegistrationApi(token, id, { decision, reviewNote: note[id] });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <WelcomeHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Super admin</p>
            <h1 className="mt-1 text-2xl font-extrabold text-navy">School registrations</h1>
            <p className="mt-2 text-sm text-slate-600">Review, approve or reject ShuleTrip school onboarding.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearToken();
              openOrganizationDashboard();
            }}
            className="text-sm font-bold text-navy hover:underline"
          >
            Sign out
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No registrations yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <li key={row.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-navy">{row.officialName}</h2>
                        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase', statusTone(row.status))}>
                          {row.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-slate-500">{row.reference} · {row.schoolCode}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {row.accountEmail} · @{row.username}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Submitted {new Date(row.submittedAt).toLocaleString()}
                      </p>
                      {row.reviewNote ? (
                        <p className="mt-2 text-sm text-slate-600">
                          <b>Note:</b> {row.reviewNote}
                        </p>
                      ) : null}
                    </div>

                    {row.status === 'SUBMITTED' || row.status === 'UNDER_REVIEW' || row.status === 'ADDITIONAL_INFO_REQUIRED' ? (
                      <div className="w-full max-w-md space-y-2">
                        <textarea
                          className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/10"
                          placeholder="Review note (optional)"
                          rows={2}
                          value={note[row.id] ?? ''}
                          onChange={(e) => setNote((n) => ({ ...n, [row.id]: e.target.value }))}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => decide(row.id, 'APPROVED')}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => decide(row.id, 'REJECTED')}
                            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => decide(row.id, 'UNDER_REVIEW')}
                            className="rounded-full border border-line px-4 py-2 text-xs font-bold text-navy"
                          >
                            Mark in review
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-navy hover:underline">
          ← Back to welcome
        </Link>
      </main>
    </div>
  );
}

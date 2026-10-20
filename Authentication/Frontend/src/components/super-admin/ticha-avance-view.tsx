'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { kaziPlatformApi, type PlatformRequestRow } from '@/lib/kazi-platform-api';
import { useToast } from '@/shared/notifications/toast/toast';

function money(n: number) {
  return `${Math.round(n || 0).toLocaleString('en-RW')} Frw`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_PILL: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-800',
  'Under Review': 'bg-sky-50 text-sky-800',
  Approved: 'bg-emerald-50 text-emerald-800',
  Disbursed: 'bg-blue-50 text-blue-800',
  Completed: 'bg-slate-100 text-slate-700',
  Rejected: 'bg-red-50 text-red-700',
};

export function TichaAvancePlatformView() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState('All');
  const [schools, setSchools] = useState<string[]>([]);
  const [rows, setRows] = useState<PlatformRequestRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, active: 0, incomeTotal: 0 });
  const [percent, setPercent] = useState('0.2');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [policy, workspace] = await Promise.all([
        kaziPlatformApi.getPolicy(),
        kaziPlatformApi.getRequests(school),
      ]);
      setPercent(String(policy.data?.profitPercent ?? 0.2));
      setSchools(workspace.schools || []);
      setRows(workspace.data || []);
      setSummary(workspace.summary || { total: 0, pending: 0, active: 0, incomeTotal: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load TichaAvance data.');
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.requestNumber.toLowerCase().includes(q) ||
        r.teacher.toLowerCase().includes(q) ||
        r.school.toLowerCase().includes(q)
    );
  }, [rows, query]);

  async function savePolicy() {
    setSaving(true);
    try {
      const data = await kaziPlatformApi.setPolicy(Number(percent));
      setPercent(String(data.data.profitPercent));
      toast.success('Profit policy saved. New teacher requests will use this rate.', 'TichaAvance');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save policy', 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Super Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-navy">TichaAvance</h1>
        <p className="mt-1 text-sm text-muted">
          All teacher advance requests across schools, with platform income from the profit policy.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total requests', value: summary.total },
          { label: 'Pending', value: summary.pending },
          { label: 'Active', value: summary.active },
          { label: 'Platform income', value: money(summary.incomeTotal) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-navy/[0.06] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-2 text-xl font-bold text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/[0.06] bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Profit policy</p>
        <p className="mt-1 text-sm text-navy/70">
          Applied as platform income when a teacher requests an advance on TichaPortal.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">Rate (%)</span>
            <input
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="h-11 w-32 rounded-xl border border-slate-200 px-3 text-sm text-navy outline-none focus:border-primary"
              inputMode="decimal"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void savePolicy()}
            className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save policy'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Requests & repayments</p>
            <p className="text-sm font-semibold text-navy">{filtered.length} records</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy"
            >
              <option value="All">All schools</option>
              {schools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teacher or ID"
                className="h-10 rounded-xl border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-navy text-[11px] font-semibold uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Advance ID</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Profit</th>
                <th className="px-4 py-3">Income</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-muted">No requests for this school.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-navy">{r.requestNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-navy">{r.school}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-navy">{r.teacher}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{money(r.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(r.totalPaid)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(r.remainingBalance)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{r.profitPercent}%</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{money(r.income)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_PILL[r.status] || 'bg-slate-100 text-slate-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(r.submittedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

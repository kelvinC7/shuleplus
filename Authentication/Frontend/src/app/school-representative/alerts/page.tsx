'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createRepFollowUp,
  fetchRepAlerts,
  fetchRepFollowUps,
  updateRepFollowUp,
} from '@/lib/school-representative-api';
import { RepFilterBar } from '@/components/school-representative/rep-filter-bar';
import { RepDataTable } from '@/components/school-representative/rep-data-table';
import { useRepContext } from '@/components/school-representative/rep-context';

export default function RepAlertsPage() {
  const { schoolScope, schools } = useRepContext();
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof fetchRepAlerts>>>([]);
  const [followUps, setFollowUps] = useState<Awaited<ReturnType<typeof fetchRepFollowUps>>>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [orgId, setOrgId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, f] = await Promise.all([
        fetchRepAlerts(schoolScope === 'all' ? undefined : schoolScope),
        fetchRepFollowUps(),
      ]);
      setAlerts(a);
      setFollowUps(f);
    } finally {
      setLoading(false);
    }
  }, [schoolScope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (schools.length && !orgId) setOrgId(schools[0].id);
  }, [schools, orgId]);

  async function handleCreateFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !orgId) return;
    setSaving(true);
    try {
      await createRepFollowUp({ organizationId: orgId, title: title.trim(), priority: 'MEDIUM' });
      setTitle('');
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Alerts & Follow-up</h1>
        <p className="text-sm text-muted">Turn dashboard signals into tracked actions</p>
      </div>
      <RepFilterBar onRefresh={load} refreshing={loading} />

      <div className="grid gap-4 lg:grid-cols-2">
        {alerts.map((alert: {
          id: string;
          title: string;
          message: string;
          severity: string;
          schoolName: string;
        }) => (
          <div
            key={alert.id}
            className="rounded-2xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                  alert.severity === 'high'
                    ? 'bg-red-100 text-red-800'
                    : alert.severity === 'warning'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-sky-100 text-sky-900'
                }`}
              >
                {alert.severity}
              </span>
              <span className="text-xs text-muted">{alert.schoolName}</span>
            </div>
            <h3 className="font-semibold text-navy">{alert.title}</h3>
            <p className="mt-1 text-sm text-muted">{alert.message}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleCreateFollowUp}
        className="rounded-2xl border border-border bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 font-semibold text-navy">Create follow-up task</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title for school manager…"
            className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Assign follow-up'}
          </button>
        </div>
      </form>

      <RepDataTable
        rows={followUps}
        getRowKey={(r) => r.id}
        emptyMessage="No follow-ups yet."
        columns={[
          { key: 'school', header: 'School', render: (r) => r.schoolName },
          { key: 'title', header: 'Task', render: (r) => r.title },
          { key: 'priority', header: 'Priority', render: (r) => r.priority },
          { key: 'status', header: 'Status', render: (r) => r.status },
          {
            key: 'action',
            header: '',
            render: (r) =>
              r.status !== 'COMPLETED' ? (
                <button
                  type="button"
                  className="text-xs font-medium text-navy underline"
                  onClick={() => void updateRepFollowUp(r.id, { status: 'COMPLETED' }).then(load)}
                >
                  Mark complete
                </button>
              ) : (
                <span className="text-xs text-muted">Done</span>
              ),
          },
        ]}
      />
    </div>
  );
}

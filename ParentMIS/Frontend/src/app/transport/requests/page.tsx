'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import { TransportPortalShell } from '@/components/transport/transport-portal-shell';

const REQUEST_TYPES = [
  { value: 'PICKUP_CHANGE', label: 'New morning pickup point' },
  { value: 'DROPOFF_CHANGE', label: 'New afternoon drop-off point' },
  { value: 'TEMPORARY', label: 'Temporary change (specific dates)' },
  { value: 'CAREGIVER', label: 'Authorized caregiver / handover change' },
];

export default function TransportRequestsPage() {
  const { studentParams } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>, reload: () => void) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/transport/change-requests', {
        requestType: fd.get('requestType'),
        reason: fd.get('reason'),
        effectiveFrom: fd.get('effectiveFrom') || undefined,
        effectiveTo: fd.get('effectiveTo') || undefined,
        ...studentParams,
      });
      setMessage('Request submitted. Your current route stays active until the school approves.');
      e.currentTarget.reset();
      reload();
    } catch {
      setMessage('Could not submit request. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TransportPortalShell title="Route & stop change requests">
      {({ data, reload }) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <form className="hr-card space-y-3 p-5" onSubmit={(e) => void onSubmit(e, reload)}>
            <p className="font-semibold text-navy">New request</p>
            <label className="block text-sm">
              <span className="text-muted">Request type</span>
              <select name="requestType" className="input mt-1 w-full" required>
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted">Reason & details</span>
              <textarea name="reason" className="input mt-1 min-h-[100px] w-full" required />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-muted">Effective from</span>
                <input type="date" name="effectiveFrom" className="input mt-1 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Effective to</span>
                <input type="date" name="effectiveTo" className="input mt-1 w-full" />
              </label>
            </div>
            {message ? <p className="text-sm text-navy">{message}</p> : null}
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit for school approval'}
            </button>
            <p className="text-[11px] text-muted">Current assignment remains until approved.</p>
          </form>
          <div className="hr-card p-5">
            <p className="font-semibold text-navy">Your requests</p>
            <ul className="mt-3 space-y-2">
              {data.changeRequests.length === 0 ? (
                <li className="text-sm text-muted">No requests yet.</li>
              ) : (
                data.changeRequests.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-100 px-3 py-2">
                    <p className="text-sm font-semibold text-navy">{r.requestType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted">{r.status}</p>
                    <p className="mt-1 text-xs">{r.reason}</p>
                    {r.schoolResponse ? <p className="mt-1 text-xs text-sky-800">School: {r.schoolResponse}</p> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </TransportPortalShell>
  );
}

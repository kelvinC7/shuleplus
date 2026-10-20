'use client';

import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  fetchDeveloperSessions,
  fetchSecurityOverview,
  setupDeveloperMfa,
  verifyDeveloperMfaSetup,
  type DevSession,
  type SecurityOverview,
} from '@/lib/developer-api';
import { PageHeader } from '@/components/developer/developer-page-ui';

function SecurityCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
      <span>{label}</span>
    </div>
  );
}

export default function SecurityPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [sessions, setSessions] = useState<DevSession[]>([]);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    fetchSecurityOverview().then(setOverview).catch(() => {});
    fetchDeveloperSessions().then(setSessions).catch(() => {});
  }, []);

  async function startMfaSetup() {
    const data = await setupDeveloperMfa();
    setMfaSetup(data);
  }

  async function confirmMfa() {
    await verifyDeveloperMfaSetup(mfaCode);
    setMfaSetup(null);
    setMfaCode('');
    fetchSecurityOverview().then(setOverview);
  }

  const checks = overview?.checks ?? {};
  const currentSessionId = sessions[0]?.id;

  return (
    <div>
      <PageHeader title="Security Center" description="Protect your developer account and integrations" />

      <div className="mb-6 rounded-2xl border border-border/60 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-muted">Security score</p>
        <p className="font-montserrat text-5xl font-bold text-navy">
          {overview?.score ?? '—'}
          <span className="text-2xl text-muted"> / 100</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SecurityCheck ok={Boolean(checks.mfaEnabled)} label="MFA enabled" />
        <SecurityCheck ok={Boolean(checks.emailVerified)} label="Email verified" />
        <SecurityCheck ok={Boolean(checks.strongPassword)} label="Strong password set" />
        <SecurityCheck ok={Boolean(checks.recoveryCodes)} label="Recovery codes configured" />
        <SecurityCheck ok={Boolean(checks.noSuspiciousSessions)} label="No suspicious sessions" />
        <SecurityCheck ok={Boolean(checks.ipRestrictionConfigured)} label="IP restriction configured" />
      </div>

      {!checks.mfaEnabled && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-navy">Set up authenticator MFA</h3>
          {!mfaSetup ? (
            <button
              type="button"
              onClick={startMfaSetup}
              className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary"
            >
              Configure MFA
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted">
                Scan this secret in Google Authenticator, Microsoft Authenticator, or Authy:
              </p>
              <code className="block break-all rounded-lg bg-navy/5 p-3 font-mono text-xs">{mfaSetup.secret}</code>
              <input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="6-digit code"
                className="rounded-xl border px-4 py-2 text-sm"
              />
              <button
                type="button"
                onClick={confirmMfa}
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary"
              >
                Verify & enable
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-semibold text-navy">Active sessions</h3>
        <div className="mt-3 space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-xl border border-border/60 bg-white px-4 py-3 text-sm shadow-sm">
              <p className="font-medium">{s.deviceName ?? `${s.browser ?? 'Browser'} · ${s.os ?? 'Unknown OS'}`}</p>
              <p className="text-xs text-muted">
                {s.ipAddress ?? 'Unknown IP'} · {new Date(s.lastActivity).toLocaleString()}
              </p>
              {s.id === currentSessionId && (
                <span className="mt-1 inline-block text-xs font-semibold text-emerald-600">Most recent session</span>
              )}
            </div>
          ))}
          {sessions.length === 0 && <p className="text-sm text-muted">No active sessions.</p>}
        </div>
      </div>
    </div>
  );
}

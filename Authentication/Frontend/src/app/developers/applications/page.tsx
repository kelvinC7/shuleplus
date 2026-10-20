'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  createApplication,
  fetchApplications,
  fetchSandboxOverview,
  grantedScopesFromModules,
  rotateApplicationSecret,
  type DeveloperApplication,
} from '@/lib/developer-api';
import { useDeveloperPortal } from '@/components/developer/developer-shell';
import { PageHeader } from '@/components/developer/developer-page-ui';

export default function ApplicationsPage() {
  const { user, environment } = useDeveloperPortal();
  const [apps, setApps] = useState<DeveloperApplication[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSecret, setNewSecret] = useState<{ clientId: string; secret: string } | null>(null);
  const [name, setName] = useState('');
  const [env, setEnv] = useState<'SANDBOX' | 'PRODUCTION'>(environment);
  const [loading, setLoading] = useState(false);
  const [productionApproved, setProductionApproved] = useState(false);

  function load() {
    fetchApplications().then(setApps).catch(() => {});
    fetchSandboxOverview()
      .then((o) => setProductionApproved(o.production.accessStatus === 'APPROVED'))
      .catch(() => {});
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setEnv(environment);
  }, [environment]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const scopes = user ? grantedScopesFromModules(user.allowedModules) : [];
      const app = await createApplication({ name, environment: env, scopes });
      if (app.clientSecret) {
        setNewSecret({ clientId: app.clientId, secret: app.clientSecret });
      }
      setShowCreate(false);
      setName('');
      load();
    } finally {
      setLoading(false);
    }
  }

  async function handleRotate(id: string) {
    if (!confirm('Rotate client secret? The old secret will stop working immediately.')) return;
    const result = await rotateApplicationSecret(id);
    setNewSecret({ clientId: result.clientId, secret: result.clientSecret });
    load();
  }

  return (
    <div>
      <PageHeader
        title="My Applications"
        description="Manage API credentials per integration"
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary"
          >
            + Create Application
          </button>
        }
      />

      {newSecret && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">⚠ Client Secret — shown once only</p>
          <p className="mt-1 text-sm text-amber-800">Store securely before leaving this page.</p>
          <div className="mt-3 space-y-2 font-mono text-sm">
            <p><span className="text-muted">Client ID:</span> {newSecret.clientId}</p>
            <p><span className="text-muted">Client Secret:</span> {newSecret.secret}</p>
          </div>
          <button type="button" onClick={() => setNewSecret(null)} className="mt-3 text-sm font-semibold text-navy underline">
            I have saved it
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-navy">Create Application</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Application name"
              required
              className="rounded-xl border border-navy/10 px-4 py-2.5 text-sm"
            />
            <select value={env} onChange={(e) => setEnv(e.target.value as 'SANDBOX' | 'PRODUCTION')} className="rounded-xl border border-navy/10 px-4 py-2.5 text-sm">
              <option value="SANDBOX">Sandbox</option>
              <option value="PRODUCTION" disabled={!productionApproved}>
                Production{productionApproved ? '' : ' (requires approval)'}
              </option>
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {apps.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-navy/20 p-8 text-center text-muted">No applications yet. Create your first integration.</p>
        ) : (
          apps.map((app) => (
            <div key={app.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">{app.name}</h3>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${app.environment === 'PRODUCTION' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>
                    {app.environment}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    app.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : app.status === 'SUSPENDED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {app.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-3 font-mono text-xs text-muted">Client ID: {app.clientId}</p>
              <p className="mt-1 text-xs text-muted">
                Scopes: {(app.scopes as string[]).join(' • ') || 'None'}
              </p>
              {app.lastUsedAt && (
                <p className="mt-1 text-xs text-muted">Last used: {new Date(app.lastUsedAt).toLocaleString()}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => handleRotate(app.id)} className="rounded-lg border border-navy/15 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5">
                  Rotate Secret
                </button>
                <Link href="/developers/credentials" className="rounded-lg bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy">
                  Manage →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

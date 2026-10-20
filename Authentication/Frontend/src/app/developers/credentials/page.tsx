'use client';

import { useEffect, useState } from 'react';
import { fetchApplications, type DeveloperApplication } from '@/lib/developer-api';
import { PageHeader } from '@/components/developer/developer-page-ui';

export default function CredentialsPage() {
  const [apps, setApps] = useState<DeveloperApplication[]>([]);

  useEffect(() => {
    fetchApplications().then(setApps).catch(() => {});
  }, []);

  const prod = apps.filter((a) => a.environment === 'PRODUCTION');
  const sandbox = apps.filter((a) => a.environment === 'SANDBOX');

  function CredentialBlock({ app }: { app: DeveloperApplication }) {
    return (
      <div className="rounded-2xl border border-navy/10 bg-white p-5">
        <h3 className="font-semibold text-navy">{app.name}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Client ID</p>
            <code className="mt-1 block font-mono text-sm">{app.clientId}</code>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Client Secret</p>
            <code className="mt-1 block font-mono text-sm">{app.clientSecretPrefix}</code>
          </div>
          <p className="text-xs text-muted">Created {new Date(app.createdAt).toLocaleDateString()}</p>
        </div>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ Secrets are shown only once at creation. Use Rotate Secret to generate a new one.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Credentials" description="OAuth 2.0 client credentials for API authentication" />

      <div className="mb-8 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm">
        <p className="font-semibold text-sky-900">Authentication Flow</p>
        <p className="mt-2 text-sky-800">
          POST /oauth/token with client_id + client_secret → receive 15-minute Bearer access token
        </p>
      </div>

      {prod.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Production
          </h2>
          <div className="grid gap-4 md:grid-cols-2">{prod.map((a) => <CredentialBlock key={a.id} app={a} />)}</div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> Sandbox
        </h2>
        {sandbox.length === 0 ? (
          <p className="text-muted">No sandbox applications. Create one from Applications.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{sandbox.map((a) => <CredentialBlock key={a.id} app={a} />)}</div>
        )}
      </section>
    </div>
  );
}

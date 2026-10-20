'use client';

import { Download, FileJson, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { fetchPostmanExport } from '@/lib/developer-api';

export function PostmanDownloadPanel({
  compact,
  variant = 'default',
}: {
  compact?: boolean;
  variant?: 'default' | 'hero';
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [setup, setSetup] = useState<{
    clientId?: string;
    clientSecret?: string;
    organizationId?: string | null;
  } | null>(null);

  async function download() {
    setLoading(true);
    setMessage('');
    setSuccess(false);
    setSetup(null);
    try {
      const result = await fetchPostmanExport();
      const dl = (obj: object, name: string) => {
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      };
      dl(result.collection, 'shuleplus-api.postman_collection.json');
      await new Promise((r) => setTimeout(r, 300));
      dl(result.environment, 'shuleplus-sandbox.postman_environment.json');
      setSetup({
        clientId: result.setup?.clientId,
        clientSecret: result.setup?.clientSecret,
        organizationId: result.setup?.organizationId,
      });
      setSuccess(true);
      setMessage(
        'Downloaded 2 files. In Postman: Import both → select your Sandbox environment (top-right) → run Get OAuth Token → then any API request.'
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(msg ?? 'Could not generate Postman files. Ensure you are logged in as a developer.');
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'hero') {
    return (
      <div className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-navy via-[#1a2a6c] to-navy shadow-lg">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Step 1 — Download
              </p>
            </div>
            <h2 className="mt-2 font-montserrat text-xl font-bold">Postman collection & environment</h2>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Pre-configured with your linked sandbox school <code className="text-primary">organization_id</code>, OAuth
              credentials, and all endpoints you have permission for.
            </p>
            <ol className="mt-3 list-inside list-decimal space-y-1 text-xs text-white/60">
              <li>Click Download — saves 2 JSON files</li>
              <li>Postman → Import → select both files</li>
              <li>Select environment dropdown (top-right)</li>
              <li>Run <strong className="text-white/90">Get OAuth Token</strong></li>
              <li>Run any request in the collection</li>
            </ol>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={download}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-navy shadow-lg transition hover:brightness-105 disabled:opacity-60"
          >
            <Download className="h-5 w-5" />
            {loading ? 'Preparing…' : 'Download Postman'}
          </button>
        </div>
        {(message || setup) && (
          <div className={`border-t px-6 py-4 ${success ? 'border-emerald-500/30 bg-emerald-950/40' : 'border-white/10 bg-black/20'}`}>
            {success && (
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Files downloaded successfully
              </p>
            )}
            {message && <p className="text-xs text-white/70">{message}</p>}
            {setup?.clientSecret && (
              <p className="mt-2 break-all rounded-lg bg-black/40 p-2 font-mono text-[10px] text-amber-200">
                client_secret (save now): {setup.clientSecret}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-border/60 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy">Postman collection & environment</p>
          <p className="mt-1 text-sm text-muted">
            Downloads collection + environment with sandbox OAuth and organization ID.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={download}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-navy disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {loading ? 'Preparing…' : 'Download Postman'}
        </button>
      </div>

      {message && <p className="mt-3 text-xs text-muted">{message}</p>}

      {setup?.clientSecret && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="break-all font-mono text-[10px]">
            <span className="font-semibold text-red-700">client_secret:</span> {setup.clientSecret}
          </p>
        </div>
      )}
    </div>
  );
}

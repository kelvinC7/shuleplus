'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Play,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  Server,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { gatewayProxyRequest } from '@/lib/developer-api';

export type ApiTestItem = {
  id: string;
  label: string;
  description?: string;
  method: string;
  path: string;
  moduleSlug: string;
  permission?: string;
  authMode?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  hasPathParams?: boolean;
};

export type ApiTestModule = {
  slug: string;
  name: string;
  description?: string;
  grantedPermissions?: string[];
  items: ApiTestItem[];
  upstreamBase?: string;
  health?: { ok: boolean; latencyMs?: number; error?: string };
};

interface Props {
  open: boolean;
  module: ApiTestModule | null;
  gatewayBase: string;
  organizationId?: string | null;
  onClose: () => void;
}

const START_HINTS: Record<string, string> = {
  'school-fees': 'cd SchoolFeesPortal/Backend && npm run dev  →  port 3014',
  'babyeyi-wizard': 'cd BabyeyiWizard/Backend && npm run dev  →  port 3012',
  'webpage-babyeyi': 'cd WebpageBabyeyi/Backend && npm run dev  →  port 3099',
  'student-management': 'cd StudentManagement/Backend && npm run dev  →  port 3052',
};

function extractErrorMessage(err: unknown): { status: number; message: string; body: unknown } {
  const ax = err as {
    response?: { status?: number; data?: { message?: string; data?: unknown } };
  };
  const status = ax.response?.status ?? 500;
  const message =
    ax.response?.data?.message ??
    (status === 502
      ? 'Backend not reachable (502). Start the module server locally.'
      : 'Request failed');
  return { status, message, body: ax.response?.data ?? { message } };
}

export function DeveloperApiTestModal({
  open,
  module,
  gatewayBase,
  organizationId,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    ok: boolean;
    status: number;
    ms: number;
    body: unknown;
    message?: string;
    requestId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => module?.items.find((i) => i.id === selectedId) ?? module?.items[0] ?? null,
    [module, selectedId]
  );

  const groupedByPermission = useMemo(() => {
    if (!module) return [];
    const map = new Map<string, ApiTestItem[]>();
    for (const item of module.items) {
      const key = item.permission ?? 'other';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [module]);

  useEffect(() => {
    if (module?.items[0]) setSelectedId(module.items[0].id);
    setResponse(null);
  }, [module]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !module) return null;

  const fullUrl = selected
    ? `${gatewayBase}/${module.slug}${selected.path}${
        selected.query && Object.keys(selected.query).length
          ? `?${new URLSearchParams(selected.query).toString()}`
          : ''
      }`
    : '';

  const backendDown = module.health && !module.health.ok;
  const startHint = START_HINTS[module.slug];

  async function runTest() {
    if (!selected) return;
    if (selected.hasPathParams) {
      setResponse({
        ok: false,
        status: 400,
        ms: 0,
        message: `This route has path parameters (${selected.path}). Replace {id} placeholders in the path before running, or use Postman.`,
        body: { hint: 'Use Postman collection for routes with {id}, {reference}, etc.' },
      });
      return;
    }
    setLoading(true);
    setResponse(null);
    try {
      const result = await gatewayProxyRequest({
        moduleSlug: module!.slug,
        method: selected.method,
        path: selected.path,
        query: selected.query,
        body: selected.body,
      });
      setResponse({
        ok: result.success,
        status: result.success ? 200 : 400,
        ms: result.responseTime,
        body: result.data,
        requestId: result.requestId,
      });
    } catch (err: unknown) {
      const { status, message, body } = extractErrorMessage(err);
      setResponse({
        ok: false,
        status,
        ms: 0,
        message,
        body,
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    if (!fullUrl) return;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0f2c]">
      {/* Header */}
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-navy to-[#141f52] px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">API Test Lab</p>
            {module.health && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  module.health.ok
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                <Server className="h-3 w-3" />
                {module.health.ok
                  ? `Backend online · ${module.health.latencyMs}ms`
                  : 'Backend offline'}
              </span>
            )}
          </div>
          <h2 className="mt-1 font-montserrat text-xl font-bold text-white sm:text-2xl">{module.name}</h2>
          {module.description && (
            <p className="mt-1 max-w-2xl text-sm text-white/60">{module.description}</p>
          )}
          {module.grantedPermissions && module.grantedPermissions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {module.grantedPermissions.map((p) => (
                <span
                  key={p}
                  className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[9px] font-medium text-emerald-300/90"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/15 bg-white/5 p-2 text-white/80 hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {backendDown && (
        <div className="flex shrink-0 items-start gap-3 border-b border-red-500/30 bg-red-950/50 px-5 py-3 sm:px-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-red-200">
              {module.name} backend is not running — tests will return 502
            </p>
            {module.upstreamBase && (
              <p className="mt-0.5 font-mono text-xs text-red-300/80">{module.upstreamBase}</p>
            )}
            {startHint && (
              <p className="mt-2 rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-amber-200">
                {startHint}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3-column body: scenarios | request | response */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_1fr_1fr]">
        {/* Col 1 — Scenarios */}
        <aside className="overflow-y-auto border-b border-white/10 bg-[#0d1338] lg:border-b-0 lg:border-r">
          <p className="sticky top-0 z-10 bg-[#0d1338] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Endpoints by permission · {module.items.length}
          </p>
          <div className="space-y-3 px-2 pb-4">
            {groupedByPermission.map(([permission, items]) => (
              <div key={permission}>
                <p className="sticky top-10 z-[5] bg-[#0d1338] px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-primary/90">
                  {permission}
                  <span className="ml-1.5 font-normal text-white/35">({items.length})</span>
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  {items.map((item) => {
                    const isActive = selected?.id === item.id;
                    const itemResult = response && selected?.id === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(item.id);
                            setResponse(null);
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-left transition ${
                            isActive
                              ? 'bg-primary/15 ring-1 ring-primary/50'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                item.method === 'GET'
                                  ? 'bg-emerald-500/25 text-emerald-300'
                                  : item.method === 'POST'
                                    ? 'bg-sky-500/25 text-sky-300'
                                    : item.method === 'DELETE'
                                      ? 'bg-red-500/25 text-red-300'
                                      : 'bg-amber-500/25 text-amber-300'
                              }`}
                            >
                              {item.method}
                            </span>
                            <span className="truncate text-xs font-medium text-white">{item.label}</span>
                            {itemResult && (
                              <span className="ml-auto shrink-0">
                                {response!.ok ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                                )}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[9px] text-white/30">{item.path}</p>
                          {item.hasPathParams && (
                            <p className="mt-0.5 text-[9px] text-amber-400/80">Requires path params</p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Col 2 — Request */}
        <section className="flex min-h-0 flex-col overflow-y-auto border-b border-white/10 bg-[#0a0f2c] lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0f2c]/95 px-4 py-2.5 backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Request</p>
          </div>
          {selected ? (
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    selected.method === 'GET'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {selected.method}
                </span>
                <code className="break-all text-sm font-medium text-white/90">{selected.path}</code>
              </div>
              <p className="text-xs leading-relaxed text-white/55">{selected.description}</p>

              <div className="rounded-xl border border-white/8 bg-black/25 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-white/35">Gateway URL</span>
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="rounded-md p-1 text-white/40 hover:bg-white/5 hover:text-white/70"
                  >
                    {copied ? (
                      <span className="text-[9px] text-emerald-400">Copied</span>
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <code className="block break-all text-[10px] leading-relaxed text-emerald-400/90">
                  {fullUrl}
                </code>
              </div>

              {selected.query && (
                <div>
                  <p className="mb-1.5 text-[9px] font-bold uppercase text-white/35">Query parameters</p>
                  <pre className="overflow-x-auto rounded-xl border border-white/8 bg-black/25 p-3 text-[11px] leading-relaxed text-sky-200/90">
                    {JSON.stringify(selected.query, null, 2)}
                  </pre>
                </div>
              )}

              {selected.body && (
                <div>
                  <p className="mb-1.5 text-[9px] font-bold uppercase text-white/35">Request body</p>
                  <pre className="overflow-x-auto rounded-xl border border-white/8 bg-black/25 p-3 text-[11px] leading-relaxed text-sky-200/90">
                    {JSON.stringify(selected.body, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-[10px] text-white/40">
                {selected.permission && (
                  <span>
                    Scope: <code className="text-primary/90">{selected.permission}</code>
                  </span>
                )}
                {selected.authMode && (
                  <span>
                    · {selected.authMode === 'none' ? 'Public' : 'Service JWT (auto)'}
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={runTest}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-navy shadow-lg shadow-primary/20 transition hover:brightness-105 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                {loading ? 'Sending request…' : 'Run test'}
              </button>
            </div>
          ) : (
            <p className="p-6 text-sm text-white/40">Select a scenario.</p>
          )}
        </section>

        {/* Col 3 — Response (always visible) */}
        <section className="flex min-h-0 flex-col bg-[#060a1a]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Response</p>
            {response && (
              <div className="flex items-center gap-2">
                {response.ms > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-white/40">
                    <Clock className="h-3 w-3" />
                    {response.ms} ms
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    response.ok
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {response.status} {response.ok ? 'OK' : 'Error'}
                </span>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-white/40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Waiting for {module.name}…</p>
              </div>
            )}

            {!loading && !response && (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Server className="h-8 w-8 text-white/20" />
                <p className="text-sm font-medium text-white/50">Response will appear here</p>
                <p className="max-w-xs text-xs text-white/30">
                  Select a scenario on the left, then click Run test
                </p>
              </div>
            )}

            {!loading && response && (
              <div className="space-y-3">
                {!response.ok && response.message && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3">
                    <p className="flex items-start gap-2 text-xs font-medium text-red-200">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {response.message}
                    </p>
                    {response.status === 502 && startHint && (
                      <p className="mt-2 font-mono text-[10px] text-amber-300/90">{startHint}</p>
                    )}
                  </div>
                )}
                {response.requestId && (
                  <p className="font-mono text-[9px] text-white/25">req {response.requestId}</p>
                )}
                <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-[#0d1117] p-4 text-[11px] leading-relaxed text-emerald-300/95">
                  {JSON.stringify(response.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

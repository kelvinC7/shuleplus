'use client';

import { useEffect, useState } from 'react';
import {
  fetchApiCatalog,
  gatewayProxyRequest,
  type ApiModule,
} from '@/lib/developer-api';
import { PageHeader } from '@/components/developer/developer-page-ui';

export default function ApiExplorerPage() {
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [moduleSlug, setModuleSlug] = useState('');
  const [endpointId, setEndpointId] = useState('');
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState('{}');
  const [response, setResponse] = useState<{
    status: number;
    body: unknown;
    ms: number;
    requestId: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApiCatalog().then((d) => {
      setModules(d.modules);
      if (d.modules[0]) {
        setModuleSlug(d.modules[0].slug);
        setEndpointId(d.modules[0].endpoints[0]?.id ?? '');
      }
    }).catch(() => {});
  }, []);

  const mod = modules.find((m) => m.slug === moduleSlug);
  const endpoint = mod?.endpoints.find((e) => e.id === endpointId);

  useEffect(() => {
    if (endpoint?.queryParams) {
      const q: Record<string, string> = {};
      for (const p of endpoint.queryParams) {
        q[p.name] = queryValues[p.name] ?? '';
      }
      setQueryValues(q);
    }
    if (endpoint?.requestBody) {
      setRequestBody(JSON.stringify(endpoint.requestBody, null, 2));
    }
  }, [endpointId, endpoint]);

  async function sendRequest() {
    if (!mod || !endpoint) return;
    setError('');
    setLoading(true);
    setResponse(null);
    try {
      let path = endpoint.path;
      for (const [k, v] of Object.entries(queryValues)) {
        if (path.includes(`{${k}}`) && v) path = path.replace(`{${k}}`, encodeURIComponent(v));
      }
      const query: Record<string, string> = {};
      for (const [k, v] of Object.entries(queryValues)) {
        if (v && !endpoint.path.includes(`{${k}}`)) query[k] = v;
      }
      let body: unknown;
      if (endpoint.method !== 'GET' && endpoint.method !== 'DELETE') {
        try {
          body = JSON.parse(requestBody);
        } catch {
          setError('Invalid JSON in request body');
          setLoading(false);
          return;
        }
      }
      const result = await gatewayProxyRequest({
        moduleSlug: mod.slug,
        method: endpoint.method,
        path,
        query,
        body,
      });
      setResponse({
        status: result.success ? 200 : 400,
        body: result.data,
        ms: result.responseTime,
        requestId: result.requestId,
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; data?: unknown }; status?: number } };
      setError(ax.response?.data?.message ?? 'Request failed');
      if (ax.response?.data) {
        setResponse({
          status: ax.response.status ?? 500,
          body: ax.response.data,
          ms: 0,
          requestId: '—',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="API Explorer" description="Test live API calls through the developer gateway (sandbox)" />

      <div className="rounded-2xl border border-navy/10 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted">Module</label>
            <select
              value={moduleSlug}
              onChange={(e) => {
                setModuleSlug(e.target.value);
                const m = modules.find((x) => x.slug === e.target.value);
                setEndpointId(m?.endpoints[0]?.id ?? '');
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              {modules.map((m) => (
                <option key={m.slug} value={m.slug}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted">Endpoint</label>
            <select
              value={endpointId}
              onChange={(e) => setEndpointId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              {mod?.endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>{ep.method} {ep.path}</option>
              ))}
            </select>
          </div>
        </div>

        {endpoint && (
          <>
            <div className="mt-4 flex items-center gap-2 font-mono text-sm">
              <span className={`rounded px-2 py-1 text-xs font-bold ${
                endpoint.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              }`}>{endpoint.method}</span>
              <span>{endpoint.path}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{endpoint.description}</p>

            {endpoint.queryParams && endpoint.queryParams.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {endpoint.queryParams.map((p) => (
                  <div key={p.name}>
                    <label className="text-xs text-muted">{p.name}{p.required ? ' *' : ''}</label>
                    <input
                      value={queryValues[p.name] ?? ''}
                      onChange={(e) => setQueryValues((q) => ({ ...q, [p.name]: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-mono"
                      placeholder={p.description}
                    />
                  </div>
                ))}
              </div>
            )}

            {endpoint.method !== 'GET' && endpoint.method !== 'DELETE' && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-muted">Request Body (JSON)</label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-xs"
                />
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button
          type="button"
          onClick={sendRequest}
          disabled={loading || !endpoint}
          className="mt-4 rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-primary disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send Request'}
        </button>

        {response && (
          <div className="mt-6 border-t pt-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className={`font-semibold ${response.status < 400 ? 'text-emerald-600' : 'text-red-600'}`}>
                {response.status} {response.status < 400 ? 'OK' : 'Error'}
              </span>
              {response.ms > 0 && <span className="text-muted">{response.ms} ms</span>}
              <span className="font-mono text-xs text-muted">{response.requestId}</span>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0d1117] p-4 text-xs text-emerald-300">
              {JSON.stringify(response.body, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

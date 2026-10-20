'use client';

import { useEffect, useState } from 'react';
import { Play, Download, BookOpen } from 'lucide-react';
import {
  fetchApiCatalog,
  fetchSandboxOverview,
  resolveDeveloperApiBase,
  resolveDeveloperGatewayBase,
  type ApiModule,
  type SandboxOverview,
} from '@/lib/developer-api';
import { PostmanDownloadPanel } from '@/components/developer/postman-download-panel';
import {
  DeveloperApiTestModal,
  type ApiTestModule,
} from '@/components/developer/developer-api-test-modal';
import { PageHeader } from '@/components/developer/developer-page-ui';

export default function ApiDocsPage() {
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [sandbox, setSandbox] = useState<SandboxOverview['sandbox'] | null>(null);
  const [selected, setSelected] = useState<ApiModule | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [testModule, setTestModule] = useState<ApiTestModule | null>(null);
  const [catalogMeta, setCatalogMeta] = useState<{ apiBaseUrl?: string; gatewayBaseUrl?: string }>({});

  const apiBase =
    sandbox?.apiBaseUrl ?? catalogMeta.apiBaseUrl ?? resolveDeveloperApiBase();
  const gatewayBase =
    sandbox?.gatewayBaseUrl ?? catalogMeta.gatewayBaseUrl ?? resolveDeveloperGatewayBase(apiBase);

  useEffect(() => {
    Promise.all([fetchApiCatalog(), fetchSandboxOverview().catch(() => null)]).then(([catalog, overview]) => {
      setModules(catalog.modules);
      setCatalogMeta({
        apiBaseUrl: catalog.apiBaseUrl,
        gatewayBaseUrl: catalog.gatewayBaseUrl,
      });
      if (overview) setSandbox(overview.sandbox);
      if (catalog.modules[0]) {
        setSelected(catalog.modules[0]);
        setSelectedEndpoint(catalog.modules[0].endpoints[0]?.id ?? null);
      }
    }).catch(() => {});
  }, []);

  const endpoint = selected?.endpoints.find((e) => e.id === selectedEndpoint);

  function copyCurl() {
    if (!endpoint || !selected) return;
    const curl = `curl -X ${endpoint.method} "${gatewayBase}/${selected.slug}${endpoint.path}" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "X-Developer-Environment: SANDBOX"`;
    void navigator.clipboard.writeText(curl);
  }

  async function downloadOpenApi() {
    if (!selected) return;
    const token = localStorage.getItem('developerAccessToken');
    const res = await fetch(`${apiBase}/developers/docs/openapi/${selected.slug}.json`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.slug}-openapi.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openModuleTestLab(mod: ApiModule) {
    const group = sandbox?.moduleGroups.find((g) => g.slug === mod.slug);
    const items =
      group && group.scenarios.length > 0
        ? group.scenarios.map((s) => ({
            id: s.id,
            label: s.label,
            description: s.description,
            method: s.method,
            path: s.path,
            moduleSlug: s.moduleSlug,
            permission: s.permission,
            authMode: s.authMode,
            query: s.query,
            body: s.body,
            hasPathParams: s.hasPathParams,
          }))
        : mod.endpoints.map((ep) => ({
            id: ep.id,
            label: ep.summary,
            description: ep.description,
            method: ep.method,
            path: ep.path,
            moduleSlug: mod.slug,
            permission: ep.permission,
            authMode: ep.authMode,
            hasPathParams: /\{[^}]+\}/.test(ep.path),
          }));

    setTestModule({
      slug: mod.slug,
      name: mod.name,
      description: mod.description,
      grantedPermissions:
        sandbox?.modules.find((m) => m.slug === mod.slug)?.grantedPermissions ??
        [...new Set(mod.endpoints.map((e) => e.permission))],
      upstreamBase: group?.upstreamBase,
      health: group?.health,
      items,
    });
  }

  return (
    <>
      <div className="mb-6 space-y-4">
        <PostmanDownloadPanel variant="hero" />
        <a
          href="/partner-guides/school-fees-payment-api-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-1 rounded-2xl border border-navy/10 bg-gradient-to-r from-slate-50 to-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-montserrat font-bold text-navy">School Fees Payment — Official API Guide</p>
              <p className="mt-0.5 text-sm text-muted">
                HTML documentation for banks: direct module APIs, request/response examples, Babyeyi BFF paths.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-navy">
            Open guide
          </span>
        </a>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-navy/10 bg-white p-4 lg:w-64">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Your API modules</p>
          <p className="mt-1 text-[10px] text-muted">
            {modules.length} module{modules.length !== 1 ? 's' : ''} · filtered by your permissions
          </p>
          <nav className="mt-3 space-y-1">
            {modules.map((m) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => {
                  setSelected(m);
                  setSelectedEndpoint(m.endpoints[0]?.id ?? null);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  selected?.slug === m.slug ? 'bg-navy text-primary' : 'text-navy/70 hover:bg-navy/5'
                }`}
              >
                {m.name}
                <span className="mt-0.5 block text-[10px] font-normal opacity-70">
                  {m.endpoints.length} endpoints
                </span>
              </button>
            ))}
          </nav>
          {modules.length === 0 && (
            <p className="mt-4 text-xs text-amber-700">No modules — ask Super Admin to grant permissions.</p>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <PageHeader
            title="API Documentation"
            description="Endpoints you are allowed to call — download Postman or open the test lab"
          />

          {selected && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openModuleTestLab(selected)}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary"
              >
                <Play className="h-4 w-4" />
                Open test lab — {selected.name}
              </button>
            </div>
          )}

          {selected && (
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-navy/10 bg-white p-3">
                <p className="sticky top-0 bg-white px-2 pb-2 text-xs font-semibold uppercase text-muted">
                  {selected.name}
                </p>
                {selected.endpoints.map((ep) => (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => setSelectedEndpoint(ep.id)}
                    className={`mt-1 block w-full rounded-lg px-2 py-2 text-left text-xs ${
                      selectedEndpoint === ep.id ? 'bg-primary/20 font-semibold' : 'hover:bg-navy/5'
                    }`}
                  >
                    <span
                      className={`mr-1 font-bold ${
                        ep.method === 'GET'
                          ? 'text-emerald-600'
                          : ep.method === 'POST'
                            ? 'text-blue-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {ep.method}
                    </span>
                    {ep.summary}
                    <span className="mt-0.5 block font-mono text-[9px] text-muted">{ep.permission}</span>
                  </button>
                ))}
              </div>

              {endpoint && (
                <div className="rounded-2xl border border-navy/10 bg-white p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-bold ${
                        endpoint.method === 'GET'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="text-sm text-navy">{endpoint.path}</code>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-navy">{endpoint.summary}</h2>
                  <p className="mt-2 text-sm text-muted">{endpoint.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs">
                    <p>
                      <span className="font-semibold text-muted">Permission:</span>{' '}
                      <code className="rounded bg-navy/5 px-1.5 py-0.5 text-navy">{endpoint.permission}</code>
                    </p>
                    <p>
                      <span className="font-semibold text-muted">Auth:</span>{' '}
                      {endpoint.authMode === 'none' ? 'Public' : 'Bearer (automatic via gateway)'}
                    </p>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-muted">
                    {gatewayBase}/{selected.slug}
                    {endpoint.path}
                  </p>

                  {endpoint.requestBody && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase text-muted">Request Body</p>
                      <pre className="mt-2 overflow-x-auto rounded-xl bg-navy p-4 text-xs text-primary">
                        {JSON.stringify(endpoint.requestBody, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openModuleTestLab(selected)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-primary"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Test in lab
                    </button>
                    <button
                      type="button"
                      onClick={copyCurl}
                      className="rounded-xl border border-navy/15 px-4 py-2 text-xs font-semibold text-navy"
                    >
                      Copy cURL
                    </button>
                    <button
                      type="button"
                      onClick={downloadOpenApi}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-4 py-2 text-xs font-semibold text-navy"
                    >
                      <Download className="h-3.5 w-3.5" />
                      OpenAPI JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {modules.length === 0 && (
            <p className="rounded-2xl border border-dashed p-8 text-center text-muted">
              No API documentation available for your permissions.
            </p>
          )}
        </div>
      </div>

      <DeveloperApiTestModal
        open={Boolean(testModule)}
        module={testModule}
        gatewayBase={gatewayBase}
        organizationId={sandbox?.organizationId}
        onClose={() => setTestModule(null)}
      />
    </>
  );
}

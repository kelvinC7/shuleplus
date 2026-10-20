import { useEffect, useMemo, useState } from 'react';
import {
  captureDeveloperTokenFromHash,
  getDeveloperToken,
  getDeveloperUser,
  iamApiRoot,
  redirectToDeveloperLogin,
  smApiRoot,
} from '@/services/developer-api';
import './developer-api-docs.css';

interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  permission: string;
  authMode: string;
  pathParams?: { name: string; type: string; required: boolean; description: string }[];
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: Record<string, unknown>;
  responseExample?: Record<string, unknown>;
}

interface ApiGroup {
  id: string;
  label: string;
  description?: string;
  endpoints: Endpoint[];
}

interface Overview {
  service: string;
  version: string;
  status: string;
  baseUrl: string;
  rateLimit: string;
  developer: { name: string; partner: string };
  quickStart: string[];
}

export default function DeveloperApiDocsPage() {
  const [ready, setReady] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('students');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [tryParams, setTryParams] = useState<Record<string, string>>({});
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [tryLoading, setTryLoading] = useState(false);

  useEffect(() => {
    captureDeveloperTokenFromHash();
    const token = getDeveloperToken();
    if (!token) {
      redirectToDeveloperLogin();
      return;
    }

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    const root = smApiRoot();

    Promise.all([
      fetch(`${root}/developer/api/overview`, { headers }),
      fetch(`${root}/developer/api/catalog`, { headers }),
    ])
      .then(async ([ovRes, catRes]) => {
        if (ovRes.status === 401) {
          redirectToDeveloperLogin();
          return;
        }
        if (ovRes.status === 403 || catRes.status === 403) {
          setForbidden(true);
          setReady(true);
          return;
        }
        const ovJson = await ovRes.json();
        const catJson = await catRes.json();
        setOverview(ovJson.data);
        const gs = (catJson.data?.groups ?? []) as ApiGroup[];
        setGroups(gs.filter((g) => g.endpoints?.length));
        if (gs[0]?.endpoints[0]) {
          setSelectedGroup(gs.find((g) => g.id === 'students')?.id ?? gs[0].id);
          setSelectedEndpoint(gs.find((g) => g.id === 'students')?.endpoints[0]?.id ?? gs[0].endpoints[0].id);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const currentGroup = groups.find((g) => g.id === selectedGroup);
  const endpoint = currentGroup?.endpoints.find((e) => e.id === selectedEndpoint);

  const navGroups = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      ...groups.map((g) => ({ id: g.id, label: g.label })),
    ],
    [groups]
  );

  async function sendTryRequest() {
    if (!endpoint) return;
    setTryLoading(true);
    setTryResult(null);
    const token = getDeveloperToken();
    try {
      const res = await fetch(`${smApiRoot()}/developer/api/try`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Developer-Environment': environment,
        },
        body: JSON.stringify({
          method: endpoint.method,
          path: endpoint.path.replace(/\{(\w+)\}/g, (_, k) => tryParams[k] ?? `{${k}}`),
          query: endpoint.queryParams?.reduce(
            (acc, q) => {
              if (tryParams[q.name]) acc[q.name] = tryParams[q.name];
              return acc;
            },
            {} as Record<string, string>
          ),
          environment,
        }),
      });
      const text = await res.text();
      setTryResult(text);
    } catch {
      setTryResult(JSON.stringify({ success: false, message: 'Request failed' }, null, 2));
    } finally {
      setTryLoading(false);
    }
  }

  function copyCurl() {
    if (!endpoint || !overview) return;
    const path = endpoint.path.replace(/\{(\w+)\}/g, (_, k) => tryParams[k] ?? `{${k}}`);
    const curl = `curl -X ${endpoint.method} "${overview.baseUrl}${path}" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json"`;
    void navigator.clipboard.writeText(curl);
  }

  async function downloadOpenApi() {
    const token = getDeveloperToken();
    const res = await fetch(`${smApiRoot()}/developer/api/openapi.json`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-management-openapi.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPostman() {
    const token = getDeveloperToken();
    const res = await fetch(`${smApiRoot()}/developer/api/postman.json`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json.data?.collection ?? json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-management.postman_collection.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) {
    return (
      <div className="devapi-loading">
        <div className="devapi-spinner" />
        <p>Verifying developer session…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="devapi-forbidden">
        <h1>403 — Access Denied</h1>
        <p>Your developer account does not have StudentManagement API assigned.</p>
        <p>Contact your SuperAdmin to enable Student Management permissions.</p>
        <a href={`${import.meta.env.VITE_IAM_URL ?? 'http://localhost:3000'}/developers`}>← Developer Portal</a>
      </div>
    );
  }

  const user = getDeveloperUser();

  return (
    <div className="devapi-root">
      <header className="devapi-header">
        <div className="devapi-header-inner">
          <div>
            <p className="devapi-eyebrow">ShulePlus · StudentManagement</p>
            <h1>StudentManagement API <span className="devapi-version">v1</span></h1>
            <p className="devapi-tagline">Manage students, parents, classes and enrollment securely through the ShulePlus API.</p>
          </div>
          <div className="devapi-header-actions">
            <select value={environment} onChange={(e) => setEnvironment(e.target.value as 'SANDBOX' | 'PRODUCTION')} className="devapi-select">
              <option value="SANDBOX">Sandbox</option>
              <option value="PRODUCTION">Production</option>
            </select>
            <button type="button" className="devapi-btn devapi-btn-primary" onClick={downloadPostman}>Download Postman</button>
            <button type="button" className="devapi-btn devapi-btn-outline" onClick={downloadOpenApi}>OpenAPI</button>
          </div>
        </div>
        {overview && (
          <div className="devapi-meta-grid">
            <div><span>Status</span><strong className="devapi-status">● Operational</strong></div>
            <div><span>Base URL</span><code>{overview.baseUrl}</code></div>
            <div><span>Auth</span><strong>OAuth 2.0 Bearer</strong></div>
            <div><span>Rate Limit</span><strong>{overview.rateLimit}</strong></div>
            <div><span>Developer</span><strong>{user?.firstName ?? overview.developer.name}</strong></div>
            <div><span>Partner</span><strong>{user?.partner?.name ?? overview.developer.partner}</strong></div>
          </div>
        )}
      </header>

      <div className="devapi-layout">
        <aside className="devapi-sidebar">
          <nav>
            {navGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`devapi-nav-item ${selectedGroup === g.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGroup(g.id);
                  if (g.id !== 'overview') {
                    const grp = groups.find((x) => x.id === g.id);
                    setSelectedEndpoint(grp?.endpoints[0]?.id ?? null);
                  }
                }}
              >
                {g.label}
              </button>
            ))}
          </nav>
          {selectedGroup !== 'overview' && currentGroup && (
            <div className="devapi-subnav">
              {currentGroup.endpoints.map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  className={`devapi-subnav-item ${selectedEndpoint === ep.id ? 'active' : ''}`}
                  onClick={() => setSelectedEndpoint(ep.id)}
                >
                  <span className={`devapi-method devapi-method-${ep.method.toLowerCase()}`}>{ep.method}</span>
                  {ep.summary}
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="devapi-main">
          {selectedGroup === 'overview' && overview && (
            <section className="devapi-panel">
              <h2>Quick Start</h2>
              <ol className="devapi-steps">
                {overview.quickStart.map((step, i) => (
                  <li key={step}><span>{i + 1}</span>{step}</li>
                ))}
              </ol>
              <h3>Authentication</h3>
              <p>Documentation uses your <strong>Developer Portal session</strong>. Actual API calls use <strong>OAuth 2.0 client credentials</strong> via the ShulePlus API Gateway.</p>
              <pre className="devapi-code">{`POST ${iamApiRoot()}/developers/oauth/token
{
  "grant_type": "client_credentials",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}`}</pre>
            </section>
          )}

          {endpoint && (
            <section className="devapi-panel">
              <div className="devapi-endpoint-header">
                <span className={`devapi-method devapi-method-${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
                <code>{endpoint.path}</code>
              </div>
              <h2>{endpoint.summary}</h2>
              <p className="devapi-desc">{endpoint.description}</p>

              <div className="devapi-scope">
                <span>🔐 Required Scope</span>
                <code>{endpoint.permission}</code>
              </div>

              <div className="devapi-scope">
                <span>Authentication</span>
                <strong>{endpoint.authMode === 'public' ? 'Public (no token)' : 'Bearer Access Token'}</strong>
              </div>

              {endpoint.pathParams?.map((p) => (
                <div key={p.name} className="devapi-param">
                  <label>{p.name} <em>(path, {p.required ? 'required' : 'optional'})</em></label>
                  <input
                    value={tryParams[p.name] ?? ''}
                    onChange={(e) => setTryParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.description}
                  />
                </div>
              ))}

              {endpoint.queryParams?.map((p) => (
                <div key={p.name} className="devapi-param">
                  <label>{p.name} <em>(query)</em></label>
                  <input
                    value={tryParams[p.name] ?? ''}
                    onChange={(e) => setTryParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.description}
                  />
                </div>
              ))}

              {endpoint.responseExample && (
                <>
                  <h3>Response Example</h3>
                  <pre className="devapi-code devapi-response">{JSON.stringify(endpoint.responseExample, null, 2)}</pre>
                </>
              )}

              <div className="devapi-actions">
                <button type="button" className="devapi-btn devapi-btn-primary" disabled={tryLoading} onClick={sendTryRequest}>
                  {tryLoading ? 'Sending…' : 'Try It'}
                </button>
                <button type="button" className="devapi-btn devapi-btn-outline" onClick={copyCurl}>Copy cURL</button>
              </div>

              {tryResult && (
                <pre className="devapi-code devapi-try-result">{tryResult}</pre>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FlaskConical,
  Play,
  Shield,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import {
  fetchSandboxOverview,
  requestProductionAccess,
  resolveDeveloperApiBase,
  resolveDeveloperGatewayBase,
  type SandboxOverview,
} from '@/lib/developer-api';
import { PostmanDownloadPanel } from '@/components/developer/postman-download-panel';
import {
  DeveloperApiTestModal,
  type ApiTestModule,
} from '@/components/developer/developer-api-test-modal';
import { PageHeader } from '@/components/developer/developer-page-ui';

const MODULE_ICONS: Record<string, string> = {
  'student-management': '🎓',
  'school-fees': '💳',
  'babyeyi-wizard': '📋',
  'webpage-babyeyi': '🌐',
  authentication: '🔐',
};

export default function SandboxPage() {
  const [overview, setOverview] = useState<SandboxOverview | null>(null);
  const [testModule, setTestModule] = useState<ApiTestModule | null>(null);
  const [showProdRequest, setShowProdRequest] = useState(false);
  const [justification, setJustification] = useState('');
  const [prodMsg, setProdMsg] = useState('');

  useEffect(() => {
    fetchSandboxOverview().then(setOverview).catch(() => {});
  }, []);

  async function submitProductionRequest() {
    setProdMsg('');
    try {
      await requestProductionAccess({
        requestedModules: overview?.sandbox.modules.map((m) => m.slug) ?? [],
        businessJustification: justification,
      });
      setProdMsg('Production access request submitted. Super Admin will review it.');
      setShowProdRequest(false);
      fetchSandboxOverview().then(setOverview);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setProdMsg(msg ?? 'Request failed');
    }
  }

  function openModuleLab(group: SandboxOverview['sandbox']['moduleGroups'][0]) {
    setTestModule({
      slug: group.slug,
      name: group.name,
      description: group.description,
      grantedPermissions: group.grantedPermissions,
      upstreamBase: group.upstreamBase,
      health: group.health,
      items: group.scenarios.map((s) => ({
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
      })),
    });
  }

  const sandbox = overview?.sandbox;
  const production = overview?.production;
  const apiBase = sandbox?.apiBaseUrl ?? resolveDeveloperApiBase();
  const gatewayBase = sandbox?.gatewayBaseUrl ?? resolveDeveloperGatewayBase(apiBase);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sandbox"
        description="Download Postman, then test live APIs against your linked sandbox school — only modules you have permission for"
      />

      <PostmanDownloadPanel variant="hero" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-emerald-900">Live test school</span>
          </div>
          <p className="mt-2 text-sm text-emerald-900">
            All API calls use <strong>{sandbox?.schoolLabel ?? sandbox?.organization?.name ?? 'your linked school'}</strong>
            {sandbox?.organization?.organizationCode ? (
              <>
                {' '}
                (<code className="text-xs">{sandbox.organization.organizationCode}</code>)
              </>
            ) : null}{' '}
            — same database as Organization Admin & Student Management.
          </p>
          {sandbox?.organizationId && (
            <dl className="mt-3 grid gap-2 text-xs text-emerald-900 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-emerald-800">Organization ID</dt>
                <dd className="mt-0.5 font-mono break-all">{sandbox.organizationId}</dd>
              </div>
              <div>
                <dt className="font-semibold text-emerald-800">Sample student</dt>
                <dd className="mt-0.5 font-mono">{sandbox.sampleStudentCode ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-emerald-800">Gateway base</dt>
                <dd className="mt-0.5 font-mono break-all">
                  {gatewayBase}/{'{module}'}/{'{path}'}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-navy">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-semibold">Your permissions</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {sandbox?.grantedPermissions?.length ?? 0} scopes enabled across{' '}
            {sandbox?.modules?.length ?? 0} API modules
          </p>
          {sandbox?.grantedPermissions && sandbox.grantedPermissions.length > 0 ? (
            <div className="mt-3 max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {sandbox.grantedPermissions.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-navy/5 px-2 py-0.5 font-mono text-[9px] font-semibold text-navy"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-amber-700">
              No permissions yet. Ask Super Admin to edit your developer access.
            </p>
          )}
        </div>
      </div>

      {sandbox?.applications && sandbox.applications.length > 0 && (
        <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-navy" />
              <div>
                <p className="text-sm font-semibold text-navy">OAuth credentials (Postman)</p>
                <p className="text-xs text-muted">
                  client_id:{' '}
                  <code className="text-navy">{sandbox.applications[0]?.clientId}</code>
                </p>
              </div>
            </div>
            <Link
              href="/developers/applications"
              className="text-xs font-semibold text-navy underline"
            >
              Manage apps →
            </Link>
          </div>
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-montserrat text-lg font-bold text-navy">API modules you can test</h2>
            <p className="mt-1 text-sm text-muted">
              Click a module to open the full-screen test lab — run scenarios with live data
            </p>
          </div>
          <Link
            href="/developers/docs"
            className="text-xs font-semibold text-navy underline"
          >
            View all endpoints in Documentation →
          </Link>
        </div>

        {sandbox?.moduleGroups && sandbox.moduleGroups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sandbox.moduleGroups.map((group) => (
              <button
                key={group.slug}
                type="button"
                onClick={() => openModuleLab(group)}
                className="group flex flex-col rounded-2xl border border-navy/10 bg-white p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl">{MODULE_ICONS[group.slug] ?? '📦'}</span>
                  <div className="flex flex-col items-end gap-1">
                    {group.health && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          group.health.ok
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {group.health.ok ? '● Online' : '● Offline'}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-navy" />
                  </div>
                </div>
                <h3 className="mt-3 font-semibold text-navy">{group.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{group.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {group.grantedPermissions.slice(0, 4).map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-800"
                    >
                      {p}
                    </span>
                  ))}
                  {group.grantedPermissions.length > 4 && (
                    <span className="text-[9px] text-muted">
                      +{group.grantedPermissions.length - 4} more
                    </span>
                  )}
                </div>
                {!group.health?.ok && (
                  <p className="mt-2 text-[10px] font-medium text-red-600">
                    Backend not running — start server to test
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3 text-xs">
                  <span className="text-muted">{group.scenarios.length} test scenarios</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-navy group-hover:text-primary">
                    <Play className="h-3 w-3" />
                    Open test lab
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-navy/20 p-10 text-center">
            <p className="font-semibold text-navy">No API modules assigned</p>
            <p className="mt-2 text-sm text-muted">
              Super Admin must grant permissions under Developer Access → Edit.
            </p>
          </div>
        )}
      </section>

      <details className="rounded-2xl border border-amber-200 bg-amber-50/80">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-amber-900">
          Request production access
        </summary>
        <div className="border-t border-amber-200/60 px-5 pb-5 pt-3">
          <p className="text-sm text-amber-800">
            Status: <strong>{production?.accessStatus ?? 'NONE'}</strong>
          </p>
          {production?.accessStatus === 'APPROVED' ? (
            <p className="mt-2 text-sm text-emerald-700">Production access approved</p>
          ) : production?.accessStatus === 'PENDING' ? (
            <p className="mt-2 text-sm text-amber-700">Pending Super Admin review</p>
          ) : (
            <>
              {!showProdRequest ? (
                <button
                  type="button"
                  onClick={() => setShowProdRequest(true)}
                  className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary"
                >
                  Request production access
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Describe your integration…"
                    rows={3}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={submitProductionRequest}
                      className="rounded-xl bg-navy px-4 py-2 text-sm text-primary"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProdRequest(false)}
                      className="rounded-xl border px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {prodMsg && <p className="mt-3 text-sm text-navy">{prodMsg}</p>}
        </div>
      </details>

      <DeveloperApiTestModal
        open={Boolean(testModule)}
        module={testModule}
        gatewayBase={gatewayBase}
        organizationId={sandbox?.organizationId}
        onClose={() => setTestModule(null)}
      />
    </div>
  );
}

'use client';

import { FlaskConical, Rocket, Code2, Shield, Eye, CheckCheck, X } from 'lucide-react';
import type { CreateDeveloperAccessInput, DeveloperAdminRow, DeveloperPartner } from '@/lib/developer-api';

export type PermissionDef = {
  key: string;
  label: string;
  endpoints?: { method: string; path: string; summary: string }[];
};

const ACCESS_TYPES = [
  { value: 'DEVELOPER', label: 'Developer', desc: 'Full API integration access', icon: Code2 },
  { value: 'TECHNICAL_ADMIN', label: 'Technical Admin', desc: 'Manage apps, credentials & webhooks', icon: Shield },
  { value: 'API_VIEWER', label: 'API Viewer', desc: 'Read-only documentation access', icon: Eye },
] as const;

export interface CreateAccessFormState {
  partnerId: string;
  firstName: string;
  lastName: string;
  email: string;
  accessType: CreateDeveloperAccessInput['accessType'];
  sandbox: boolean;
  production: boolean;
  allowedModules: Record<string, Record<string, boolean>>;
}

interface Props {
  open: boolean;
  loading: boolean;
  partners: DeveloperPartner[];
  permissionConfig: Record<string, { label: string; permissions: PermissionDef[] }>;
  form: CreateAccessFormState;
  error?: string;
  /** When set, modal edits permissions for an existing developer instead of creating one. */
  editingDeveloper?: DeveloperAdminRow | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (patch: Partial<CreateAccessFormState>) => void;
  onToggleModule: (moduleKey: string, enabled: boolean) => void;
  onTogglePermission: (moduleKey: string, permKey: string) => void;
  onSelectAllModuleScopes: (moduleKey: string) => void;
  onDeselectAllModuleScopes: (moduleKey: string) => void;
  onSelectAllModules: () => void;
  onDeselectAllModules: () => void;
}

export function CreateDeveloperAccessModal({
  open,
  loading,
  partners,
  permissionConfig,
  form,
  error,
  editingDeveloper,
  onClose,
  onSubmit,
  onChange,
  onToggleModule,
  onTogglePermission,
  onSelectAllModuleScopes,
  onDeselectAllModuleScopes,
  onSelectAllModules,
  onDeselectAllModules,
}: Props) {
  if (!open) return null;

  const isEdit = Boolean(editingDeveloper);
  const enabledModuleCount = Object.keys(form.allowedModules).length;
  const partnerName =
    editingDeveloper?.partner.name ??
    partners.find((p) => p.id === form.partnerId)?.name ??
    '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="my-6 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-2xl"
      >
        <div className="border-b border-navy/8 bg-gradient-to-br from-navy to-[#1a2a6c] px-6 py-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {isEdit ? 'Access Control' : 'Secure Provisioning'}
          </p>
          <h2 className="mt-1 font-montserrat text-xl font-bold">
            {isEdit ? 'Edit Developer Permissions' : 'Create Developer Access'}
          </h2>
          <p className="mt-1 text-sm text-white/75">
            {isEdit
              ? `Add or remove API modules and scopes for ${partnerName}`
              : 'Activation link + MFA — no permanent password stored'}
          </p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
              {isEdit ? 'Developer & Organization' : 'Partner & Identity'}
            </h3>
            <div className="mt-3 space-y-3">
              {isEdit && editingDeveloper ? (
                <div className="rounded-xl border border-navy/10 bg-[#f8fafc] p-4">
                  <p className="text-sm font-semibold text-navy">
                    {editingDeveloper.firstName} {editingDeveloper.lastName}
                  </p>
                  <p className="text-xs text-muted">{editingDeveloper.email}</p>
                  <p className="mt-2 text-xs">
                    <span className="font-semibold text-navy/70">Organization: </span>
                    {editingDeveloper.partner.name}
                  </p>
                  <p className="text-xs">
                    <span className="font-semibold text-navy/70">Status: </span>
                    {editingDeveloper.status.replace('_', ' ')}
                  </p>
                </div>
              ) : (
                <>
              <div>
                <label className="text-xs font-semibold text-navy/70">Partner Organization</label>
                <select
                  value={form.partnerId}
                  onChange={(e) => onChange({ partnerId: e.target.value })}
                  required
                  className="mt-1 w-full rounded-xl border border-navy/10 bg-[#f8fafc] px-4 py-2.5 text-sm outline-none focus:border-primary/40"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {(() => {
                  const p = partners.find((x) => x.id === form.partnerId);
                  if (!p?.sandboxOrganization?.id) {
                    return (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No sandbox school linked — use <strong>Link school</strong> on the partner card first.
                      </p>
                    );
                  }
                  return (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Sandbox school</p>
                      <p className="text-xs font-semibold text-emerald-900">{p.sandboxOrganization.name}</p>
                      <p className="mt-1 break-all font-mono text-[10px] text-emerald-800">{p.sandboxOrganization.id}</p>
                    </div>
                  );
                })()}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-navy/70">First Name</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => onChange({ firstName: e.target.value })}
                    placeholder="John"
                    required
                    className="mt-1 w-full rounded-xl border border-navy/10 bg-[#f8fafc] px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy/70">Last Name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => onChange({ lastName: e.target.value })}
                    placeholder="Doe"
                    required
                    className="mt-1 w-full rounded-xl border border-navy/10 bg-[#f8fafc] px-4 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-navy/70">Work Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  placeholder="john@partner.com"
                  required
                  className="mt-1 w-full rounded-xl border border-navy/10 bg-[#f8fafc] px-4 py-2.5 text-sm"
                />
              </div>
                </>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Access Type</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {ACCESS_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onChange({ accessType: t.value })}
                  className={`rounded-2xl border p-3 text-left transition ${
                    form.accessType === t.value
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-navy/10 hover:border-navy/20'
                  }`}
                >
                  <Icon className="mb-1.5 h-4 w-4 text-navy/70" strokeWidth={2} />
                  <p className="text-sm font-semibold text-navy">{t.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{t.desc}</p>
                </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Environments</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${form.sandbox ? 'bg-sky-100 text-sky-800' : 'bg-navy/5 text-muted'}`}>
                <input type="checkbox" className="sr-only" checked={form.sandbox} onChange={(e) => onChange({ sandbox: e.target.checked })} />
                <FlaskConical className="h-4 w-4" strokeWidth={2} />
                Sandbox
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${form.production ? 'bg-red-100 text-red-800' : 'bg-navy/5 text-muted'}`}>
                <input type="checkbox" className="sr-only" checked={form.production} onChange={(e) => onChange({ production: e.target.checked })} />
                <Rocket className="h-4 w-4" strokeWidth={2} />
                Production
              </label>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">API Modules & Scopes</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                  {enabledModuleCount} module{enabledModuleCount !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={onSelectAllModules}
                  className="inline-flex items-center gap-1 rounded-lg border border-navy/10 px-2 py-1 text-[10px] font-semibold text-navy hover:bg-navy/5"
                >
                  <CheckCheck className="h-3 w-3" />
                  Select all
                </button>
                <button
                  type="button"
                  onClick={onDeselectAllModules}
                  className="inline-flex items-center gap-1 rounded-lg border border-navy/10 px-2 py-1 text-[10px] font-semibold text-muted hover:bg-navy/5"
                >
                  <X className="h-3 w-3" />
                  Deselect all
                </button>
              </div>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-navy/10 p-2">
              {Object.entries(permissionConfig).map(([modKey, mod]) => {
                const enabled = Boolean(form.allowedModules[modKey]);
                const permCount = enabled ? Object.values(form.allowedModules[modKey] ?? {}).filter(Boolean).length : 0;
                const totalPerms = mod.permissions.length;
                return (
                  <div key={modKey} className={`rounded-xl border p-3 transition ${enabled ? 'border-primary/30 bg-primary/5' : 'border-transparent bg-navy/[0.02]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex flex-1 cursor-pointer items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-navy">{mod.label}</p>
                          {enabled && (
                            <p className="text-[10px] text-muted">
                              {permCount}/{totalPerms} scopes · {mod.permissions.reduce((n, p) => n + (p.endpoints?.length ?? 0), 0)} API methods
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => onToggleModule(modKey, e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-primary"
                        />
                      </label>
                    </div>
                    {enabled && (
                      <>
                        <div className="mt-2 flex gap-2 border-t border-navy/8 pt-2">
                          <button
                            type="button"
                            onClick={() => onSelectAllModuleScopes(modKey)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-navy hover:underline"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Select all scopes
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeselectAllModuleScopes(modKey)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted hover:underline"
                          >
                            <X className="h-3 w-3" />
                            Deselect all
                          </button>
                        </div>
                        <div className="mt-2 space-y-2">
                          {mod.permissions.map((p) => (
                            <div key={p.key} className="rounded-lg bg-white/60 px-2 py-2">
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(form.allowedModules[modKey]?.[p.key])}
                                  onChange={() => onTogglePermission(modKey, p.key)}
                                  className="mt-0.5 rounded accent-navy"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-navy/90">{p.label}</span>
                                    <code className="text-[9px] text-muted">{p.key}</code>
                                  </div>
                                  {p.endpoints && p.endpoints.length > 0 && (
                                    <ul className="mt-1 space-y-0.5">
                                      {p.endpoints.map((ep) => (
                                        <li key={`${ep.method}-${ep.path}`} className="font-mono text-[9px] text-muted">
                                          <span className={`mr-1 font-bold ${
                                            ep.method === 'GET' ? 'text-emerald-600' :
                                            ep.method === 'POST' ? 'text-blue-600' :
                                            ep.method === 'DELETE' ? 'text-red-600' :
                                            'text-amber-600'
                                          }`}>{ep.method}</span>
                                          {ep.path}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="border-t border-navy/8 bg-[#f8fafc] px-6 py-4">
          {error && (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-navy/15 py-3 text-sm font-semibold text-navy">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-navy py-3 text-sm font-semibold text-primary disabled:opacity-60">
            {loading ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save Permissions' : 'Create Secure Access'}
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}

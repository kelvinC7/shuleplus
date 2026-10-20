'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import {
  LICENSE_TYPES,
  MODULE_CATEGORIES,
  moduleDisplayName,
  moduleDisplayShortName,
  type ModuleCatalogItem,
  type ModuleCatalogStats,
} from '@/lib/modules';
import { useToast } from '@/shared/notifications';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-montserrat text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}

type ModuleFormState = {
  name: string;
  shortName: string;
  slug: string;
  category: string;
  version: string;
  description: string;
  color: string;
  frontendUrl: string;
  backendUrl: string;
  healthCheckUrl: string;
  licenseType: string;
  isPremium: boolean;
  isCore: boolean;
  isEnabled: boolean;
  maintenanceMode: boolean;
  dependencyIds: string[];
};

const EMPTY_FORM: ModuleFormState = {
  name: '',
  shortName: '',
  slug: '',
  category: 'Education',
  version: '1.0.0',
  description: '',
  color: '#FCB038',
  frontendUrl: '',
  backendUrl: '',
  healthCheckUrl: '',
  licenseType: 'Standard',
  isPremium: false,
  isCore: false,
  isEnabled: true,
  maintenanceMode: false,
  dependencyIds: [],
};

function moduleToForm(m: ModuleCatalogItem): ModuleFormState {
  return {
    name: m.name,
    shortName: m.shortName ?? '',
    slug: m.slug,
    category: m.category ?? 'Education',
    version: m.version,
    description: m.description ?? '',
    color: m.color ?? '#FCB038',
    frontendUrl: m.frontendUrl ?? '',
    backendUrl: m.backendUrl ?? '',
    healthCheckUrl: m.healthCheckUrl ?? '',
    licenseType: m.licenseType ?? 'Standard',
    isPremium: m.isPremium,
    isCore: m.isCore,
    isEnabled: m.isEnabled,
    maintenanceMode: m.maintenanceMode,
    dependencyIds: m.dependencies.map((d) => d.id),
  };
}

interface ModuleCatalogViewProps {
  apiPrefix: '/root-admin' | '/super-admin';
  backHref: string;
}

export function ModuleCatalogView({ apiPrefix, backHref }: ModuleCatalogViewProps) {
  const [stats, setStats] = useState<ModuleCatalogStats | null>(null);
  const [modules, setModules] = useState<ModuleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModuleCatalogItem | null>(null);
  const [form, setForm] = useState<ModuleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function load() {
    setLoading(true);
    Promise.all([api.get(`${apiPrefix}/module-catalog/stats`), api.get(`${apiPrefix}/module-catalog`)])
      .then(([statsRes, listRes]) => {
        setStats(statsRes.data.data);
        setModules(listRes.data.data);
      })
      .catch(() => {
        toast.error('Failed to load module catalog. Sign in again or refresh.', 'Load failed');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [apiPrefix]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (m.category ?? '').toLowerCase().includes(q)
    );
  }, [modules, search]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModal('create');
  }

  function openEdit(m: ModuleCatalogItem) {
    setForm(moduleToForm(m));
    setEditingId(m.id);
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
  }

  async function saveModule() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        dependencyIds: form.dependencyIds,
      };
      if (modal === 'create') {
        await api.post(`${apiPrefix}/module-catalog`, payload);
        toast.success(`${form.name} added to the catalog.`, 'Module created');
      } else if (editingId) {
        await api.patch(`${apiPrefix}/module-catalog/${editingId}`, payload);
        toast.success(`${form.name} updated.`, 'Module updated');
      }
      closeModal();
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to save module.',
        'Save failed'
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`${apiPrefix}/module-catalog/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} removed from the catalog.`, 'Module deleted');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to delete module.',
        'Delete failed'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackButton href={backHref} />
          <h1 className="font-montserrat text-2xl font-bold text-navy">Module Catalog</h1>
          <p className="mt-1 text-sm text-muted">Create, edit, and remove platform modules.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-primary-hover"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add module
        </button>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total" value={stats.totalModules} />
          <StatCard label="Active" value={stats.activeModules} />
          <StatCard label="Premium" value={stats.premiumModules} />
          <StatCard label="Core" value={stats.coreModules} />
          <StatCard label="Disabled" value={stats.disabledModules} />
          <StatCard label="Orgs using" value={stats.organizationsUsingModules} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-navy/[0.06] bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules…"
            className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pl-9 pr-4 text-sm text-navy outline-none focus:border-primary focus:bg-white"
          />
        </div>
        <span className="text-sm text-muted">{filtered.length} shown</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-navy/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-navy">No modules found</p>
            <p className="mt-1 text-sm text-muted">Add HR, Payroll, Teacher Portal, or other modules manually.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Version</th>
                  <th className="px-4 py-3.5">Orgs</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((m) => (
                  <tr key={m.id} className="transition hover:bg-primary/[0.03]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-navy"
                          style={{ backgroundColor: `${m.color ?? '#FCB038'}28` }}
                        >
                          {moduleDisplayShortName(m).slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-navy">{moduleDisplayName(m)}</p>
                          <p className="text-xs text-muted">{m.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted">{m.category ?? '—'}</td>
                    <td className="px-4 py-4 text-muted">{m.version}</td>
                    <td className="px-4 py-4 font-medium text-navy">{m.organizationCount}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            m.isEnabled ? 'bg-amber-100 text-amber-800' : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {m.isEnabled ? 'Active' : 'Disabled'}
                        </span>
                        {m.isCore && (
                          <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy">
                            Core
                          </span>
                        )}
                        {m.maintenanceMode && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            Maintenance
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-navy transition hover:bg-navy/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={m.isCore}
                          onClick={() => setDeleteTarget(m)}
                          title={m.isCore ? 'Core modules cannot be deleted' : 'Delete module'}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {apiPrefix === '/super-admin' && (
        <p className="text-sm text-muted">
          Assign modules to organizations via{' '}
          <Link href="/super-admin/module-assignment" className="font-semibold text-primary hover:underline">
            Module Assignment
          </Link>
          .
        </p>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl">
            <div className="border-b border-border bg-gradient-to-r from-navy to-navy-light px-6 py-5 text-white">
              <h2 className="font-montserrat text-xl font-bold">
                {modal === 'create' ? 'Add module' : 'Edit module'}
              </h2>
              <p className="mt-1 text-sm text-white/70">Configure URLs, category, and dependencies.</p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[
                  ['name', 'Module name *'],
                  ['shortName', 'Short name'],
                  ['slug', 'Slug (edit: read-only in API)'],
                  ['version', 'Version'],
                  ['description', 'Description'],
                  ['color', 'Brand color'],
                  ['frontendUrl', 'Frontend URL'],
                  ['backendUrl', 'Backend URL'],
                  ['healthCheckUrl', 'Health check path'],
                ].map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase text-muted">{label}</span>
                    <input
                      value={form[key as keyof ModuleFormState] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      disabled={modal === 'edit' && key === 'slug'}
                      className="input w-full disabled:bg-slate-50 disabled:text-muted"
                    />
                  </label>
                ))}
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted">Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="input w-full"
                  >
                    {MODULE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted">License</span>
                  <select
                    value={form.licenseType}
                    onChange={(e) => setForm((f) => ({ ...f, licenseType: e.target.value }))}
                    className="input w-full"
                  >
                    {LICENSE_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted">Dependencies</span>
                  <select
                    multiple
                    value={form.dependencyIds}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dependencyIds: [...e.target.selectedOptions].map((o) => o.value),
                      }))
                    }
                    className="input min-h-[88px] w-full"
                  >
                    {modules
                      .filter((m) => m.id !== editingId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-4 pt-1">
                  {[
                    ['isEnabled', 'Enabled'],
                    ['isPremium', 'Premium'],
                    ['isCore', 'Core module'],
                    ['maintenanceMode', 'Maintenance mode'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-navy">
                      <input
                        type="checkbox"
                        checked={form[key as keyof ModuleFormState] as boolean}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="rounded border-border"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !form.name.trim()}
                  onClick={saveModule}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
                >
                  {saving ? 'Saving…' : modal === 'create' ? 'Create module' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <h2 className="font-montserrat text-lg font-bold text-navy">Delete module?</h2>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-navy">{deleteTarget.name}</strong> ({deleteTarget.slug}) will be removed from
              the catalog. Organization assignments for this module will also be removed.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmDelete}
                className="rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Deleting…' : 'Delete module'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

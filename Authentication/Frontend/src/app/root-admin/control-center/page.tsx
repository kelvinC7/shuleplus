'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { useToast } from '@/shared/notifications';

interface Organization {
  id: string;
  name: string;
  status: string;
  type: string;
  _count: { users: number };
}

interface PlatformModule {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
}

interface EmergencyControls {
  maintenanceMode: boolean;
  loginsDisabled: boolean;
  registrationsDisabled: boolean;
  forceLogoutAll: boolean;
  edgeMaintenanceMode?: boolean;
  edgeMaintenanceApplied?: boolean;
  edgeMaintenanceMessage?: string;
}

export default function ControlCenterPage() {
  const toast = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [controls, setControls] = useState<EmergencyControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/root-admin/organizations'),
      api.get('/root-admin/modules'),
      api.get('/root-admin/emergency-controls'),
    ])
      .then(([orgs, mods, emerg]) => {
        setOrganizations(orgs.data.data.slice(0, 3));
        setModules(mods.data.data.slice(0, 2));
        setControls(emerg.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateControl(key: keyof EmergencyControls, value: boolean) {
    setMessage('');
    try {
      const { data } = await api.patch('/root-admin/emergency-controls', { [key]: value });
      setControls(data.data);
      if (key === 'edgeMaintenanceMode') {
        if (data.data.edgeMaintenanceApplied === false) {
          toast.error(
            data.data.edgeMaintenanceMessage ?? 'Could not update nginx maintenance on this server.',
            'Edge maintenance'
          );
        } else {
          toast.success(
            value
              ? 'shuleplus.rw is now showing the maintenance page for all visitors.'
              : 'Site is live again — nginx serving the platform normally.',
            value ? 'Maintenance ON' : 'Maintenance OFF'
          );
        }
      } else {
        setMessage('Emergency controls updated');
      }
    } catch {
      setMessage('Failed to update controls');
      toast.error('Failed to update controls', 'Error');
    }
  }

  async function updateOrgStatus(id: string, status: string) {
    await api.patch(`/root-admin/organizations/${id}`, { status });
    const { data } = await api.get('/root-admin/organizations');
    setOrganizations(data.data.slice(0, 3));
  }

  async function toggleModule(id: string, isEnabled: boolean) {
    await api.patch(`/root-admin/modules/${id}`, { isEnabled });
    const { data } = await api.get('/root-admin/modules');
    setModules(data.data.slice(0, 2));
  }

  if (loading) {
    return <p className="text-center text-muted">Loading control center...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackButton href="/root-admin" />
        <h1 className="font-montserrat text-2xl font-bold text-navy">System Control Center</h1>
        <p className="text-sm text-muted">ROOT_ADMIN emergency & platform controls</p>
      </div>

      {message && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {message}
        </div>
      )}

      {/* Edge / Nginx maintenance */}
      <section className="rounded-2xl border border-amber-500/30 bg-white/90 p-6 shadow-sm">
        <h2 className="font-poppins-semibold text-navy mb-2">Site Maintenance (nginx)</h2>
        <p className="text-xs text-muted mb-4">
          Takes <strong>shuleplus.rw</strong>, <strong>app.shuleplus.rw</strong>, and all module subdomains
          offline at the nginx edge — visitors see a maintenance page instead of the live platform.
          Root Admin can still reach the server directly. Run{' '}
          <code className="rounded bg-slate-100 px-1">patch-nginx-maintenance.sh</code> once on the server
          before first use.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <input
            type="checkbox"
            checked={controls?.edgeMaintenanceMode ?? false}
            onChange={(e) => updateControl('edgeMaintenanceMode', e.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          <div>
            <span className="text-sm font-poppins-medium text-navy">
              {controls?.edgeMaintenanceMode ? 'Site is DOWN (maintenance page)' : 'Site is LIVE'}
            </span>
            <p className="text-xs text-muted mt-0.5">
              Toggle to stop or restore public access to shuleplus.rw
            </p>
          </div>
        </label>
        {controls?.edgeMaintenanceApplied === false && controls?.edgeMaintenanceMessage ? (
          <p className="mt-3 text-xs text-danger">{controls.edgeMaintenanceMessage}</p>
        ) : null}
      </section>

      {/* Organization Status */}
      <section className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm">
        <h2 className="font-poppins-semibold text-navy mb-4">Organization Status</h2>
        {organizations.length === 0 ? (
          <p className="text-sm text-muted">No organizations yet. Create schools from Organizations module.</p>
        ) : (
          organizations.map((org) => (
            <div key={org.id} className="mb-4 rounded-xl border border-border p-4 last:mb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-poppins-semibold text-navy">{org.name}</p>
                  <p className="text-xs text-muted">
                    Status:{' '}
                    <span className={org.status === 'ACTIVE' ? 'text-success' : 'text-danger'}>
                      {org.status === 'ACTIVE' ? '🟢 Active' : `🔴 ${org.status}`}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['DISABLED', 'SUSPENDED', 'ARCHIVED', 'ACTIVE'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateOrgStatus(org.id, s)}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-poppins-medium hover:bg-background"
                    >
                      {s === 'ACTIVE' ? 'Enable' : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Module Control */}
      <section className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm">
        <h2 className="font-poppins-semibold text-navy mb-4">Module Control</h2>
        {modules.map((mod) => (
          <div key={mod.id} className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-4 last:mb-0">
            <div>
              <p className="font-poppins-semibold text-navy">{mod.name}</p>
              <p className="text-xs text-muted">
                Status:{' '}
                <span className={mod.isEnabled ? 'text-success' : 'text-danger'}>
                  {mod.isEnabled ? '🟢 Enabled' : '🔴 Disabled'}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleModule(mod.id, !mod.isEnabled)}
              className="rounded-lg bg-navy px-4 py-2 text-xs font-poppins-semibold text-primary"
            >
              {mod.isEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </section>

      {/* Emergency Controls */}
      <section className="rounded-2xl border border-danger/20 bg-white/90 p-6 shadow-sm">
        <h2 className="font-poppins-semibold text-danger mb-4">Application Emergency Controls</h2>
        <p className="text-xs text-muted mb-4">
          App-level flags — block logins and API access while nginx may still serve pages. Platform admins
          can still sign in when Maintenance Mode is on.
        </p>
        <div className="space-y-3">
          {(
            [
              ['maintenanceMode', 'Maintenance Mode (block non-admin logins)'],
              ['loginsDisabled', 'Disable All Logins'],
              ['registrationsDisabled', 'Disable New Registrations'],
              ['forceLogoutAll', 'Force Logout All Users'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 hover:bg-background"
            >
              <input
                type="checkbox"
                checked={controls?.[key] ?? false}
                onChange={(e) => updateControl(key, e.target.checked)}
                className="h-4 w-4 accent-danger"
              />
              <span className="text-sm font-poppins-medium text-navy">{label}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

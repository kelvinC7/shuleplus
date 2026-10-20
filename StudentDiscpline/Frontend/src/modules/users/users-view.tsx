'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { iamApi } from '@/services/iam-api';
import { useAuth } from '@/contexts/auth-context';
import { ExportDropdown } from '@/components/export-dropdown';

export interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  roles: string[];
  modules: string[];
  createdAt: string;
}

export interface LicensedModule {
  slug: string;
  name: string;
  shortName: string | null;
}

const MODULE_SLUG = 'sample-module';

export function UsersView() {
  const { user } = useAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [modules, setModules] = useState<LicensedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    assignSampleModule: true,
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, modulesRes] = await Promise.all([
        iamApi.get('/iam/org/users'),
        iamApi.get('/iam/org/modules'),
      ]);
      setUsers(usersRes.data.data);
      setModules(modulesRes.data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load users';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');
    setTempPassword(null);

    const moduleSlugs = form.assignSampleModule ? [MODULE_SLUG] : [];

    try {
      const { data } = await iamApi.post('/iam/org/users', {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        moduleSlugs,
        requirePasswordChange: true,
      });

      setSuccess(`User ${data.data.email} created successfully.`);
      if (data.data.tempPassword) {
        setTempPassword(data.data.tempPassword);
      }
      setForm({ email: '', firstName: '', lastName: '', phone: '', assignSampleModule: true });
      await reload();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create user';
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleModule(user: OrgUser, checked: boolean) {
    if (user.roles.includes('organization_admin')) return;

    const next = checked
      ? [...new Set([...user.modules, MODULE_SLUG])]
      : user.modules.filter((m) => m !== MODULE_SLUG);

    setError('');
    try {
      await iamApi.put(`/iam/org/users/${user.id}/modules`, { moduleSlugs: next });
      await reload();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update module access';
      setError(message);
    }
  }

  const sampleModuleLicensed = modules.some((m) => m.slug === MODULE_SLUG);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Users & Module Access</h1>
        <p className="mt-1 text-sm text-muted">
          Add organization users and assign them to modules your organization already has licensed
          (including Inventory MIS).
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>
      )}
      {tempPassword && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-navy">
          <p className="font-semibold">Temporary password (share securely with the user):</p>
          <p className="mt-1 font-mono">{tempPassword}</p>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-navy">Add user</h2>
        {!sampleModuleLicensed && (
          <p className="mt-2 text-sm text-danger">
            Inventory MIS is not licensed for this organization. Assign it from the platform admin
            first.
          </p>
        )}
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">First name</span>
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Last name</span>
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">Phone (optional)</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.assignSampleModule}
              disabled={!sampleModuleLicensed}
              onChange={(e) => setForm((f) => ({ ...f, assignSampleModule: e.target.checked }))}
            />
            Assign Inventory MIS access on create
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating || !sampleModuleLicensed}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">Organization users</h2>
          <ExportDropdown
            title="Users Report"
            columns={[
              { header: "Name", accessor: "name" },
              { header: "Email", accessor: "email" },
              { header: "Role", accessor: "role" },
              { header: "Status", accessor: "status" },
            ]}
            data={users.map((u) => ({
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
              role: u.roles.includes("organization_admin") ? "Organization Admin" : "Member",
              status: u.status,
            }))}
            userName={user?.email}
          />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No users yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead> 
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 font-medium">Inventory MIS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isAdmin = user.roles.includes('organization_admin');
                  const hasAccess = user.modules.includes(MODULE_SLUG);
                  return (
                    <tr key={user.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="py-3 pr-4">{user.email}</td>
                      <td className="py-3 pr-4">
                        {isAdmin ? 'Organization Admin' : 'Member'}
                      </td>
                      <td className="py-3">
                        {isAdmin ? (
                          <span className="text-xs text-muted">All licensed modules</span>
                        ) : (
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hasAccess}
                              disabled={!sampleModuleLicensed}
                              onChange={(e) => toggleModule(user, e.target.checked)}
                            />
                            {hasAccess ? 'Assigned' : 'Not assigned'}
                          </label>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modules.length > 0 && (
        <section className="rounded-2xl border border-dashed border-border bg-navy/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Licensed modules for your organization
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {modules.map((m) => (
              <li
                key={m.slug}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-navy shadow-sm"
              >
                {m.name} ({m.slug})
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Organization, OrgDetails } from '@/lib/organizations';
import { PasswordInput } from '@/components/ui/password-input';
import { useToast } from '@/shared/notifications';

interface Props {
  org: Organization | null;
  apiPrefix: string;
  onClose: () => void;
  onSaved: () => void;
}

export function OrgCredentialsModal({ org, apiPrefix, onClose, onSaved }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    setPassword('');
    api
      .get(`${apiPrefix}/organizations/${org.id}`)
      .then((res) => {
        const details = res.data.data as OrgDetails;
        setEmail(details.adminUser?.email ?? details.email ?? '');
        setFirstName(details.adminUser?.firstName ?? '');
        setLastName(details.adminUser?.lastName ?? '');
        setRequirePasswordChange(details.adminUser?.mustChangePassword ?? true);
      })
      .catch(() => {
        setEmail(org.email ?? '');
        setFirstName('');
        setLastName('');
      })
      .finally(() => setLoading(false));
  }, [org, apiPrefix]);

  if (!org) return null;

  async function handleSave() {
    if (!email.trim()) return;
    if (password.trim() && password.trim().length < 8) {
      toast.error(
        'Password must be at least 8 characters, or leave blank to auto-generate.',
        'Invalid password'
      );
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`${apiPrefix}/organizations/${org!.id}/admin-credentials`, {
        email: email.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        requirePasswordChange,
        sendCredentials: true,
      });
      setPassword('');
      toast.success(
        res.data.data?.message ?? 'Credentials updated and emailed to the administrator.',
        'Password updated'
      );
      onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: { message: string }[] } } })
        ?.response?.data;
      toast.error(
        data?.errors?.[0]?.message ?? data?.message ?? 'Failed to update credentials.',
        'Update failed'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        <div className="border-b border-border bg-gradient-to-r from-navy to-navy-light px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/90">
            Organization credentials
          </p>
          <h2 className="mt-1 font-montserrat text-xl font-bold">{org.name}</h2>
          <p className="mt-1 text-sm text-white/70">Update the organization administrator login email and password.</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-navy/5" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">Admin email *</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.com"
                  className="w-full rounded-xl border border-border bg-[#f8fafc] px-4 py-2.5 text-sm text-navy outline-none transition focus:border-primary focus:bg-white"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">First name</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-[#f8fafc] px-4 py-2.5 text-sm text-navy outline-none transition focus:border-primary focus:bg-white"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">Last name</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-[#f8fafc] px-4 py-2.5 text-sm text-navy outline-none transition focus:border-primary focus:bg-white"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">New password</span>
                <PasswordInput
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (v.trim()) setRequirePasswordChange(false);
                    else setRequirePasswordChange(true);
                  }}
                  placeholder="Leave blank to auto-generate (min 8 chars if set)"
                  className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pl-4 pr-11 text-sm text-navy outline-none transition focus:border-primary focus:bg-white"
                />
              </label>
              <label className="flex items-center gap-2.5 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={requirePasswordChange}
                  onChange={(e) => setRequirePasswordChange(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                Require password change on first login
              </label>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-navy/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || loading || !email.trim()}
              onClick={handleSave}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save & send credentials'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Loader2, Lock, User } from 'lucide-react';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { govApi } from '@/services/api';
import { cn } from '@/shared/cn';

type SettingsTab = 'profile' | 'security';

type GovProfile = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl?: string | null;
  roleLabel: string;
  district?: string | null;
  sector?: string | null;
};

const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-navy outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/10';

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
}

export default function GovernmentSettingsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profile, setProfile] = useState<GovProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const displayName = useMemo(
    () => [firstName, lastName].filter(Boolean).join(' ').trim() || profile?.email || 'Official',
    [firstName, lastName, profile?.email]
  );

  async function loadProfile() {
    setLoading(true);
    try {
      const { data } = await govApi.get<{ data: GovProfile }>('/government/me');
      setProfile(data.data);
      setFirstName(data.data.firstName ?? '');
      setLastName(data.data.lastName ?? '');
      setPhone(data.data.phone ?? '');
    } catch {
      toast({ variant: 'error', title: 'Could not load profile', durationMs: 6000 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'error', title: 'Choose an image file', durationMs: 5000 });
      return;
    }
    if (file.size > 900_000) {
      toast({ variant: 'error', title: 'Use an image under 900 KB', durationMs: 6000 });
      return;
    }
    setUploadingPhoto(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const { data } = await govApi.patch<{ data: GovProfile }>('/government/me/avatar', { avatarUrl: dataUrl });
      setProfile(data.data);
      toast({ variant: 'success', title: 'Photo updated', durationMs: 4000 });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: 'error', title: msg ?? 'Photo upload failed', durationMs: 8000 });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto() {
    setUploadingPhoto(true);
    try {
      const { data } = await govApi.patch<{ data: GovProfile }>('/government/me/avatar', { avatarUrl: null });
      setProfile(data.data);
      toast({ variant: 'success', title: 'Photo removed', durationMs: 4000 });
    } catch {
      toast({ variant: 'error', title: 'Could not remove photo', durationMs: 6000 });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await govApi.patch<{ data: GovProfile }>('/government/me/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
      });
      setProfile(data.data);
      toast({ variant: 'success', title: 'Profile saved', durationMs: 4000 });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: 'error', title: msg ?? 'Update failed', durationMs: 8000 });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'error', title: 'New passwords do not match', durationMs: 6000 });
      return;
    }
    setSavingPassword(true);
    try {
      await govApi.post('/government/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ variant: 'success', title: 'Password changed', durationMs: 4000 });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: 'error', title: msg ?? 'Password change failed', durationMs: 8000 });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-7 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8 sm:space-y-5">
      <PageHeader title="Settings" description="Profile and account security." />

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex gap-1 border-b border-line bg-slate-50 p-2">
          {(
            [
              ['profile', 'Profile', User],
              ['security', 'Password', Lock],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold sm:text-sm',
                tab === id ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {tab === 'profile' ? (
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <div className="relative">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt=""
                      className="size-24 rounded-2xl border border-line object-cover shadow-sm"
                    />
                  ) : (
                    <div className="grid size-24 place-items-center rounded-2xl bg-navy text-2xl font-bold text-white">
                      {initials(firstName, lastName)}
                    </div>
                  )}
                  {uploadingPhoto ? (
                    <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40">
                      <Loader2 className="size-6 animate-spin text-white" />
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <p className="text-center text-base font-bold text-navy sm:text-left">{displayName}</p>
                  <p className="text-center text-xs text-slate-500 sm:text-left">{profile?.roleLabel}</p>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50">
                      <Camera className="size-3.5" />
                      Upload photo
                      <input type="file" accept="image/*" className="sr-only" onChange={onPhotoPick} disabled={uploadingPhoto} />
                    </label>
                    {profile?.avatarUrl ? (
                      <button
                        type="button"
                        onClick={() => void removePhoto()}
                        className="rounded-full px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                        disabled={uploadingPhoto}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">First name</label>
                  <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Last name</label>
                  <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                <input className={`${inputCls} bg-slate-50 text-slate-500`} value={profile?.email ?? ''} readOnly />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Jurisdiction</label>
                <input
                  className={`${inputCls} bg-slate-50 text-slate-500`}
                  value={[profile?.district, profile?.sector].filter(Boolean).join(' · ') || '—'}
                  readOnly
                />
              </div>
              <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={savingProfile}>
                {savingProfile ? <Loader2 className="size-4 animate-spin" /> : null}
                Save profile
              </Button>
            </form>
          ) : (
            <form onSubmit={savePassword} className="space-y-4">
              <p className="text-sm text-slate-600">Use a strong password with at least 8 characters.</p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Current password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">New password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Confirm new password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" variant="amber" className="w-full sm:w-auto" disabled={savingPassword}>
                {savingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, KeyRound, Loader2, Mail, Phone, Shield } from 'lucide-react';
import { fetchRepSession } from '@/lib/school-representative-api';
import { getStoredUser } from '@/lib/auth';
import {
  fetchAuthMe,
  mergeAuthUser,
  persistAuthUser,
  updateAuthProfile,
} from '@/lib/auth-profile-api';
import { resolvePublicAssetUrl } from '@/lib/organization-registration';
import { api } from '@/lib/api';

export default function RepProfilePage() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchAuthMe>> | null>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof fetchRepSession>> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [me, repSession] = await Promise.all([fetchAuthMe(), fetchRepSession()]);
    setProfile(me);
    setSession(repSession);
    persistAuthUser(mergeAuthUser(getStoredUser(), me));
  }, []);

  useEffect(() => {
    void load().catch(() => setError('Could not load profile'));
  }, [load]);

  async function onPickFile(file: File) {
    setError(null);
    setMessage(null);
    const mime = file.type || 'image/jpeg';
    if (!mime.startsWith('image/')) {
      setError('Please choose an image file (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const { data: uploadRes } = await api.post('/public/branding/upload', {
        assetType: 'avatar',
        fileName: file.name,
        contentBase64,
        mimeType: mime,
      });
      const path = String(uploadRes.data?.url ?? '').trim();
      if (!path) throw new Error('Upload failed');

      const updated = await updateAuthProfile({ avatarUrl: path });
      setProfile(updated);
      persistAuthUser(mergeAuthUser(getStoredUser(), updated));
      setMessage('Profile photo updated.');
    } catch {
      setError('Upload failed. Try again or use a smaller image.');
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setUploading(true);
    setError(null);
    try {
      const updated = await updateAuthProfile({ avatarUrl: null });
      setProfile(updated);
      persistAuthUser(mergeAuthUser(getStoredUser(), updated));
      setMessage('Profile photo removed.');
    } catch {
      setError('Could not remove photo.');
    } finally {
      setUploading(false);
    }
  }

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Representative';
  const avatarSrc = resolvePublicAssetUrl(profile?.avatarUrl);
  const initials =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : 'RP';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">My profile</h1>
        <p className="mt-1 text-sm text-muted">Manage your photo and account details.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="bg-gradient-to-br from-navy via-[#0a1050] to-[#1a2a6c] px-6 py-8 text-white">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <div className="relative">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-white/20 bg-white/10 shadow-lg">
                {avatarSrc ? (
                  <Image src={avatarSrc} alt="" width={112} height={112} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <span className="text-3xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-navy shadow-md transition hover:bg-primary-hover disabled:opacity-60"
                aria-label="Upload profile photo"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="text-center sm:pb-1 sm:text-left">
              <p className="text-xl font-bold">{fullName}</p>
              <p className="text-sm text-white/70">School representative</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <InfoRow icon={Mail} label="Email" value={profile?.email ?? '—'} />
          <InfoRow icon={Phone} label="Phone" value={profile?.phone ?? 'Not set'} />
          <InfoRow icon={Shield} label="Assigned schools" value={String(session?.assignedSchoolCount ?? '—')} />
          <InfoRow
            icon={Shield}
            label="Access"
            value={session?.accessMode?.replace(/_/g, ' ') ?? '—'}
            capitalize
          />

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-navy-light disabled:opacity-50"
            >
              Upload photo
            </button>
            {profile?.avatarUrl ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void removePhoto()}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
              >
                Remove photo
              </button>
            ) : null}
            <Link
              href="/school-representative/change-password"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[#f8f9fc] px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-navy shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className={`text-sm font-semibold text-navy ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

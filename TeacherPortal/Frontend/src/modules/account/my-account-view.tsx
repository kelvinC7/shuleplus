'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  User,
} from 'lucide-react';
import { SALARY_ADVANCE } from '@/config/salary-advance-brand';
import { AdvanceEligibilityCard } from '@/components/advance-eligibility-card';
import { useAuth } from '@/contexts/auth-context';
import { changePassword } from '@/services/auth-api';
import { fetchAccountProfile } from '@/services/teacher-api';
import type { TeacherAccountProfile } from '@/types';

export function MyAccountView() {
  const { reload } = useAuth();
  const [profile, setProfile] = useState<TeacherAccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await fetchAccountProfile());
      await reload();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not load your account';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [reload]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get('currentPassword'));
    const newPassword = String(fd.get('newPassword'));
    const confirmPassword = String(fd.get('confirmPassword'));
    if (newPassword.length < 8) {
      setPasswordErr('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg('Password updated successfully');
      e.currentTarget.reset();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not update password';
      setPasswordErr(message);
    } finally {
      setChangingPassword(false);
    }
  }

  const initials = (profile?.displayName ?? profile?.email ?? 'T')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="min-w-0 max-w-full space-y-4 pb-8 sm:space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Account</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-navy sm:text-2xl">My Account</h1>
            <p className="mt-1 text-sm text-muted">View your profile, timetable link, and security settings.</p>
          </div>
          <button type="button" className="btn-secondary inline-flex items-center gap-1 text-sm" onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && !profile ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : profile ? (
        <>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy text-xl font-bold text-white">
                {initials || 'T'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-navy">{profile.displayName ?? 'Teacher'}</h2>
                <p className="text-sm text-muted">{profile.organizationName}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-navy">
                  <Mail className="h-4 w-4 text-muted" />
                  {profile.email}
                </p>
              </div>
            </div>
          </div>

          {profile.registrationPath === 'timetable' ? (
            <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <CalendarDays className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <p className="font-bold text-navy">Registered via Timetable</p>
                  <p className="mt-1 text-sm text-muted">
                    Your teaching account is active. HR and Payroll are <strong className="font-semibold text-navy">not required</strong> for
                    timetable, lessons, attendance, or check-in. Salary Advance only applies when your school connects Payroll.
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" />
              </div>
            </div>
          ) : profile.registrationPath === 'unlinked' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Link your account in Timetable</p>
              <p className="mt-1">
                Ask your admin to add you in <strong>Timetable → Teacher profiles</strong> with Portal enabled and your login email{' '}
                <span className="font-mono text-xs">({profile.email})</span>. HR is optional.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h3 className="font-bold text-navy">Profile details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Login email (IAM)" value={profile.email} />
                <Row
                  label="Timetable email"
                  value={profile.timetable?.loginEmail ?? 'Not linked on timetable'}
                  highlight={profile.timetable?.emailMatched}
                />
                <Row label="Teacher ID" value={profile.timetable?.teacherUserId ?? '—'} />
                <Row label="Timetable name" value={profile.timetable?.teacherName ?? '—'} />
                <Row
                  label="Phone"
                  value={profile.timetable?.loginPhone ?? '—'}
                  icon={<Phone className="h-3.5 w-3.5" />}
                />
                <Row label="Employee number" value={profile.salaryAdvance.employeeNumber ?? '—'} />
                <Row label="Roles" value={profile.roles.join(', ') || 'teacher'} />
              </dl>
              {profile.timetable && !profile.emailAligned ? (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Timetable login email should match your sign-in email ({profile.email}) so your account links automatically.
                </p>
              ) : null}
            </section>

            <AdvanceEligibilityCard
              eligibility={{
                allowed: profile.salaryAdvance.allowed,
                status: profile.salaryAdvance.status,
                message: profile.salaryAdvance.message,
                net_salary_rwf: profile.salaryAdvance.netSalaryRwf,
                max_percent: 25,
                monthly_cap_rwf: 0,
                monthly_requested_rwf: 0,
                monthly_remaining_rwf: 0,
                auto_approval_limit_rwf: 0,
                auto_approval_remaining_rwf: 0,
                payroll_module_enabled: profile.salaryAdvance.payrollModuleEnabled,
                timetable_linked: profile.salaryAdvance.timetableLinked,
                registration_via: profile.salaryAdvance.registrationVia === 'unlinked' ? null : profile.salaryAdvance.registrationVia,
              }}
              employeeNumber={profile.salaryAdvance.employeeNumber}
              syncedAt={profile.salaryAdvance.syncedAt}
            />
            {profile.salaryAdvance.allowed ? (
              <div className="lg:col-span-2">
                <Link href="/salary-advance" className="btn-primary inline-flex text-sm">
                  Open {SALARY_ADVANCE.shortName}
                </Link>
              </div>
            ) : null}
          </div>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-navy">Change password</h3>
            </div>
            <p className="mt-1 text-sm text-muted">Update your sign-in password for ShulePlus.</p>
            {passwordMsg ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {passwordMsg}
              </p>
            ) : null}
            {passwordErr ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {passwordErr}
              </p>
            ) : null}
            <form onSubmit={(e) => void handlePassword(e)} className="mt-4 grid max-w-md gap-3">
              <label className="block text-sm">
                Current password
                <input name="currentPassword" type="password" className="input mt-1 w-full" required autoComplete="current-password" />
              </label>
              <label className="block text-sm">
                New password
                <input name="newPassword" type="password" className="input mt-1 w-full" required minLength={8} autoComplete="new-password" />
              </label>
              <label className="block text-sm">
                Confirm new password
                <input name="confirmPassword" type="password" className="input mt-1 w-full" required minLength={8} autoComplete="new-password" />
              </label>
              <button type="submit" className="btn-primary w-fit" disabled={changingPassword}>
                {changingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className={`flex items-center gap-1 font-medium ${highlight ? 'text-emerald-700' : 'text-navy'}`}>
        {icon}
        {value}
        {highlight ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
      </dd>
    </div>
  );
}

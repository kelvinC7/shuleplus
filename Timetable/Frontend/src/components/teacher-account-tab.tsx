'use client';

import { useMemo, useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { TextField } from '@/components/form-fields';
import { ModalSection } from '@/components/setup-modal';
import type { TeacherAccountStatus, TeacherLoginMethod, TeacherProfile } from '@/types';
import {
  isValidEmail,
  isValidRwandaPhone,
  passwordChecks,
  passwordStrength,
  validateManualPassword,
  validatePassword,
} from '@/utils/account-validation';

export interface TeacherAccountDraft {
  portalEnabled: boolean;
  loginMethod: TeacherLoginMethod;
  loginEmail: string;
  loginPhone: string;
  password: string;
  confirmPassword: string;
  requirePasswordChange: boolean;
  sendCredentialsEmail: boolean;
}

export function emptyAccountDraft(profile?: TeacherProfile | null): TeacherAccountDraft {
  return {
    portalEnabled: profile?.portalEnabled ?? false,
    loginMethod: profile?.loginMethod ?? 'email',
    loginEmail: profile?.loginEmail ?? profile?.account?.email ?? '',
    loginPhone: profile?.loginPhone ?? profile?.account?.phone ?? '',
    password: '',
    confirmPassword: '',
    requirePasswordChange: true,
    sendCredentialsEmail: true,
  };
}

export function validateAccountDraft(
  draft: TeacherAccountDraft,
  isNew: boolean,
  existingAccount?: TeacherAccountStatus | null,
): string | null {
  if (!draft.portalEnabled) return null;

  if (draft.loginMethod === 'email' || draft.loginMethod === 'both') {
    if (!draft.loginEmail.trim() || !isValidEmail(draft.loginEmail)) {
      return 'Enter a valid login email';
    }
  }
  if (draft.loginMethod === 'phone' || draft.loginMethod === 'both') {
    if (!draft.loginPhone.trim() || !isValidRwandaPhone(draft.loginPhone)) {
      return 'Enter a valid Rwanda phone number (+250 7XX XXX XXX)';
    }
  }

  const needsPassword = isNew || !existingAccount;
  if (needsPassword) {
    if (!draft.password) return 'Password is required';
    const policy = validatePassword(draft.password);
    if (policy) return policy;
    if (draft.password !== draft.confirmPassword) return 'Passwords do not match';
  } else if (draft.password) {
    const policy = validatePassword(draft.password);
    if (policy) return policy;
    if (draft.password !== draft.confirmPassword) return 'Passwords do not match';
  }

  return null;
}

interface TeacherAccountTabProps {
  draft: TeacherAccountDraft;
  onChange: (patch: Partial<TeacherAccountDraft>) => void;
  account?: TeacherAccountStatus | null;
  isNew: boolean;
  onSetManualPassword?: (payload: {
    password: string;
    sendCredentialsEmail: boolean;
  }) => void | Promise<void>;
  onResetPasswordAuto?: () => void | Promise<void>;
  onDisableAccount?: () => void;
  onEnableAccount?: () => void;
  busy?: boolean;
}

export function TeacherAccountTab({
  draft,
  onChange,
  account,
  isNew,
  onSetManualPassword,
  onResetPasswordAuto,
  onDisableAccount,
  onEnableAccount,
  busy,
}: TeacherAccountTabProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const [manualConfirm, setManualConfirm] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [showManualConfirm, setShowManualConfirm] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const strength = useMemo(() => passwordStrength(draft.password), [draft.password]);
  const checks = useMemo(() => passwordChecks(draft.password), [draft.password]);

  const statusLabel =
    account?.status === 'ACTIVE'
      ? '🟢 Active'
      : account?.status === 'SUSPENDED'
        ? '🔴 Disabled'
        : account?.status ?? '—';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="font-bold text-navy">Account & Portal Access</p>
            <p className="mt-0.5 text-sm text-muted">
              Give this teacher secure access to Teacher Portal.
            </p>
          </div>
        </div>
      </div>

      <ModalSection title="Portal Access">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/60 px-4 py-3">
          <span className="text-sm font-semibold text-navy">Enable Teacher Portal</span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.portalEnabled}
            disabled={busy}
            onClick={() => onChange({ portalEnabled: !draft.portalEnabled })}
            className={`relative h-7 w-12 rounded-full transition ${
              draft.portalEnabled ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                draft.portalEnabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </label>
      </ModalSection>

      {draft.portalEnabled ? (
        <>
          <ModalSection title="Login Method">
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['both', 'Email or Phone'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    draft.loginMethod === value
                      ? 'border-primary bg-primary/10 text-navy'
                      : 'border-border text-muted hover:border-primary/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="loginMethod"
                    className="accent-primary"
                    checked={draft.loginMethod === value}
                    onChange={() => onChange({ loginMethod: value })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </ModalSection>

          {(draft.loginMethod === 'email' || draft.loginMethod === 'both') && (
            <TextField
              compact
              label="Login Email"
              required
              value={draft.loginEmail}
              onChange={(v) => onChange({ loginEmail: v })}
              placeholder="teacher@school.rw"
            />
          )}

          {(draft.loginMethod === 'phone' || draft.loginMethod === 'both') && (
            <TextField
              compact
              label="Login Phone"
              required
              value={draft.loginPhone}
              onChange={(v) => onChange({ loginPhone: v })}
              placeholder="+250 788 123 456"
            />
          )}

          {!account || isNew ? (
            <>
              <div className="relative">
                <TextField
                  compact
                  label="Password"
                  required={isNew}
                  type={showPassword ? 'text' : 'password'}
                  value={draft.password}
                  onChange={(v) => onChange({ password: v })}
                  placeholder="Create a secure password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-[2.15rem] text-muted"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <TextField
                  compact
                  label="Confirm Password"
                  required={isNew}
                  type={showConfirm ? 'text' : 'password'}
                  value={draft.confirmPassword}
                  onChange={(v) => onChange({ confirmPassword: v })}
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-[2.15rem] text-muted"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {draft.password ? (
                <div className="rounded-xl border border-border bg-slate-50/70 px-4 py-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-navy">
                    <span>Password strength</span>
                    <span>{strength.label}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round(strength.score * 100)}%` }}
                    />
                  </div>
                  <ul className="mt-3 space-y-1">
                    {checks.map((c) => (
                      <li
                        key={c.label}
                        className={`text-xs ${c.ok ? 'text-success' : 'text-muted'}`}
                      >
                        {c.ok ? '✓' : '○'} {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={draft.requirePasswordChange}
                onChange={(e) => onChange({ requirePasswordChange: e.target.checked })}
              />
              Require password change on first login
            </label>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={draft.sendCredentialsEmail}
                onChange={(e) => onChange({ sendCredentialsEmail: e.target.checked })}
              />
              Send account credentials to teacher
            </label>
          </div>

          {account && !isNew ? (
            <>
              <ModalSection title="Account Status">
                <div className="space-y-3 rounded-xl border border-border bg-white px-4 py-4 text-sm">
                  <p className="font-semibold text-navy">{statusLabel}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Login</p>
                      <p className="font-medium text-navy">{account.email}</p>
                      {account.phone ? <p className="text-muted">{account.phone}</p> : null}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Last Login</p>
                      <p className="font-medium text-navy">
                        {account.lastLoginAt
                          ? new Date(account.lastLoginAt).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {account.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        className="btn-secondary py-2 text-xs"
                        disabled={busy}
                        onClick={onDisableAccount}
                      >
                        Disable Account
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary py-2 text-xs"
                        disabled={busy}
                        onClick={onEnableAccount}
                      >
                        Enable Account
                      </button>
                    )}
                  </div>
                </div>
              </ModalSection>

              <ModalSection title="Reset password">
                <p className="mb-3 text-xs text-muted">
                  Set a new password manually (minimum 8 characters) or email a random one.
                </p>
                <div className="space-y-3 rounded-xl border border-border bg-white px-4 py-4">
                  <div className="relative">
                    <TextField
                      compact
                      label="New password"
                      required
                      type={showManualPassword ? 'text' : 'password'}
                      value={manualPassword}
                      onChange={(v) => {
                        setManualPassword(v);
                        setManualError(null);
                      }}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[2.15rem] text-muted"
                      onClick={() => setShowManualPassword((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      {showManualPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <TextField
                      compact
                      label="Confirm new password"
                      required
                      type={showManualConfirm ? 'text' : 'password'}
                      value={manualConfirm}
                      onChange={(v) => {
                        setManualConfirm(v);
                        setManualError(null);
                      }}
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[2.15rem] text-muted"
                      onClick={() => setShowManualConfirm((v) => !v)}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showManualConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {manualPassword ? (
                    <p
                      className={`text-xs font-semibold ${
                        manualPassword.length >= 8 ? 'text-success' : 'text-amber-800'
                      }`}
                    >
                      {manualPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                    </p>
                  ) : null}
                  {manualError ? (
                    <p className="text-xs font-semibold text-red-700">{manualError}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary py-2 text-xs"
                      disabled={busy}
                      onClick={() => {
                        const policy = validateManualPassword(manualPassword);
                        if (policy) {
                          setManualError(policy);
                          return;
                        }
                        if (manualPassword !== manualConfirm) {
                          setManualError('Passwords do not match');
                          return;
                        }
                        setManualError(null);
                        void (async () => {
                          try {
                            await onSetManualPassword?.({
                              password: manualPassword,
                              sendCredentialsEmail: draft.sendCredentialsEmail,
                            });
                            setManualPassword('');
                            setManualConfirm('');
                          } catch {
                            /* parent shows toast */
                          }
                        })();
                      }}
                    >
                      <KeyRound size={14} /> Set password
                    </button>
                    <button
                      type="button"
                      className="btn-secondary py-2 text-xs"
                      disabled={busy}
                      onClick={() => void onResetPasswordAuto?.()}
                      title="Generate a secure random password and email it if enabled above"
                    >
                      Email random password
                    </button>
                  </div>
                </div>
              </ModalSection>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

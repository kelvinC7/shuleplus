'use client';

import type { ReactNode } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PIN_LENGTH, type ParentAuthStep } from '@/lib/parent-auth-api';

export function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function PinField({
  label,
  value,
  onChange,
  autoFocus,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--yo-line)]/80 bg-[var(--yo-bg)]/50 px-4 py-5">
      <label className="text-center text-xs font-bold uppercase tracking-wide text-[var(--yo-muted)]">{label}</label>
      <InputOTP
        maxLength={PIN_LENGTH}
        inputMode="numeric"
        pattern="[0-9]*"
        autoFocus={autoFocus}
        value={value}
        onChange={(v) => onChange(v.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        containerClassName="justify-center gap-2 sm:gap-2.5"
      >
        <InputOTPGroup className="gap-2 border-0 bg-transparent shadow-none sm:gap-2.5">
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-11 w-11 rounded-xl border-[1.5px] border-[var(--yo-line)] bg-white text-xl font-bold text-[var(--yo-navy)] shadow-sm first:rounded-xl last:rounded-xl data-[active=true]:border-[var(--yo-amber)] data-[active=true]:ring-4 data-[active=true]:ring-[var(--yo-amber)]/20 sm:h-12 sm:w-12"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {hint ? <p className="text-center text-xs text-[var(--yo-muted)]">{hint}</p> : null}
    </div>
  );
}

export function PhoneField({
  label,
  icon,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--yo-muted)]">
      {label}
      <div className="flex items-center gap-3 rounded-full border border-[var(--yo-line)] bg-[#fafbfc] px-4 py-3.5 transition focus-within:border-[var(--yo-amber)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--yo-amber)]/12">
        <span className="shrink-0 text-[var(--yo-muted)]">{icon}</span>
        <input
          type="tel"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="tel"
          inputMode="tel"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[var(--yo-navy)] outline-none placeholder:text-[var(--yo-muted)]/60"
        />
      </div>
    </label>
  );
}

export function EmailField({
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--yo-muted)]">
      {label}
      <div className="flex items-center gap-3 rounded-full border border-[var(--yo-line)] bg-[#fafbfc] px-4 py-3.5 transition focus-within:border-[var(--yo-amber)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--yo-amber)]/12">
        <span className="shrink-0 text-[var(--yo-muted)]">
          <MailIcon />
        </span>
        <input
          type="email"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[var(--yo-navy)] outline-none placeholder:text-[var(--yo-muted)]/60"
        />
      </div>
      {hint ? <span className="text-[11px] font-semibold normal-case tracking-normal text-[var(--yo-muted)]">{hint}</span> : null}
    </label>
  );
}

export function AuthStepDots({ step, resetFlow }: { step: ParentAuthStep; resetFlow?: boolean }) {
  const map: Record<ParentAuthStep, number> = resetFlow
    ? {
        phone: 0,
        login: 1,
        'verify-email': 1,
        'set-pin': 2,
        'confirm-pin': 3,
      }
    : {
        phone: 0,
        login: 1,
        'verify-email': 1,
        'set-pin': 1,
        'confirm-pin': 2,
      };
  const active = map[step] ?? 0;
  const total = resetFlow ? 4 : step === 'confirm-pin' || step === 'set-pin' ? 3 : 2;
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === active ? 'w-8 bg-[var(--yo-amber)]' : i < active ? 'w-4 bg-[var(--yo-amber)]/50' : 'w-1.5 bg-[var(--yo-navy)]/12'
          }`}
        />
      ))}
    </div>
  );
}

export function YoAuthPrimaryButton({
  children,
  disabled,
  loading,
  type = 'submit',
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="yo-btn yo-btn-solid flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-extrabold disabled:opacity-60"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        children
      )}
    </button>
  );
}

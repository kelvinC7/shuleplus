"use client";

import { BrandLogo } from "@/components/brand-logo";

export function AuthLoadingView({ label = "Verifying your session…" }: { label?: string }) {
  return (
    <div className="auth-access-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="auth-access-orb auth-access-orb--gold" aria-hidden />
      <div className="auth-access-orb auth-access-orb--navy" aria-hidden />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="rounded-[28px] border border-white/80 bg-white px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,4,53,0.14)]">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
          <p className="text-sm font-semibold text-navy">{label}</p>
          <p className="mt-2 text-xs text-muted">Checking IAM access and KaziAdvance license…</p>
          <div className="mt-8 flex justify-center">
            <BrandLogo className="opacity-75" />
          </div>
        </div>
      </div>
    </div>
  );
}

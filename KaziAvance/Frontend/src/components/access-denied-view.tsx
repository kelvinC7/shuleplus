"use client";

import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { refreshAccessToken } from "@/shared/auth-token";

const IAM_URL = (process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3000").replace(/\/$/, "");

type AccessDeniedViewProps = {
  error?: string | null;
  onRefreshSession?: () => Promise<void> | void;
};

function resolveCopy(error?: string | null) {
  const message = error?.trim() ?? "";
  const lower = message.toLowerCase();

  if (!message || lower.includes("expired") || lower.includes("invalid")) {
    return {
      title: "Access Denied",
      body: "Your session has expired or the access token is no longer valid. Please sign in again to continue using KaziAdvance.",
      variant: "session" as const
    };
  }

  if (lower.includes("missing") && lower.includes("token")) {
    return {
      title: "Access Denied",
      body: "No valid session was found. Open KaziAdvance from your Shule+ applications launcher after signing in.",
      variant: "missing" as const
    };
  }

  if (lower.includes("cannot reach kaziadvance api") || lower.includes("failed to fetch")) {
    return {
      title: "KaziAdvance API Offline",
      body: "The admin portal could not reach the KaziAdvance backend. Start it with: cd KaziAvance/Backend && npm run dev (port 4400), then click Refresh Session.",
      variant: "offline" as const,
    };
  }

  if (lower.includes("licensed") || lower.includes("module")) {
    return {
      title: "Module Not Licensed",
      body: message,
      variant: "license" as const
    };
  }

  return {
    title: "Access Denied",
    body: message,
    variant: "generic" as const
  };
}

export function AccessDeniedView({ error, onRefreshSession }: AccessDeniedViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const copy = useMemo(() => resolveCopy(error), [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const token = await refreshAccessToken();
      if (!token) {
        setRefreshError("Could not refresh your session. Please sign in again.");
        return;
      }
      await onRefreshSession?.();
    } catch {
      setRefreshError("Could not refresh your session. Please sign in again.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="auth-access-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="auth-access-orb auth-access-orb--gold" aria-hidden />
      <div className="auth-access-orb auth-access-orb--navy" aria-hidden />

      <div className="relative z-10 w-full max-w-[520px] animate-fade-in-up">
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(0,4,53,0.14)]">
          <div className="px-8 pb-2 pt-10 text-center sm:px-10">
            <div className="relative mx-auto mb-6 h-[120px] w-[120px]">
              <span className="auth-float-shape auth-float-shape--x" aria-hidden>
                ×
              </span>
              <span className="auth-float-shape auth-float-shape--dot" aria-hidden />
              <span className="auth-float-shape auth-float-shape--tri" aria-hidden />
              <div className="relative mx-auto flex h-[104px] w-[104px] items-center justify-center rounded-[28px] bg-gradient-to-br from-[#1a1f5c] to-navy shadow-lg">
                <ShieldLockIcon />
              </div>
            </div>

            <h1 className="text-[28px] font-bold tracking-tight text-navy sm:text-[32px]">{copy.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{copy.body}</p>

            <div className="mt-6 rounded-2xl border border-primary/25 bg-[#fff8eb] px-4 py-3.5 text-left">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-navy">
                  <ShieldCheckIcon />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">Your account remains secure.</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    For your protection, inactive sessions are automatically signed out.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-8 py-6 sm:px-10">
            <a
              href={`${IAM_URL}/login`}
              className="flex w-full items-center justify-between rounded-2xl bg-navy px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-navy-light"
            >
              <span className="inline-flex items-center gap-2.5">
                <LoginIcon />
                Sign In Again
              </span>
              <ArrowRightIcon />
            </a>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href={`${IAM_URL}/launch`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-navy transition hover:border-navy/20 hover:bg-slate-50"
              >
                <GridIcon />
                Go to Dashboard
              </a>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-white px-4 py-3 text-sm font-semibold text-navy transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon spinning={refreshing} />
                {refreshing ? "Refreshing…" : "Refresh Session"}
              </button>
            </div>

            {refreshError ? <p className="text-center text-xs text-danger">{refreshError}</p> : null}
          </div>

          <div className="border-t border-border bg-slate-50/80 px-8 py-5 sm:px-10">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <HeadsetIcon />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Need Help?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  If you believe this is an error, contact your system administrator or Shule+ support team.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <BrandLogo className="opacity-90" />
        </div>
      </div>
    </div>
  );
}

function ShieldLockIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <path
        d="M26 6L42 12V24.5C42 34.2 35.4 43.1 26 46C16.6 43.1 10 34.2 10 24.5V12L26 6Z"
        fill="#2f3f9f"
        stroke="#fcb038"
        strokeWidth="2"
      />
      <rect x="20" y="22" width="12" height="14" rx="2" fill="#fcb038" />
      <path d="M22 22V19.5C22 16.5 24.2 14 26 14C27.8 14 30 16.5 30 19.5V22" stroke="#fcb038" strokeWidth="2.5" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5L13 3.8V7.8C13 11 10.6 13.8 8 14.7C5.4 13.8 3 11 3 7.8V3.8L8 1.5Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 8L7.2 9.7L10.8 6.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M6.5 4.5H4.8C3.8 4.5 3 5.3 3 6.3V11.7C3 12.7 3.8 13.5 4.8 13.5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 12.5L15 9L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M7 4.5L12 9L7 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={spinning ? "animate-spin" : undefined}
    >
      <path
        d="M13.2 8.8A5 5 0 1 1 8 3v1.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M8 2.5V5.2H10.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4 11.5V9.5C4 6.5 6.5 4 9.5 4C12.5 4 15 6.5 15 9.5V11.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="3" y="10.5" width="2.8" height="4" rx="1" fill="currentColor" />
      <rect x="12.2" y="10.5" width="2.8" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

'use client';

import { MODULE_LIFECYCLE_META } from '@/lib/module-lifecycle';
import type { InAppNotificationItem } from '@/shared/notifications/types';

export type ModuleAlertKind =
  | 'pending_all'
  | 'pending_partial'
  | 'provisioning'
  | 'unconfigured';

export interface ModuleAlertState {
  kind: ModuleAlertKind;
  pending: number;
  active: number;
  provisioning: number;
  unconfigured: number;
  total: number;
}

export function buildModuleAlertSignature(state: ModuleAlertState | null): string {
  if (!state) return 'none';
  return `${state.kind}:${state.pending}:${state.active}:${state.provisioning}:${state.unconfigured}`;
}

export function buildModuleNotifications(state: ModuleAlertState | null): InAppNotificationItem[] {
  if (!state) return [];

  const now = new Date().toISOString();

  if (state.kind === 'pending_all') {
    return [
      {
        id: 'module-status-pending-all',
        title: 'Modules awaiting approval',
        body: `${state.pending} module${state.pending === 1 ? '' : 's'} waiting for Super Admin activation. You will be notified when they are ready.`,
        priority: 'high',
        isRead: false,
        isArchived: false,
        createdAt: now,
      },
    ];
  }

  if (state.kind === 'pending_partial') {
    return [
      {
        id: 'module-status-pending-partial',
        title: 'Some modules still pending',
        body: `${state.active} active · ${state.pending} still awaiting platform approval.`,
        priority: 'high',
        isRead: false,
        isArchived: false,
        createdAt: now,
      },
    ];
  }

  if (state.kind === 'provisioning') {
    return [
      {
        id: 'module-status-provisioning',
        title: 'Modules being provisioned',
        body: `${state.provisioning} module${state.provisioning === 1 ? '' : 's'} ${MODULE_LIFECYCLE_META.provisioning.description.toLowerCase()}.`,
        priority: 'normal',
        isRead: false,
        isArchived: false,
        createdAt: now,
      },
    ];
  }

  return [
    {
      id: 'module-status-unconfigured',
      title: 'Module setup required',
      body: `${state.unconfigured} module${state.unconfigured === 1 ? '' : 's'} need configuration before they can be launched.`,
      priority: 'normal',
      isRead: false,
      isArchived: false,
      createdAt: now,
    },
  ];
}

const ALERT_COPY: Record<
  ModuleAlertKind,
  { title: string; description: string; accent: string; icon: 'clock' | 'spark' | 'alert' }
> = {
  pending_all: {
    title: 'Waiting for module approval',
    description:
      'Your selected modules are registered but locked until it is activated. You will get a notification when they are ready to launch.',
    accent: 'from-amber-500/15 to-amber-500/5 border-amber-200/80',
    icon: 'clock',
  },
  pending_partial: {
    title: 'Activation in progress',
    description:
      'Some modules are already active. The rest are still waiting for platform approval — they will unlock automatically once approved.',
    accent: 'from-amber-500/15 to-amber-500/5 border-amber-200/80',
    icon: 'clock',
  },
  provisioning: {
    title: 'Setting up your workspaces',
    description:
      'We are preparing tenant workspaces for your modules. This usually completes shortly after activation.',
    accent: 'from-sky-500/15 to-sky-500/5 border-sky-200/80',
    icon: 'spark',
  },
  unconfigured: {
    title: 'Module configuration needed',
    description:
      'Some licensed modules still need platform configuration. Contact support or your Super Admin if this persists.',
    accent: 'from-slate-500/10 to-slate-500/5 border-slate-200/80',
    icon: 'alert',
  },
};

function AlertIcon({ type }: { type: 'clock' | 'spark' | 'alert' }) {
  if (type === 'spark') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      </svg>
    );
  }
  if (type === 'alert') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function ModuleStatusModal({
  state,
  onDismiss,
}: {
  state: ModuleAlertState;
  onDismiss: () => void;
}) {
  const copy = ALERT_COPY[state.kind];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#000435]/45 backdrop-blur-[2px]"
        onClick={onDismiss}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-[0_32px_80px_-24px_rgba(0,4,53,0.4)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-status-title"
      >
        <div className={`border-b bg-gradient-to-br px-6 py-5 ${copy.accent}`}>
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
              <AlertIcon type={copy.icon} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/50">
                Module status
              </p>
              <h2 id="module-status-title" className="mt-1 text-lg font-bold text-navy sm:text-xl">
                {copy.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-navy/75">{copy.description}</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {state.active > 0 && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-emerald-700">{state.active}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">Active</p>
              </div>
            )}
            {state.pending > 0 && (
              <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-amber-700">{state.pending}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/80">Pending</p>
              </div>
            )}
            {state.provisioning > 0 && (
              <div className="rounded-xl bg-sky-50 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-sky-700">{state.provisioning}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600/80">Setup</p>
              </div>
            )}
            {state.unconfigured > 0 && (
              <div className="rounded-xl bg-slate-100 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-slate-700">{state.unconfigured}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Config</p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-xl border border-navy/10 px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-[#f8fafc]"
            >
              Got it
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-xl bg-[#000435] px-4 py-2.5 text-sm font-semibold text-[#FCB038] transition hover:bg-[#0a0f52]"
            >
              View applications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

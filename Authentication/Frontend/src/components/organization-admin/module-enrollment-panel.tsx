'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  orgAdminApi,
  type MarketplaceModuleItem,
  type ModuleEnrollmentStatus,
} from '@/lib/org-admin-api';
import { resolveModuleIcon } from '@/lib/module-icons';
import { useToast } from '@/shared/notifications';

interface ModuleEnrollmentPanelProps {
  open: boolean;
  onClose: () => void;
  onEnrolled: () => void;
}

const STATUS_LABELS: Record<ModuleEnrollmentStatus, string> = {
  available: 'Available',
  active: 'Already active',
  pending_activation: 'Pending activation',
  provisioning: 'Setting up workspace',
  suspended: 'Suspended',
};

const STATUS_STYLES: Record<ModuleEnrollmentStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  active: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending_activation: 'bg-amber-50 text-amber-700 ring-amber-200',
  provisioning: 'bg-sky-50 text-sky-700 ring-sky-200',
  suspended: 'bg-red-50 text-red-700 ring-red-200',
};

function ModuleCatalogIcon({ item }: { item: MarketplaceModuleItem }) {
  const src = resolveModuleIcon({
    slug: item.module.slug,
    name: item.module.name,
    icon: item.module.icon,
  });

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-navy/[0.06] bg-gradient-to-b from-white to-slate-50 shadow-sm">
      <Image src={src} alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
    </span>
  );
}

export function ModuleEnrollmentPanel({ open, onClose, onEnrolled }: ModuleEnrollmentPanelProps) {
  const toast = useToast();
  const [catalog, setCatalog] = useState<MarketplaceModuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available'>('all');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orgAdminApi.listModuleCatalog();
      setCatalog(res.data.data);
    } catch {
      toast.error('Could not load the module catalog.', 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      void loadCatalog();
    }
  }, [open, loadCatalog]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleEnroll(item: MarketplaceModuleItem) {
    if (item.enrollmentStatus !== 'available') return;

    setEnrollingId(item.module.id);
    try {
      const res = await orgAdminApi.enrollModule(item.module.id);
      const result = res.data.data;
      if (result.enrollmentStatus === 'active') {
        toast.success(result.message, `${result.module.name} added`);
      } else if (result.enrollmentStatus === 'pending_activation') {
        toast.warning(result.message, `${result.module.name} pending activation`);
      } else {
        toast.info(result.message, `${result.module.name} enrolled`);
      }
      await loadCatalog();
      onEnrolled();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not enroll in this module.',
        'Enrollment failed'
      );
    } finally {
      setEnrollingId(null);
    }
  }

  if (!open) return null;

  const visible =
    filter === 'available'
      ? catalog.filter((item) => item.enrollmentStatus === 'available')
      : catalog;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close module catalog"
        className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl sm:rounded-3xl">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Module marketplace
              </p>
              <h2 className="mt-1 font-montserrat text-xl font-bold text-navy">
                Add modules to your school
              </h2>
              <p className="mt-1 text-sm text-muted">
                Choose applications to enroll. New modules may require activation and tenant setup
                before you can launch them.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border p-2 text-muted transition hover:bg-slate-50 hover:text-navy"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === 'all'
                  ? 'bg-navy text-white'
                  : 'bg-slate-100 text-muted hover:text-navy'
              }`}
            >
              All modules
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === 'available'
                  ? 'bg-navy text-white'
                  : 'bg-slate-100 text-muted hover:text-navy'
              }`}
            >
              Available to add
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center">
              <p className="font-semibold text-navy">No modules in this view</p>
              <p className="mt-1 text-sm text-muted">
                {filter === 'available'
                  ? 'You already have every marketplace module assigned.'
                  : 'No marketplace modules are available right now.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((item) => {
                const canEnroll = item.enrollmentStatus === 'available';
                const isEnrolling = enrollingId === item.module.id;

                return (
                  <li
                    key={item.module.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-primary/25 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <ModuleCatalogIcon item={item} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-navy">{item.module.name}</h3>
                          {item.module.isPremium && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                              Premium
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${STATUS_STYLES[item.enrollmentStatus]}`}
                          >
                            {STATUS_LABELS[item.enrollmentStatus]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.module.category ?? item.module.slug}
                        </p>
                        {item.module.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{item.module.description}</p>
                        )}
                        {item.dependencies.length > 0 && (
                          <p className="mt-2 text-[11px] text-muted">
                            Requires: {item.dependencies.map((d) => d.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 sm:pl-2">
                      {canEnroll ? (
                        <button
                          type="button"
                          disabled={isEnrolling}
                          onClick={() => void handleEnroll(item)}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:brightness-105 disabled:opacity-60 sm:w-auto"
                        >
                          {isEnrolling ? 'Enrolling…' : 'Enroll module'}
                        </button>
                      ) : item.enrollmentStatus === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          In your workspace
                        </span>
                      ) : item.enrollmentStatus === 'pending_activation' ? (
                        <span className="text-xs font-semibold text-amber-700">Awaiting activation</span>
                      ) : item.enrollmentStatus === 'provisioning' ? (
                        <span className="text-xs font-semibold text-sky-700">Provisioning tenant</span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

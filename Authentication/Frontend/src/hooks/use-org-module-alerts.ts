'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { LicensedModule } from '@/lib/modules';
import { countModulesByLifecycle } from '@/lib/module-lifecycle';
import {
  buildModuleAlertSignature,
  buildModuleNotifications,
  type ModuleAlertKind,
  type ModuleAlertState,
} from '@/components/organization-admin/module-status-modal';

const DISMISS_KEY = 'org_module_alert_dismissed';

function resolveAlertKind(counts: ReturnType<typeof countModulesByLifecycle>): ModuleAlertKind | null {
  if (counts.pending_activation > 0) {
    return counts.active === 0 ? 'pending_all' : 'pending_partial';
  }
  if (counts.provisioning > 0) return 'provisioning';
  if (counts.unconfigured > 0) return 'unconfigured';
  return null;
}

export function useOrgModuleAlerts(enabled: boolean) {
  const [loading, setLoading] = useState(true);
  const [alertState, setAlertState] = useState<ModuleAlertState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get('/iam/me/modules');
      const rows = (res.data.data ?? []).filter(
        (m: LicensedModule) => m.slug !== 'shulekit-mis'
      ) as LicensedModule[];
      const counts = countModulesByLifecycle(rows);
      const kind = resolveAlertKind(counts);

      if (!kind) {
        setAlertState(null);
        setModalOpen(false);
        if (typeof window !== 'undefined') sessionStorage.removeItem(DISMISS_KEY);
        return;
      }

      const next: ModuleAlertState = {
        kind,
        pending: counts.pending_activation,
        active: counts.active,
        provisioning: counts.provisioning,
        unconfigured: counts.unconfigured,
        total: counts.total,
      };
      setAlertState(next);

      const signature = buildModuleAlertSignature(next);
      const dismissed =
        typeof window !== 'undefined' ? sessionStorage.getItem(DISMISS_KEY) : null;
      setDismissedSignature(dismissed);
      if (dismissed !== signature) setModalOpen(true);
    } catch {
      setAlertState(null);
      setModalOpen(false);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    if (!enabled) return;
    const id = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  const notifications = useMemo(
    () => buildModuleNotifications(alertState),
    [alertState]
  );

  function dismissModal() {
    if (alertState) {
      const signature = buildModuleAlertSignature(alertState);
      sessionStorage.setItem(DISMISS_KEY, signature);
      setDismissedSignature(signature);
    }
    setModalOpen(false);
  }

  const showModal = Boolean(alertState && modalOpen);

  return {
    loading,
    alertState,
    notifications,
    showModal,
    dismissModal,
    refresh: load,
    dismissedSignature,
  };
}

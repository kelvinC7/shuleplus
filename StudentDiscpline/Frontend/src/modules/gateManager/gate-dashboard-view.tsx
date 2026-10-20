'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ClipboardList,
  DoorOpen,
  LogIn,
  LogOut,
  QrCode,
  RefreshCw,
  Tablet,
} from 'lucide-react';
import { GATE_OFFICER_NAV_ITEMS } from '@/config/discipline-nav';
import { GatePageLayout, GateStatCard } from '@/modules/gateManager/gate-page-layout';
import { useGateContext } from '@/modules/gateManager/gate-context';
import { useAuth } from '@/contexts/auth-context';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { GateDashboardData } from '@/types/discipline';
import { toast } from 'sonner';

const FEATURE_ICONS: Record<string, ReactNode> = {
  '/gate': <DoorOpen size={22} />,
  '/gate/mode': <Tablet size={22} />,
  '/gate/scan': <QrCode size={22} />,
  '/gate/checkout': <LogOut size={22} />,
  '/gate/checkin': <LogIn size={22} />,
  '/gate/outside': <DoorOpen size={22} />,
  '/gate/overdue': <AlertTriangle size={22} />,
  '/gate/logs': <ClipboardList size={22} />,
};

export function GateDashboardView() {
  const { selectedGate } = useGateContext();
  const { gateOfficer, isGateOnlyUser } = useAuth();
  const [data, setData] = useState<GateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await disciplineApi.gateDashboard(selectedGate?.id);
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load gate dashboard'));
    } finally {
      setLoading(false);
    }
  }, [selectedGate?.id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => clearInterval(timer);
  }, [load]);

  const stats = data?.stats;

  return (
    <GatePageLayout
      title="Gate Dashboard"
      subtitle={
        isGateOnlyUser && gateOfficer
          ? `Welcome, ${gateOfficer.fullName}. Scan, check-out, and monitor student movement.`
          : 'Monitor student movement in and out of campus.'
      }
      actions={
        <button
          type="button"
          className="rounded-xl bg-[#fcb038] px-3 py-2 text-sm font-semibold text-[#000435]"
          onClick={() => void load()}
        >
          <RefreshCw size={16} className="inline" /> Refresh
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <GateStatCard label="Students Outside" value={loading ? '…' : stats?.studentsOutside ?? 0} hint="Currently off campus" />
        <GateStatCard label="Expected Back Today" value={loading ? '…' : stats?.expectedBackToday ?? 0} />
        <GateStatCard label="Overdue" value={loading ? '…' : stats?.overdue ?? 0} tone="danger" hint="Past expected return time" />
        <GateStatCard label="Checked Out Today" value={loading ? '…' : stats?.checkedOutToday ?? 0} />
        <GateStatCard label="Returned Today" value={loading ? '…' : stats?.returnedToday ?? 0} />
        <GateStatCard label="Pending Exit" value={loading ? '…' : stats?.pendingExit ?? 0} hint="Approved, awaiting checkout" />
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Gate Operations</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GATE_OFFICER_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[108px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#fcb038]/40 hover:bg-[#fcb038]/5 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000435]/5 text-[#000435] transition group-hover:bg-[#fcb038]/20 group-hover:text-[#000435]">
                {FEATURE_ICONS[item.href] ?? <DoorOpen size={22} />}
              </span>
              <div>
                <p className="text-sm font-bold text-[#000435]">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/gate/scan" className="btn-primary">Open Scanner →</Link>
        <Link href="/gate/mode" className="btn-secondary">Gate Mode →</Link>
        {Number(stats?.overdue ?? 0) > 0 ? (
          <Link href="/gate/overdue" className="btn-secondary text-red-600">
            {stats?.overdue} Overdue →
          </Link>
        ) : null}
      </div>
    </GatePageLayout>
  );
}

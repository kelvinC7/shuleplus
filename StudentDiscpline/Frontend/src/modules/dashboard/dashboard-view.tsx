'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  Ticket,
  DoorOpen,
  Award,
} from 'lucide-react';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { DashboardSummary, GateDashboardData } from '@/types/discipline';
import { toast } from 'sonner';

export function DashboardView() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [gateStats, setGateStats] = useState<GateDashboardData['stats'] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, gateRes] = await Promise.all([
        disciplineApi.dashboard(),
        disciplineApi.gateDashboard(),
      ]);
      setSummary(dashRes.data.data);
      setGateStats(gateRes.data.data.stats);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function seedIfEmpty() {
    try {
      await disciplineApi.seedSamples();
      toast.success('Sample cases loaded');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not seed samples'));
    }
  }

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#000435] sm:text-2xl">Discipline Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {summary?.organizationName ? `${summary.organizationName} — ` : ''}
            Overview of cases, permissions & behavior
          </p>
        </div>
        {summary?.totalCases === 0 ? (
          <button type="button" className="btn-secondary" onClick={() => void seedIfEmpty()}>
            Load sample data
          </button>
        ) : null}
      </div>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Discipline Overview</h2>
        <StatsGrid columns={4}>
          <StatCard label="Total Cases" value={loading ? '…' : summary?.totalCases ?? 0} icon={<ShieldAlert size={20} />} onClick={() => router.push('/discipline')} />
          <StatCard label="Open Cases" value={loading ? '…' : summary?.openCases ?? 0} icon={<FolderOpen size={20} />} valueClassName="text-amber-600" onClick={() => router.push('/discipline?status=Open')} />
          <StatCard label="Closed Cases" value={loading ? '…' : summary?.closedCases ?? 0} icon={<CheckCircle size={20} />} valueClassName="text-emerald-600" onClick={() => router.push('/discipline?status=Closed')} />
          <StatCard label="High Severity" value={loading ? '…' : summary?.highSeverityCases ?? 0} icon={<AlertTriangle size={20} />} valueClassName="text-red-600" onClick={() => router.push('/discipline')} hint={`${summary?.casesThisMonth ?? 0} this month`} />
        </StatsGrid>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Quick Access</h2>
        <StatsGrid columns={4}>
          <StatCard label="Permissions" value="→" hint="Manage exit requests" icon={<Ticket size={20} />} onClick={() => router.push('/permissions')} />
          <StatCard label="Gate Management" value={loading ? '…' : gateStats?.studentsOutside ?? 0} hint={`${gateStats?.overdue ?? 0} overdue · ${gateStats?.checkedOutToday ?? 0} out today`} icon={<DoorOpen size={20} />} onClick={() => router.push('/gate')} />
          <StatCard label="Positive Behavior" value="→" hint="Merit awards" icon={<Award size={20} />} onClick={() => router.push('/behavior')} />
          <StatCard label="Reports" value="→" hint="Cases, gate & CSV" icon={<ShieldAlert size={20} />} onClick={() => router.push('/reports')} />
        </StatsGrid>
      </section>
    </div>
  );
}

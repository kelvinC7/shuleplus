'use client';

import Link from 'next/link';
import { CreditCard, LogIn, LogOut, QrCode } from 'lucide-react';
import { useGateContext } from '@/modules/gateManager/gate-context';
import { GateScannerPanel } from '@/modules/gateManager/gate-scanner-panel';
import { useEffect, useState } from 'react';
import { disciplineApi } from '@/services/discipline-api';
import type { GateDashboardData } from '@/types/discipline';

export function GateModeView() {
  const { selectedGate, selectedOfficer, gates, officers, setSelectedGateId, setSelectedOfficerId } = useGateContext();
  const [stats, setStats] = useState<GateDashboardData['stats'] | null>(null);
  const [panel, setPanel] = useState<'scan' | 'checkout' | 'checkin' | null>(null);

  useEffect(() => {
    void disciplineApi.gateDashboard(selectedGate?.id).then((res) => setStats(res.data.data.stats));
    const timer = setInterval(() => {
      void disciplineApi.gateDashboard(selectedGate?.id).then((res) => setStats(res.data.data.stats));
    }, 30000);
    return () => clearInterval(timer);
  }, [selectedGate?.id]);

  if (panel) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <button type="button" className="btn-secondary" onClick={() => setPanel(null)}>← Back to Gate Mode</button>
        <GateScannerPanel mode={panel} onComplete={() => setPanel(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl bg-[#000435] p-6 text-white shadow-2xl sm:p-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#fcb038]">Gate Mode</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">🚪 {selectedGate?.name ?? 'Select Gate'}</h1>
          <p className="mt-1 text-sm text-white/65">{selectedOfficer ? `Officer: ${selectedOfficer.fullName}` : 'No officer selected'}</p>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <select className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm" value={selectedGate?.id ?? ''} onChange={(e) => setSelectedGateId(e.target.value)}>
            {gates.map((g) => <option key={g.id} value={g.id} className="text-[#000435]">{g.name}</option>)}
          </select>
          <select className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm" value={selectedOfficer?.id ?? ''} onChange={(e) => setSelectedOfficerId(e.target.value)}>
            <option value="" className="text-[#000435]">Officer</option>
            {officers.filter((o) => o.status === 'Active').map((o) => <option key={o.id} value={o.id} className="text-[#000435]">{o.fullName}</option>)}
          </select>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button type="button" className="min-h-[100px] rounded-2xl bg-white/10 p-5 text-left transition hover:bg-white/15" onClick={() => setPanel('scan')}>
            <QrCode size={28} className="text-[#fcb038]" />
            <p className="mt-3 text-lg font-bold">Scan QR</p>
          </button>
          <button type="button" className="min-h-[100px] rounded-2xl bg-white/10 p-5 text-left transition hover:bg-white/15" onClick={() => setPanel('scan')}>
            <CreditCard size={28} className="text-[#fcb038]" />
            <p className="mt-3 text-lg font-bold">Scan Card</p>
          </button>
          <button type="button" className="min-h-[100px] rounded-2xl bg-emerald-500/20 p-5 text-left transition hover:bg-emerald-500/30" onClick={() => setPanel('checkout')}>
            <LogOut size={28} className="text-emerald-300" />
            <p className="mt-3 text-lg font-bold">Check Out</p>
          </button>
          <button type="button" className="min-h-[100px] rounded-2xl bg-emerald-500/20 p-5 text-left transition hover:bg-emerald-500/30" onClick={() => setPanel('checkin')}>
            <LogIn size={28} className="text-emerald-300" />
            <p className="mt-3 text-lg font-bold">Check In</p>
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl bg-white/5 p-4 text-center">
          <div>
            <p className="text-3xl font-bold">{stats?.studentsOutside ?? '—'}</p>
            <p className="text-xs text-white/60">Students Outside</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-300">{stats?.overdue ?? '—'}</p>
            <p className="text-xs text-white/60">Overdue</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/gate" className="text-sm text-[#fcb038] underline">Full gate dashboard</Link>
        </div>
      </div>
    </div>
  );
}

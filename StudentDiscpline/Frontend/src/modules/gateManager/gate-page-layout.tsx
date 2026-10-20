'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GATE_OFFICER_NAV_ITEMS } from '@/config/discipline-nav';
import { useAuth } from '@/contexts/auth-context';
import { useGateContext } from '@/modules/gateManager/gate-context';

const GATE_TAB_LABELS: Record<string, string> = {
  '/gate': 'Dashboard',
  '/gate/mode': 'Gate Mode',
  '/gate/scan': 'Scanner',
  '/gate/checkout': 'Check-Out',
  '/gate/checkin': 'Check-In',
  '/gate/outside': 'Currently Outside',
  '/gate/overdue': 'Overdue',
  '/gate/logs': 'Gate Logs',
};

export function GatePageLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { isGateOnlyUser, gateOfficer } = useAuth();
  const { selectedGate, selectedOfficer, gates, officers, setSelectedGateId, setSelectedOfficerId } = useGateContext();

  const gateLinks = isGateOnlyUser
    ? GATE_OFFICER_NAV_ITEMS.map((item) => ({
        href: item.href,
        label: GATE_TAB_LABELS[item.href] ?? item.label,
      }))
    : [
        ...GATE_OFFICER_NAV_ITEMS.map((item) => ({
          href: item.href,
          label: GATE_TAB_LABELS[item.href] ?? item.label,
        })),
        { href: '/gate/officers', label: 'Gate Officers' },
        { href: '/gate/settings', label: 'Settings' },
      ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#000435] px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#fcb038]">Gate Management</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-white/65">{subtitle}</p> : null}
            <p className="mt-3 text-sm text-white/80">
              {selectedGate?.name ?? 'No gate selected'}
              {selectedOfficer ? ` · Gate Officer: ${selectedOfficer.fullName}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none"
              value={selectedGate?.id ?? ''}
              onChange={(e) => setSelectedGateId(e.target.value)}
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id} className="text-[#000435]">{g.name}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none"
              value={selectedOfficer?.id ?? ''}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              disabled={isGateOnlyUser}
            >
              <option value="" className="text-[#000435]">No officer</option>
              {(isGateOnlyUser && gateOfficer ? [gateOfficer] : officers.filter((o) => o.status === 'Active')).map((o) => (
                <option key={o.id} value={o.id} className="text-[#000435]">{o.fullName}</option>
              ))}
            </select>
            {actions}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {gateLinks.map((link) => {
          const active = pathname === link.href || (link.href !== '/gate' && pathname.startsWith(`${link.href}`));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}

export function GateActionButton({
  href,
  onClick,
  tone = 'blue',
  icon,
  label,
  description,
}: {
  href?: string;
  onClick?: () => void;
  tone?: 'blue' | 'green' | 'amber' | 'red';
  icon: ReactNode;
  label: string;
  description?: string;
}) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900',
    green: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900',
    red: 'border-red-200 bg-red-50 hover:bg-red-100 text-red-900',
  };
  const className = `flex min-h-[88px] flex-col justify-center rounded-2xl border p-4 text-left transition ${tones[tone]}`;
  const content = (
    <>
      <div className="mb-2 flex items-center gap-2 text-lg font-bold">{icon} {label}</div>
      {description ? <p className="text-xs opacity-80">{description}</p> : null}
    </>
  );
  if (href) return <Link href={href} className={className}>{content}</Link>;
  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

export function GateStatCard({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'default' | 'danger' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'danger' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone === 'danger' ? 'text-red-700' : 'text-[#000435]'}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

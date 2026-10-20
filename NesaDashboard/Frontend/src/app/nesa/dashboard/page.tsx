'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  FilePlus2,
  School,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ModulePage } from '@/components/ui/module-page';
import { nesaApi, type CircularListItem, type SchoolListItem } from '@/services/nesa-api';

const QUICK = [
  { href: '/nesa/circulars/list', label: 'Circular List', icon: ScrollText },
  { href: '/nesa/circulars/approval', label: 'Pending Review', icon: Bell },
  { href: '/nesa/schools', label: 'Browse Schools', icon: School },
  { href: '/nesa/fee-policy', label: 'Fee Policies', icon: FilePlus2 },
];

export default function NesaDashboardPage() {
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [circulars, setCirculars] = useState<CircularListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, c] = await Promise.all([
          nesaApi.listSchools({ status: 'ACTIVE' }),
          nesaApi.listCirculars({}),
        ]);
        if (!cancelled) {
          setSchools(s.data.data ?? []);
          setCirculars(c.data.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setSchools([]);
          setCirculars([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = circulars.filter((c) => c.status === 'PENDING').length;
  const published = circulars.filter((c) => c.status === 'PUBLISHED').length;
  const rejected = circulars.filter((c) => c.status === 'REJECTED').length;

  const byProvince = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of schools) {
      const key = s.province || 'Unknown';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const max = Math.max(1, ...map.values());
    return [...map.entries()]
      .map(([label, count]) => ({
        label,
        count,
        value: Math.round((count / max) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [schools]);

  const recent = [...circulars]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <ModulePage
      title="National Dashboard"
      subtitle={
        loading
          ? 'Loading live counts from Authentication & Babyeyi…'
          : 'Live overview of registered schools and Babyeyi circulars.'
      }
      actions={
        <Link
          href="/nesa/circulars/list"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-navy transition hover:brightness-105"
        >
          <Sparkles size={16} /> Review circulars
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Registered schools" value={schools.length} />
        <KpiCard label="Circulars tracked" value={circulars.length} />
        <KpiCard label="Pending review" value={pending} delta={rejected ? `${rejected} rejected` : undefined} />
        <KpiCard label="Published" value={published} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="nesa-card flex items-center gap-3 transition hover:border-primary/40 hover:shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/[0.04] text-navy">
              <q.icon size={18} />
            </span>
            <span className="text-sm font-semibold text-navy">{q.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="nesa-card lg:col-span-3">
          <h2 className="mb-4 text-[15px] font-semibold text-navy">Schools by province</h2>
          {byProvince.length === 0 ? (
            <p className="text-sm text-navy/45">No school location data yet.</p>
          ) : (
            <div className="space-y-3">
              {byProvince.map((row) => (
                <div key={row.label} className="grid grid-cols-[120px_1fr_48px] items-center gap-3">
                  <span className="truncate text-[12px] font-semibold text-navy/60">{row.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-navy/[0.06]">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${row.value}%` }} />
                  </div>
                  <span className="text-right text-[12px] font-semibold text-navy">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="nesa-card lg:col-span-2">
          <h2 className="mb-4 text-[15px] font-semibold text-navy">Latest circulars</h2>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-navy/45">No circulars yet.</p>
            ) : (
              recent.map((c) => (
                <Link
                  key={c.id}
                  href={`/nesa/circulars/${c.id}`}
                  className="block rounded-xl border border-navy/8 px-3 py-2.5 transition hover:bg-navy/[0.02]"
                >
                  <p className="text-sm font-semibold text-navy">{c.schoolName}</p>
                  <p className="text-xs text-navy/45">
                    {c.className} · {c.status} · {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </ModulePage>
  );
}

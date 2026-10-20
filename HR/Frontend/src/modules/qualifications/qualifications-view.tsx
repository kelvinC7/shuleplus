'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Check } from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import type { Qualification } from '@/types';

const LEVEL_COLORS: Record<string, string> = {
  A2: 'bg-slate-100 text-slate-700', Diploma: 'bg-sky-100 text-sky-800',
  "Bachelor's": 'bg-amber-100 text-amber-800', "Master's": 'bg-violet-100 text-violet-800',
  PhD: 'bg-red-100 text-red-800', 'Professional Cert': 'bg-emerald-100 text-emerald-800',
};

export function QualificationsView() {
  const toast = useToast();
  const [data, setData] = useState<Qualification[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [levelDist, setLevelDist] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    hrApi.qualifications({ level: filter || undefined, search: search || undefined }).then(({ data: res }) => {
      setData(res.data);
      setStats(res.stats);
      setLevelDist(res.levelDistribution);
    });
  }, [filter, search]);

  async function verify(id: string) {
    try {
      await hrApi.verifyQualification(id);
      const { data: res } = await hrApi.qualifications();
      setData(res.data);
      setStats(res.stats);
      toast.success('Qualification marked as verified.', 'Verified');
    } catch {
      toast.error('Failed to verify qualification.', 'Verification failed');
    }
  }

  const levels = Object.keys(levelDist);

  return (
    <HrPageLayout
      title="Qualifications"
      subtitle="School-wide view of staff academic credentials"
      actions={
        <button type="button" onClick={() => toast.info('Add or edit qualifications from the employee registration wizard.', 'Add qualification')} className="btn-primary">
          <Plus size={16} /> Add qualification
        </button>
      }
      kpis={[
        { label: 'Records', value: stats.records ?? 0 },
        { label: 'Verified', value: stats.verified ?? 0 },
      ]}
    >
      <input className="input max-w-md" placeholder="Search employee or qualification…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {levels.map((level) => (
          <div key={level} className="rounded-xl border border-navy/[0.06] bg-white p-4 text-center shadow-sm">
            <p className={`badge mx-auto ${LEVEL_COLORS[level] ?? 'bg-slate-100'}`}>{level}</p>
            <p className="mt-2 text-2xl font-bold text-navy">{levelDist[level]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter('')} className={`rounded-full px-3 py-1.5 text-xs ${!filter ? 'bg-navy text-white' : 'border border-border bg-white'}`}>All</button>
        {levels.map((l) => (
          <button key={l} type="button" onClick={() => setFilter(l)} className={`rounded-full px-3 py-1.5 text-xs ${filter === l ? 'bg-navy text-white' : 'border border-border bg-white'}`}>{l}</button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Qualification</th>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3">Institution</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((q) => (
              <tr key={q.id} className="border-b border-border/50">
                <td className="px-4 py-3">
                  <p className="font-medium">{q.employeeName}</p>
                  <p className="text-xs text-muted">{q.employeeNumber}</p>
                </td>
                <td className="px-4 py-3"><span className={`badge ${LEVEL_COLORS[q.level] ?? 'bg-slate-100'}`}>{q.level}</span></td>
                <td className="px-4 py-3">{q.field ?? '—'}</td>
                <td className="px-4 py-3">{q.institution ?? '—'}</td>
                <td className="px-4 py-3">{q.year ?? '—'}</td>
                <td className="px-4 py-3">{q.grade ?? '—'}</td>
                <td className="px-4 py-3">
                  {q.verified ? (
                    <span className="flex items-center gap-1 text-green-600"><Check size={14} /> Verified</span>
                  ) : (
                    <button type="button" onClick={() => verify(q.id)} className="text-xs text-ochre hover:underline">Verify</button>
                  )}
                </td>
                <td className="px-4 py-3">
                  {q.employeeId && (
                    <>
                      <Link href={`/directory/${q.employeeId}`} className="text-xs text-ochre hover:underline">View profile</Link>
                      {' · '}
                      <Link href={`/directory/${q.employeeId}/edit`} className="text-xs text-ochre hover:underline">Attach</Link>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HrPageLayout>
  );
}

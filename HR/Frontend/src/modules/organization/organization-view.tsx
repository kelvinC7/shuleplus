'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { hrApi } from '@/services/hr-api';

interface OrgDept {
  id: string;
  type: string;
  name: string;
  headName?: string | null;
  staffCount: number;
  budget?: number | null;
  positions: { title: string; count: number; staff: { id: string; name: string; status: string }[] }[];
}

export function OrganizationView() {
  const [kpis, setKpis] = useState<Record<string, number>>({});
  const [departments, setDepartments] = useState<OrgDept[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    hrApi.organization().then(({ data }) => {
      setKpis(data.kpis);
      setDepartments(data.departments);
      setExpanded(new Set(data.departments.slice(0, 2).map((d: OrgDept) => d.id)));
    });
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = departments.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.positions.some((p) => p.staff.some((s) => s.name.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <HrPageLayout
      title="Organization Structure"
      subtitle="Visualize departments, positions, reporting lines and staff distribution"
      actions={
        <button type="button" className="btn-secondary text-white/90 !border-white/20 !bg-white/10">
          <Download size={16} /> Download Image
        </button>
      }
      kpis={[
        { label: 'Total Staff', value: kpis.totalStaff ?? 0 },
        { label: 'Departments', value: kpis.departments ?? 0 },
        { label: 'Positions', value: kpis.positions ?? 0 },
        { label: 'Management', value: kpis.managementStaff ?? 0 },
        { label: 'Teaching', value: kpis.teachingStaff ?? 0 },
        { label: 'Vacant', value: kpis.vacantPositions ?? 0 },
      ]}
    >
      <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
        <input className="input" placeholder="Search staff, positions, departments…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map((dept) => (
          <div key={dept.id} className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggle(dept.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
            >
              {expanded.has(dept.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-primary font-bold">
                {dept.name[0]}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-navy">{dept.name}</h3>
                <p className="text-xs text-muted">{dept.headName ?? 'No head assigned'} · {dept.staffCount} staff</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted">
                <Users size={14} /> {dept.staffCount}
              </div>
            </button>
            {expanded.has(dept.id) && (
              <div className="border-t border-border bg-slate-50/50 px-5 py-4">
                {dept.positions.map((pos) => (
                  <div key={pos.title} className="mb-4 last:mb-0">
                    <p className="text-sm font-medium text-navy">{pos.title} <span className="text-muted">({pos.count})</span></p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pos.staff.map((s) => (
                        <Link
                          key={s.id}
                          href={`/directory/${s.id}`}
                          className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs transition hover:border-primary/40"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 font-bold text-navy">
                            {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                          {s.name}
                          <StatusBadge status={s.status} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                {dept.positions.length === 0 && <p className="text-sm text-muted">No staff assigned</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </HrPageLayout>
  );
}

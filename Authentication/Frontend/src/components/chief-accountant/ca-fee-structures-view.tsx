'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fetchCaSchoolFeesStructures } from '@/lib/chief-accountant-api';
import { formatRwf } from '@/lib/rep-finance-utils';
import { CaSchoolFeesPageHeader } from '@/components/chief-accountant/ca-school-fees-page-header';
import { CaSchoolFeesToolbar } from '@/components/chief-accountant/ca-school-fees-toolbar';
import { CaSchoolFeesFilters } from '@/components/chief-accountant/ca-school-fees-filters';
import { useCaContext } from '@/components/chief-accountant/ca-context';

export function CaFeeStructuresView() {
  const { orgScope, academicYear, term } = useCaContext();
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesStructures>> | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (orgScope !== 'all') p.organizationId = orgScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    if (className) p.className = className;
    if (search) p.search = search;
    return p;
  }, [orgScope, academicYear, term, className, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCaSchoolFeesStructures(params));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <CaSchoolFeesPageHeader />
      <CaSchoolFeesToolbar
        onRefresh={load}
        refreshing={loading}
        tableFilters={
          <CaSchoolFeesFilters
            className={className}
            onClassNameChange={setClassName}
            search={search}
            onSearchChange={setSearch}
          />
        }
      />

      <div className="space-y-3">
        {(data?.items ?? []).map((s) => {
          const open = openId === s.id;
          return (
            <div key={s.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : s.id)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-slate-50/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{s.name}</p>
                  <p className="text-xs text-muted">
                    {s.code} · {s.academicYear} · {s.term}
                    {s.className ? ` · ${s.className}` : ''}
                    {s.schoolName ? ` · ${s.schoolName}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {s.hasBabyeyiItems ? (
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-900">
                        Babyeyi items
                      </span>
                    ) : null}
                    {s.hasSchoolItems ? (
                      <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-900">
                        School account
                      </span>
                    ) : null}
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {s.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums text-navy">{formatRwf(s.totalAmount)}</p>
                  <p className="text-xs text-muted">{s.itemCount} items · {s.billsGenerated} bills</p>
                </div>
                {open ? <ChevronUp className="h-5 w-5 text-muted" /> : <ChevronDown className="h-5 w-5 text-muted" />}
              </button>
              {open ? (
                <div className="border-t border-border bg-[#f8f9fc] px-4 py-3">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-[10px] uppercase text-muted">
                      <tr>
                        <th className="py-2">Fee item</th>
                        <th className="py-2">Category</th>
                        <th className="py-2">Source</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.items.map((item, idx) => (
                        <tr key={`${s.id}-${idx}`} className="border-t border-border/50">
                          <td className="py-2 font-medium text-navy">{item.name}</td>
                          <td className="py-2 text-muted">{item.category}</td>
                          <td className="py-2">
                            <span className="text-xs font-semibold text-indigo-800">{item.source}</span>
                          </td>
                          <td className="py-2 text-right tabular-nums">{formatRwf(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
        {!loading && !(data?.items?.length ?? 0) ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            No fee structures.
          </p>
        ) : null}
      </div>
    </div>
  );
}

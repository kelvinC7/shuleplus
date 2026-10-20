'use client';

import { useState, useEffect } from 'react';
import { BarChart3, BookOpen, Users, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { libApi } from '@/services/lib-api';

export default function ReportsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await libApi.getReports();
      setData(d);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const overview = data?.overview ?? {};

  return (
    <LibPageLayout
      title="Reports"
      subtitle="Library analytics and reporting"
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="hr-card animate-pulse p-6"><div className="h-20 bg-slate-100 rounded-xl" /></div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy/5 text-navy"><BookOpen size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.totalBooks ?? 0}</p>
                  <p className="text-xs text-muted">Total Books</p>
                </div>
              </div>
            </div>
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><BookOpen size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.totalCopies ?? 0}</p>
                  <p className="text-xs text-muted">Total Copies</p>
                </div>
              </div>
            </div>
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Clock size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.activeLoans ?? 0}</p>
                  <p className="text-xs text-muted">Active Loans</p>
                </div>
              </div>
            </div>
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><AlertTriangle size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.overdueLoans ?? 0}</p>
                  <p className="text-xs text-muted">Overdue</p>
                </div>
              </div>
            </div>
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Clock size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.pendingReservations ?? 0}</p>
                  <p className="text-xs text-muted">Pending Reservations</p>
                </div>
              </div>
            </div>
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600"><Users size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.totalVisits ?? 0}</p>
                  <p className="text-xs text-muted">Library Visits</p>
                </div>
              </div>
            </div>
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><DollarSign size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.pendingRequests ?? 0}</p>
                  <p className="text-xs text-muted">Pending Requests</p>
                </div>
              </div>
            </div>
            <div className="hr-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><BarChart3 size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-navy">{overview.totalDigitalResources ?? 0}</p>
                  <p className="text-xs text-muted">Digital Resources</p>
                </div>
              </div>
            </div>
          </div>

          {data?.loansByStatus?.length > 0 && (
            <div className="hr-card mt-4 p-5">
              <h3 className="mb-4 text-sm font-bold text-navy">Loans by Status</h3>
              <div className="flex flex-wrap gap-3">
                {data.loansByStatus.map((item: any) => (
                  <div key={item.status} className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2">
                    <span className="badge bg-navy/5 text-navy text-[11px] font-bold">{item.status}</span>
                    <span className="text-lg font-bold text-navy">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.topBorrowers?.length > 0 && (
            <div className="hr-card mt-4 p-5">
              <h3 className="mb-4 text-sm font-bold text-navy">Top Borrowers (Last 30 Days)</h3>
              <div className="space-y-2">
                {data.topBorrowers.slice(0, 5).map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-navy">{i + 1}.</span>
                      <span className="text-sm text-navy">{b.borrowerName}</span>
                      <span className="badge bg-navy/5 text-navy text-[10px]">{b.borrowerType}</span>
                    </div>
                    <span className="text-sm font-bold text-navy">{b._count} borrows</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </LibPageLayout>
  );
}

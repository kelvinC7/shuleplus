'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { libApi } from '@/services/lib-api';
import type { Loan } from '@/types';

function getBookTitle(l: Loan) {
  return l.copy?.resource?.title ?? 'Unknown Book';
}

export default function OverdueView() {
  const [overdue, setOverdue] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [returnTarget, setReturnTarget] = useState<Loan | null>(null);
  const [renewTarget, setRenewTarget] = useState<Loan | null>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getOverdue();
      setOverdue(Array.isArray(data) ? data : data.loans ?? []);
    } catch { setOverdue([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = overdue.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getBookTitle(o).toLowerCase().includes(q) || o.borrowerName.toLowerCase().includes(q);
  });

  const handleReturn = async () => {
    if (!returnTarget) return;
    setWorking(true);
    try {
      await libApi.returnBook(returnTarget.id);
      setReturnTarget(null);
      load();
    } catch { /* api */ } finally { setWorking(false); }
  };

  const handleRenew = async () => {
    if (!renewTarget) return;
    setWorking(true);
    try {
      await libApi.renewBook(renewTarget.id);
      setRenewTarget(null);
      load();
    } catch { /* api */ } finally { setWorking(false); }
  };

  return (
    <LibPageLayout
      title="Overdue Books"
      subtitle="Books past their due date"
      kpis={[{ label: 'Overdue Books', value: overdue.length, icon: <AlertTriangle size={20} /> }]}
      toolbar={
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search overdue..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      }
    >
      <ConfirmDialog
        open={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleReturn}
        title="Return Book"
        message={`Return "${returnTarget ? getBookTitle(returnTarget) : ''}"?`}
        confirmLabel="Return"
        variant="default"
        loading={working}
      />
      <ConfirmDialog
        open={Boolean(renewTarget)}
        onClose={() => setRenewTarget(null)}
        onConfirm={handleRenew}
        title="Renew Loan"
        message={`Extend due date for "${renewTarget ? getBookTitle(renewTarget) : ''}"?`}
        confirmLabel="Renew"
        variant="default"
        loading={working}
      />

      <LibDataTable
        data={filtered}
        rowKey={(o) => o.id}
        loading={loading}
        emptyMessage="No overdue books — all returned on time!"
        onView={(o) => setReturnTarget(o)}
        onEdit={(o) => setRenewTarget(o)}
        columns={[
          { key: 'book', header: 'Book', render: (o) => <span className="font-semibold text-navy">{getBookTitle(o)}</span> },
          {
            key: 'borrower',
            header: 'Borrower',
            render: (o) => (
              <span>
                <span className="text-navy">{o.borrowerName}</span>
                <span className="ml-1.5 badge bg-navy/5 text-navy text-[10px]">{o.borrowerType}</span>
              </span>
            ),
          },
          { key: 'due', header: 'Due Date', className: 'hidden sm:table-cell', render: (o) => <span className="font-semibold text-danger">{new Date(o.dueDate).toLocaleDateString()}</span> },
          {
            key: 'days',
            header: 'Days Overdue',
            className: 'hidden sm:table-cell',
            render: (o) => {
              const days = Math.max(0, Math.ceil((Date.now() - new Date(o.dueDate).getTime()) / 86400000));
              return <span className="badge bg-red-50 text-danger text-[11px] font-bold">{days} day{days !== 1 ? 's' : ''}</span>;
            },
          },
        ]}
      />
      <p className="mt-3 text-xs text-muted">View = Return book · Edit = Renew loan</p>
    </LibPageLayout>
  );
}

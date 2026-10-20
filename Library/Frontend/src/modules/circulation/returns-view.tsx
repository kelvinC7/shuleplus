'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { LibModal } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';
import type { Loan } from '@/types';

function getBookTitle(l: Loan) {
  return l.copy?.resource?.title ?? 'Unknown Book';
}

export default function ReturnsView() {
  const [returns, setReturns] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<Loan | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getLoans('status=RETURNED');
      setReturns(Array.isArray(data) ? data : (data as { loans?: Loan[] }).loans ?? []);
    } catch { setReturns([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = returns.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getBookTitle(r).toLowerCase().includes(q) || r.borrowerName.toLowerCase().includes(q);
  });

  return (
    <LibPageLayout
      title="Returns"
      subtitle="Track returned books and return history"
      kpis={[
        { label: 'Returned Today', value: returns.filter((r) => r.returnDate && new Date(r.returnDate).toDateString() === new Date().toDateString()).length, icon: <RotateCcw size={20} /> },
        { label: 'Total Returns', value: returns.length, icon: <RotateCcw size={20} /> },
      ]}
      toolbar={
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search by book or borrower..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      }
    >
      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Return Details" size="md">
        {viewing && (
          <div className="space-y-2 text-sm">
            <p><span className="font-bold text-muted">Book:</span> {getBookTitle(viewing)}</p>
            <p><span className="font-bold text-muted">Borrower:</span> {viewing.borrowerName} ({viewing.borrowerType})</p>
            <p><span className="font-bold text-muted">Issued:</span> {new Date(viewing.loanDate).toLocaleString()}</p>
            <p><span className="font-bold text-muted">Returned:</span> {viewing.returnDate ? new Date(viewing.returnDate).toLocaleString() : '—'}</p>
            <StatusBadge status={viewing.status} />
          </div>
        )}
      </LibModal>

      <LibDataTable
        data={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No returns found"
        onView={setViewing}
        columns={[
          { key: 'book', header: 'Book', render: (r) => <span className="font-semibold text-navy">{getBookTitle(r)}</span> },
          { key: 'borrower', header: 'Borrower', render: (r) => <span className="text-navy">{r.borrowerName}</span> },
          { key: 'issued', header: 'Issued', className: 'hidden sm:table-cell', render: (r) => <span className="text-muted">{new Date(r.loanDate).toLocaleDateString()}</span> },
          { key: 'returned', header: 'Returned', className: 'hidden sm:table-cell', render: (r) => <span className="text-muted">{r.returnDate ? new Date(r.returnDate).toLocaleDateString() : '—'}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </LibPageLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Package, Search } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { LibModal, FormField } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';
import type { BookCopy } from '@/types';

function getBookTitle(c: BookCopy) {
  return c.resource?.title ?? 'Unknown';
}

export default function StockView() {
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<BookCopy | null>(null);
  const [statusModal, setStatusModal] = useState<BookCopy | null>(null);
  const [newStatus, setNewStatus] = useState('AVAILABLE');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getInventory();
      setCopies(Array.isArray(data) ? data : data.copies ?? []);
    } catch { setCopies([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const stats = {
    total: copies.length,
    available: copies.filter((c) => c.status === 'AVAILABLE').length,
    borrowed: copies.filter((c) => c.status === 'BORROWED').length,
    damaged: copies.filter((c) => c.status === 'DAMAGED').length,
  };

  const filtered = copies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.barcode.toLowerCase().includes(q) || getBookTitle(c).toLowerCase().includes(q);
  });

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal) return;
    setSaving(true);
    try {
      await libApi.updateCopyStatus(statusModal.id, { status: newStatus });
      setStatusModal(null);
      load();
    } catch { /* api */ } finally { setSaving(false); }
  };

  return (
    <LibPageLayout
      title="Stock"
      subtitle="Complete inventory of all book copies"
      kpis={[
        { label: 'Total Copies', value: stats.total, icon: <Package size={20} /> },
        { label: 'Available', value: stats.available, icon: <Package size={20} /> },
        { label: 'Borrowed', value: stats.borrowed, icon: <Package size={20} /> },
        { label: 'Damaged', value: stats.damaged, icon: <Package size={20} /> },
      ]}
      toolbar={
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search by barcode or title..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      }
    >
      <LibModal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Copy Details" size="md">
        {viewing && (
          <div className="space-y-3 text-sm">
            <p><span className="font-bold text-muted">Barcode:</span> <span className="font-mono text-navy">{viewing.barcode}</span></p>
            <p><span className="font-bold text-muted">Library ID:</span> <span className="font-mono text-navy">{viewing.libraryId}</span></p>
            <p><span className="font-bold text-muted">Title:</span> {getBookTitle(viewing)}</p>
            <p><span className="font-bold text-muted">Condition:</span> {viewing.condition ?? 'Good'}</p>
            <StatusBadge status={viewing.status} />
          </div>
        )}
      </LibModal>

      <LibModal open={Boolean(statusModal)} onClose={() => setStatusModal(null)} title="Update Copy Status" size="sm">
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <FormField label="Status">
            <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {['AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST', 'RESERVED', 'UNDER_REPAIR'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setStatusModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Update'}</button>
          </div>
        </form>
      </LibModal>

      <LibDataTable
        data={filtered}
        rowKey={(c) => c.id}
        loading={loading}
        emptyMessage="No copies found"
        onView={setViewing}
        onEdit={(c) => { setStatusModal(c); setNewStatus(c.status); }}
        columns={[
          { key: 'barcode', header: 'Barcode', render: (c) => <span className="font-mono text-xs font-semibold text-navy">{c.barcode}</span> },
          { key: 'title', header: 'Title', render: (c) => <span className="font-semibold text-navy">{getBookTitle(c)}</span> },
          { key: 'condition', header: 'Condition', className: 'hidden sm:table-cell', render: (c) => <span className="badge bg-slate-100 text-slate-600">{c.condition ?? 'Good'}</span> },
          { key: 'libraryId', header: 'Library ID', className: 'hidden md:table-cell', render: (c) => <span className="font-mono text-xs text-muted">{c.libraryId}</span> },
          { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
        ]}
      />
    </LibPageLayout>
  );
}

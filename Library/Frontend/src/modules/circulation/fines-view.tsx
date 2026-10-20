'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, AlertCircle, Search } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { libApi } from '@/services/lib-api';
import type { Fine, Loan, PaginationMeta } from '@/types';

export default function FinesView() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ pendingCount: 0, pendingAmount: 0, paidAmount: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [form, setForm] = useState({ loanId: '', amount: '', reason: 'OVERDUE', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [payTarget, setPayTarget] = useState<Fine | null>(null);
  const [waiveTarget, setWaiveTarget] = useState<Fine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fine | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const data = await libApi.getFines(params.toString());
      setFines(data.fines ?? []);
      setMeta(data.pagination ?? { page, pageSize: 20, total: 0, totalPages: 0 });
      setStats(data.stats ?? { pendingCount: 0, pendingAmount: 0, paidAmount: 0 });
    } catch {
      setFines([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = async () => {
    setError('');
    setForm({ loanId: '', amount: '', reason: 'OVERDUE', notes: '' });
    setModalOpen(true);
    try {
      const data = await libApi.getLoans('status=ACTIVE');
      setLoans(Array.isArray(data) ? data : (data as { loans?: Loan[] }).loans ?? []);
    } catch {
      setLoans([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await libApi.createFine({
        loanId: form.loanId,
        amount: Number(form.amount),
        reason: form.reason,
        notes: form.notes || undefined,
      });
      setModalOpen(false);
      load(meta.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create fine');
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    if (!payTarget) return;
    setWorking(true);
    try {
      await libApi.payFine(payTarget.id);
      setPayTarget(null);
      load(meta.page);
    } catch { /* api */ } finally { setWorking(false); }
  };

  const handleWaive = async () => {
    if (!waiveTarget) return;
    setWorking(true);
    try {
      await libApi.waiveFine(waiveTarget.id);
      setWaiveTarget(null);
      load(meta.page);
    } catch { /* api */ } finally { setWorking(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setWorking(true);
    try {
      await libApi.deleteFine(deleteTarget.id);
      setDeleteTarget(null);
      load(meta.page);
    } catch { /* api */ } finally { setWorking(false); }
  };

  return (
    <LibPageLayout
      title="Fines"
      subtitle="Manage library fines for overdue, damaged, or lost books"
      actions={
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Record Fine
        </button>
      }
      kpis={[
        { label: 'Pending Fines', value: stats.pendingCount, icon: <DollarSign size={20} /> },
        { label: 'Pending Amount', value: `${stats.pendingAmount.toLocaleString()} RWF`, icon: <DollarSign size={20} /> },
        { label: 'Collected', value: `${stats.paidAmount.toLocaleString()} RWF`, icon: <DollarSign size={20} /> },
      ]}
      toolbar={
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search by borrower…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      }
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Fine" subtitle="Create a fine for an active or overdue loan">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <FormField label="Loan" required>
            <select className="input" value={form.loanId} onChange={(e) => setForm((p) => ({ ...p, loanId: e.target.value }))} required>
              <option value="">Select loan</option>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.borrowerName} — {l.copy?.resource?.title ?? 'Book'} ({l.status})
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount (RWF)" required>
              <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
            </FormField>
            <FormField label="Reason" required>
              <select className="input" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}>
                <option value="OVERDUE">Overdue</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
              </select>
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Record Fine'}</button>
          </div>
        </form>
      </LibModal>

      <ConfirmDialog open={Boolean(payTarget)} onClose={() => setPayTarget(null)} onConfirm={handlePay} title="Mark as Paid" message={`Mark fine of ${payTarget?.amount} RWF as paid?`} confirmLabel="Mark Paid" variant="default" loading={working} />
      <ConfirmDialog open={Boolean(waiveTarget)} onClose={() => setWaiveTarget(null)} onConfirm={handleWaive} title="Waive Fine" message="Waive this fine?" confirmLabel="Waive" variant="default" loading={working} />
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Fine" message="Delete this fine record?" confirmLabel="Delete" loading={working} />

      <LibDataTable
        data={fines}
        rowKey={(f) => f.id}
        loading={loading}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={meta.pageSize}
        onPageChange={load}
        emptyMessage="No fines recorded"
        onEdit={(f) => f.status === 'PENDING' && setPayTarget(f)}
        onDelete={(f) => f.status === 'PENDING' && setDeleteTarget(f)}
        onView={(f) => f.status === 'PENDING' && setWaiveTarget(f)}
        columns={[
          {
            key: 'borrower',
            header: 'Borrower',
            render: (f) => (
              <span>
                <span className="font-semibold text-navy">{f.loan?.borrowerName ?? f.borrowerId.slice(0, 8)}</span>
                <span className="ml-1.5 badge bg-navy/5 text-navy text-[10px]">{f.borrowerType}</span>
              </span>
            ),
          },
          {
            key: 'book',
            header: 'Book',
            className: 'hidden sm:table-cell',
            render: (f) => <span className="text-navy">{f.loan?.copy?.resource?.title ?? '—'}</span>,
          },
          { key: 'amount', header: 'Amount', render: (f) => <span className="font-semibold text-navy">{Number(f.amount).toLocaleString()} RWF</span> },
          { key: 'reason', header: 'Reason', className: 'hidden md:table-cell', render: (f) => <span className="badge bg-slate-100 text-slate-600">{f.reason}</span> },
          { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
          { key: 'date', header: 'Date', className: 'hidden md:table-cell', render: (f) => <span className="text-muted">{new Date(f.createdAt).toLocaleDateString()}</span> },
        ]}
      />
      <p className="mt-3 text-xs text-muted">View = Waive · Edit = Mark paid · Delete = Remove (pending only)</p>
    </LibPageLayout>
  );
}

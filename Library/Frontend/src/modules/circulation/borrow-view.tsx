'use client';

import { useState, useEffect } from 'react';
import { BookCopy, AlertCircle } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { LibModal, FormField } from '@/components/lib-modal';
import { LibDataTable } from '@/components/lib-data-table';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { BorrowerPicker, type BorrowerSelection } from '@/components/borrower-picker';
import { BookCopyPicker, type BookCopySelection } from '@/components/book-search-picker';
import { libApi } from '@/services/lib-api';
import type { Loan } from '@/types';

function getBookTitle(l: Loan) {
  return l.copy?.resource?.title ?? 'Unknown Book';
}

export default function BorrowView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [borrowerType, setBorrowerType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [borrower, setBorrower] = useState<BorrowerSelection | null>(null);
  const [copy, setCopy] = useState<BookCopySelection | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [returnTarget, setReturnTarget] = useState<Loan | null>(null);
  const [returning, setReturning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libApi.getLoans('status=ACTIVE');
      setLoans(Array.isArray(data) ? data : (data as { loans?: Loan[] }).loans ?? []);
    } catch { setLoans([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setBorrowerType('STUDENT');
    setBorrower(null);
    setCopy(null);
    setDueDate('');
    setNotes('');
    setIssuedBy('');
    setError('');
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copy || !borrower) {
      setError('Select a book copy and borrower');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await libApi.borrowBook({
        copyId: copy.id,
        borrowerType: borrower.type,
        borrowerId: borrower.id,
        borrowerName: borrower.name,
        borrowerClass: borrower.className,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        issuedBy: issuedBy || undefined,
      });
      setModalOpen(false);
      resetForm();
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to issue book');
    } finally { setSaving(false); }
  };

  const handleReturn = async () => {
    if (!returnTarget) return;
    setReturning(true);
    try {
      await libApi.returnBook(returnTarget.id);
      setReturnTarget(null);
      load();
    } catch { /* api */ } finally { setReturning(false); }
  };

  return (
    <LibPageLayout
      title="Issue Book"
      subtitle="Issue books to students and teachers"
      actions={
        <button onClick={() => { resetForm(); setModalOpen(true); }} className="btn-primary">
          <BookCopy size={16} /> Issue Book
        </button>
      }
      kpis={[{ label: 'Active Loans', value: loans.length, icon: <BookCopy size={20} /> }]}
    >
      <LibModal open={modalOpen} onClose={() => setModalOpen(false)} title="Issue Book" subtitle="Search for an available copy and select a borrower" size="lg">
        <form onSubmit={handleBorrow} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <BookCopyPicker value={copy} onChange={setCopy} />
          <BorrowerPicker
            borrowerType={borrowerType}
            onTypeChange={setBorrowerType}
            value={borrower}
            onChange={setBorrower}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Due Date">
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
            <FormField label="Issued By">
              <input className="input" value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} placeholder="Librarian name" />
            </FormField>
          </div>
          <FormField label="Notes">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !copy || !borrower} className="btn-primary">
              {saving ? 'Processing…' : 'Issue Book'}
            </button>
          </div>
        </form>
      </LibModal>

      <ConfirmDialog
        open={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleReturn}
        title="Return Book"
        message={`Return "${returnTarget ? getBookTitle(returnTarget) : ''}"?`}
        confirmLabel="Return"
        variant="default"
        loading={returning}
      />

      <LibDataTable
        data={loans}
        rowKey={(l) => l.id}
        loading={loading}
        emptyMessage="No active loans"
        onView={(l) => setReturnTarget(l)}
        columns={[
          { key: 'book', header: 'Book', render: (l) => <span className="font-semibold text-navy">{getBookTitle(l)}</span> },
          { key: 'barcode', header: 'Barcode', className: 'hidden sm:table-cell', render: (l) => <span className="font-mono text-xs text-muted">{l.copy?.barcode ?? '—'}</span> },
          {
            key: 'borrower',
            header: 'Borrower',
            render: (l) => (
              <span>
                <span className="text-navy">{l.borrowerName}</span>
                <span className="ml-1.5 badge bg-navy/5 text-navy text-[10px]">{l.borrowerType}</span>
              </span>
            ),
          },
          { key: 'issued', header: 'Issued', className: 'hidden md:table-cell', render: (l) => <span className="text-muted">{new Date(l.loanDate).toLocaleDateString()}</span> },
          {
            key: 'due',
            header: 'Due',
            className: 'hidden md:table-cell',
            render: (l) => (
              <span className={new Date(l.dueDate) < new Date() ? 'font-semibold text-danger' : 'text-navy'}>
                {new Date(l.dueDate).toLocaleDateString()}
              </span>
            ),
          },
          { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
        ]}
      />
      <p className="mt-3 text-xs text-muted">View = Return book</p>
    </LibPageLayout>
  );
}

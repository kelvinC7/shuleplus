'use client';

import { useEffect, useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillStudentId?: string;
  prefillStudentName?: string;
};

const FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'] as const;

export function CreateInstallmentModal({ open, onClose, onCreated, prefillStudentId, prefillStudentName }: Props) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    className: '',
    frequency: 'MONTHLY' as (typeof FREQUENCIES)[number],
    totalAmount: 180000,
    count: 4,
    flexible: false,
    amounts: ['45000', '45000', '45000', '45000'],
  });

  useEffect(() => {
    if (!open) return;
    setForm((f) => {
      const n = Math.max(1, Math.min(24, f.count));
      const each = Math.floor(f.totalAmount / n);
      const remainder = f.totalAmount - each * n;
      const amounts =
        f.amounts.length === n
          ? f.amounts
          : Array.from({ length: n }, (_, i) => String(i === n - 1 ? each + remainder : each));
      return {
        ...f,
        studentId: prefillStudentId ?? f.studentId,
        studentName: prefillStudentName ?? f.studentName,
        amounts,
      };
    });
  }, [open, form.count, prefillStudentId, prefillStudentName]);

  function generateEqual() {
    const n = form.count;
    const each = Math.floor(form.totalAmount / n);
    const remainder = form.totalAmount - each * n;
    const amounts = Array.from({ length: n }, (_, i) => String(i === n - 1 ? each + remainder : each));
    setForm((f) => ({ ...f, amounts }));
  }

  async function save() {
    const sum = form.amounts.reduce((s, a) => s + Number(a), 0);
    if (Math.abs(sum - form.totalAmount) > 0.01) {
      toast.error(`Installments (${sum}) must equal total (${form.totalAmount})`);
      return;
    }
    if (!form.studentId.trim() || !form.studentName.trim()) {
      toast.error('Student ID and name are required');
      return;
    }
    setSaving(true);
    try {
      const start = new Date();
      const gapDays = form.frequency === 'WEEKLY' ? 7 : form.frequency === 'BIWEEKLY' ? 14 : 30;
      const installments = form.amounts.map((amount, idx) => {
        const due = new Date(start);
        due.setDate(due.getDate() + gapDays * (idx + 1));
        return { dueDate: due.toISOString(), amount: Number(amount) };
      });
      await api.post('/installments/plans', {
        studentId: form.studentId.trim(),
        studentName: form.studentName.trim(),
        className: form.className.trim() || undefined,
        frequency: form.frequency,
        totalAmount: form.totalAmount,
        installments,
      });
      onCreated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not create plan');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-navy">Smart Installment Generator</h3>
            <p className="text-sm text-muted">Auto-split balance into trackable payment dates</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block text-sm">
            <span className="text-muted">Student name</span>
            <input className="input mt-1 w-full" value={form.studentName} onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Student code / ID</span>
            <input className="input mt-1 w-full" value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Class</span>
            <input className="input mt-1 w-full" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Total remaining balance (RWF)</span>
            <input
              type="number"
              className="input mt-1 w-full"
              value={form.totalAmount}
              onChange={(e) => setForm((f) => ({ ...f, totalAmount: Number(e.target.value) }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted">Frequency</span>
              <select className="input mt-1 w-full" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as typeof f.frequency }))}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.replace('_', '-')}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted"># Installments</span>
              <input
                type="number"
                min={1}
                max={24}
                className="input mt-1 w-full"
                value={form.count}
                onChange={(e) => setForm((f) => ({ ...f, count: Number(e.target.value) }))}
              />
            </label>
          </div>
          <button type="button" className="btn-secondary w-full text-sm" onClick={generateEqual}>
            <Wand2 size={14} /> Generate equal installments
          </button>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted">Installment amounts</p>
            {form.amounts.map((amt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-24 text-sm text-muted">Installment {idx + 1}</span>
                <input
                  type="number"
                  className="input flex-1"
                  value={amt}
                  onChange={(e) => {
                    const amounts = [...form.amounts];
                    amounts[idx] = e.target.value;
                    setForm((f) => ({ ...f, amounts }));
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            Sum: {form.amounts.reduce((s, a) => s + Number(a || 0), 0).toLocaleString()} RWF · Target:{' '}
            {form.totalAmount.toLocaleString()} RWF
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Creating…' : 'Create plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

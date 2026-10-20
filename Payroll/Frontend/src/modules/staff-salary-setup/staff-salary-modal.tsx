'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, Settings2, X } from 'lucide-react';
import { FormField } from '@/components/payroll-step-wizard';
import { formatRwf } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';

interface StaffOption {
  id: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  basicSalary: number;
}

interface Props {
  open: boolean;
  staffId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#000435] shadow-[0_1px_2px_rgba(0,4,53,0.03)] outline-none transition focus:border-[#FCB038]/50 focus:ring-2 focus:ring-[#FCB038]/15';

export function StaffSalaryModal({ open, staffId, onClose, onSaved }: Props) {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(staffId);
  const [form, setForm] = useState({
    basicSalary: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    othersAllowance: 0,
    mealAllowance: 0,
  });
  const [calc, setCalc] = useState<Record<string, number> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    payrollApi.listStaff().then(({ data }) => setStaff(data.data));
    setSelectedId(staffId);
  }, [open, staffId]);

  useEffect(() => {
    if (!open || !selectedId) return;
    payrollApi.getStaffProfile(selectedId).then(({ data }) => {
      const p = data.data.staff.profile;
      setForm({
        basicSalary: p ? Number(p.basicSalary) : data.data.staff.basicSalary,
        transportAllowance: p ? Number(p.transportAllowance) : 0,
        housingAllowance: p ? Number(p.housingAllowance) : 0,
        othersAllowance: p ? Number(p.othersAllowance) : 0,
        mealAllowance: p ? Number(p.mealAllowance) : 0,
      });
      setCalc(data.data.calc);
    });
  }, [open, selectedId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { data } = await payrollApi.saveStaffProfile(selectedId, form);
      setCalc(data.data.calc);
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open || typeof document === 'undefined') return null;

  const selected = staff.find((s) => s.id === selectedId);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000435]/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_24px_64px_-16px_rgba(0,4,53,0.45)]">
        <div className="shrink-0 bg-[#000435] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">Salary Setup</p>
              <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">Configure Staff Package</h2>
              <p className="mt-1 text-xs text-white/60">Set basic salary and allowances with live calculation preview.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-5">
            <FormField label="Staff Member" required>
              <select
                className={fieldClass}
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                <option value="">Select staff member</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} · {s.employeeNumber}
                  </option>
                ))}
              </select>
            </FormField>

            {selected ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-xs">
                <p className="font-bold text-navy">{selected.fullName}</p>
                <p className="text-muted">{selected.department}</p>
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-[#FCB038]" />
                <h3 className="text-sm font-bold text-navy">Salary Package</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['basicSalary', 'transportAllowance', 'housingAllowance', 'othersAllowance', 'mealAllowance'] as const).map(
                  (field) => (
                    <FormField key={field} label={field.replace(/([A-Z])/g, ' $1').trim()} required={field === 'basicSalary'}>
                      <input
                        type="number"
                        className={fieldClass}
                        value={form[field]}
                        onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                      />
                    </FormField>
                  )
                )}
              </div>
            </section>

            {calc ? (
              <section className="rounded-2xl border border-[#FCB038]/25 bg-[#FCB038]/5 p-4 sm:p-5">
                <h3 className="text-sm font-bold text-navy">Calculated Preview</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Gross', value: calc.gross },
                    { label: 'PAYE', value: calc.paye },
                    { label: 'RSSB (Emp)', value: calc.rssbEmployee },
                    { label: 'Net Payable', value: calc.finalPayable },
                  ].map((k) => (
                    <div key={k.label} className="rounded-xl border border-white bg-white px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase text-muted">{k.label}</p>
                      <p className="mt-1 text-sm font-bold text-navy">{formatRwf(k.value)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn-secondary">
            <X size={16} /> Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!selectedId || saving}
            className="btn-primary disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'Saving…' : 'Save Package'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

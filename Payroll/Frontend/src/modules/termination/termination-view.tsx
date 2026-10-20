'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { formatRwf, statusColor } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';

interface TermRow {
  id: string; status: string; terminationDate: string; yearsWorked: number;
  severanceAmount: number; outstandingDeductions: number; totalPayable: number;
  staff: { firstName: string; lastName: string; employeeNumber: string };
}

export function TerminationView() {
  const [items, setItems] = useState<TermRow[]>([]);
  const [staff, setStaff] = useState<{ id: string; fullName: string }[]>([]);
  const [form, setForm] = useState({ staffId: '', terminationDate: '', yearsWorked: 3, reason: '' });
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [t, s] = await Promise.all([payrollApi.listTerminations(), payrollApi.listStaff()]);
    setItems(t.data.data);
    setStaff(s.data.data.map((x: { id: string; fullName: string }) => ({ id: x.id, fullName: x.fullName })));
  }

  useEffect(() => { load(); }, []);

  async function create() {
    await payrollApi.createTermination(form);
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await payrollApi.updateTerminationStatus(id, status);
    load();
  }

  return (
    <PayrollPageLayout
      title="Termination Benefits"
      subtitle="Severance calculation and settlement workflow for departing staff"
      actions={<button type="button" onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> New Termination</button>}
      kpis={[{ label: 'Records', value: items.length }, { label: 'Pending', value: items.filter((i) => ['DRAFT', 'SUBMITTED'].includes(i.status)).length }]}
    >
      {showForm && (
        <div className="rounded-2xl border border-amber/30 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">New Termination Record</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-muted">Staff</label>
              <select className="input" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                <option value="">Select…</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-muted">Termination Date</label>
              <input type="date" className="input" value={form.terminationDate} onChange={(e) => setForm({ ...form, terminationDate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-muted">Years Worked</label>
              <input type="number" className="input" value={form.yearsWorked} onChange={(e) => setForm({ ...form, yearsWorked: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-muted">Reason</label>
              <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={create} className="btn-primary">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Years</th>
              <th className="px-4 py-3">Severance</th>
              <th className="px-4 py-3">Payable</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{t.staff.firstName} {t.staff.lastName}<br /><span className="text-xs text-muted">{t.staff.employeeNumber}</span></td>
                <td className="px-4 py-3">{new Date(t.terminationDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">{t.yearsWorked}</td>
                <td className="px-4 py-3">{formatRwf(t.severanceAmount)}</td>
                <td className="px-4 py-3 font-semibold">{formatRwf(t.totalPayable)}</td>
                <td className="px-4 py-3"><span className={`badge ${statusColor(t.status)}`}>{t.status}</span></td>
                <td className="px-4 py-3">
                  {t.status === 'DRAFT' && <button type="button" onClick={() => updateStatus(t.id, 'SUBMITTED')} className="text-xs font-semibold text-amber-700">Submit</button>}
                  {t.status === 'SUBMITTED' && <button type="button" onClick={() => updateStatus(t.id, 'APPROVED')} className="text-xs font-semibold text-emerald-700">Approve</button>}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No termination records</td></tr>}
          </tbody>
        </table>
      </div>
    </PayrollPageLayout>
  );
}

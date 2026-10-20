'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { ContractRow, Employee } from '@/types';

export function ContractsView() {
  const toast = useToast();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [stats, setStats] = useState({ total: 0, expiring: 0, expired: 0 });
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ employeeId: '', contractType: 'PERMANENT', position: '', hireDate: '', contractEnd: '', ongoingContract: false, basicSalary: '' });

  useEffect(() => {
    hrApi.contracts().then(({ data }) => {
      setContracts(data.data);
      setStats(data.stats);
    });
  }, []);

  async function openModal() {
    const { data } = await hrApi.directory({ limit: '100' });
    setEmployees(data.data);
    setShowModal(true);
  }

  async function saveContract() {
    try {
      await hrApi.updateEmployee(form.employeeId, {
        contractType: form.contractType,
        position: form.position,
        hireDate: form.hireDate,
        contractEnd: form.ongoingContract ? null : form.contractEnd || null,
        ongoingContract: form.ongoingContract,
        basicSalary: form.basicSalary ? Number(form.basicSalary) : null,
      });
      setShowModal(false);
      const { data } = await hrApi.contracts();
      setContracts(data.data);
      setStats(data.stats);
      toast.success('Contract saved successfully.', 'Contract saved');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save contract.'), 'Save failed');
    }
  }

  const filtered = filter ? contracts.filter((c) => c.contractType === filter) : contracts;
  const expiring = contracts.filter((c) => c.status === 'Expiring');
  const expired = contracts.filter((c) => c.status === 'Expired');

  return (
    <HrPageLayout
      title="Employment Contracts"
      subtitle="Track contract lifecycle, dates, salary and expiry status"
      actions={<button type="button" onClick={openModal} className="btn-primary"><Plus size={16} /> New contract</button>}
      kpis={[
        { label: 'Contracts', value: stats.total },
        { label: 'Expiring', value: stats.expiring },
        { label: 'Expired', value: stats.expired },
      ]}
    >
      {(expiring.length > 0 || expired.length > 0) && (
        <div className="space-y-2">
          {expiring.slice(0, 4).map((c) => (
            <div key={c.contractId} className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Contract expiring: {c.employeeName} — {c.daysLeft} days left
            </div>
          ))}
          {expired.slice(0, 4).map((c) => (
            <div key={c.contractId} className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              Contract expired: {c.employeeName}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['', 'PERMANENT', 'CONTRACT', 'TEMPORARY', 'PROBATION', 'INTERNSHIP', 'PART_TIME', 'CONSULTANCY'].map((t) => (
          <button
            key={t || 'all'}
            type="button"
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === t ? 'bg-navy text-white' : 'bg-white border border-border text-muted'}`}
          >
            {t ? t.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Contract ID</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Start / End</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.contractId} className="border-b border-border/50 hover:bg-slate-50/50">
                <td className="px-4 py-3 font-mono text-xs">{c.contractId}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{c.employeeName}</p>
                  <p className="text-xs text-muted">{c.employeeNumber}</p>
                </td>
                <td className="px-4 py-3"><StatusBadge status={c.contractType} /></td>
                <td className="px-4 py-3">{c.position}</td>
                <td className="px-4 py-3 text-xs">
                  {new Date(c.startDate).toLocaleDateString()} →{' '}
                  {c.ongoingContract ? 'Permanent' : c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}
                  {c.daysLeft != null && c.daysLeft > 0 && <span className="text-amber-600"> ({c.daysLeft}d left)</span>}
                </td>
                <td className="px-4 py-3">{c.basicSalary ? `${c.basicSalary.toLocaleString()} RWF` : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3">
                  <Link href={`/directory/${c.employeeId}`} className="text-xs text-ochre hover:underline">View</Link>
                  {' · '}
                  <Link href={`/directory/${c.employeeId}/edit`} className="text-xs text-ochre hover:underline">Renew</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">Create New Contract</h2>
            <div className="mt-4 space-y-3">
              <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
              <select className="input" value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                {['PERMANENT', 'TEMPORARY', 'PROBATION', 'INTERNSHIP', 'PART_TIME', 'CONSULTANCY'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <input className="input" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              <input type="date" className="input" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              <input type="number" className="input" placeholder="Salary (RWF)" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.ongoingContract} onChange={(e) => setForm({ ...form, ongoingContract: e.target.checked })} />
                No end date (permanent)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={saveContract} className="btn-primary">Save contract</button>
            </div>
          </div>
        </div>
      )}
    </HrPageLayout>
  );
}

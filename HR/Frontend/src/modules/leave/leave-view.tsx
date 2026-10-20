'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Check, X, Eye } from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { Employee, LeaveRequest } from '@/types';

export function LeaveView() {
  const toast = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tab, setTab] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employeeId: '', leaveType: 'Annual Leave', startDate: '', endDate: '', reason: '' });
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data } = await hrApi.leave({ status: tab || undefined });
    setRequests(data.data);
    setStats(data.stats);
  }, [tab]);

  useEffect(() => { load(); hrApi.constants().then(({ data }) => setLeaveTypes(data.data.leaveTypes)); }, [load]);

  async function openRegister() {
    const { data } = await hrApi.directory({ limit: '100' });
    setEmployees(data.data);
    setShowModal(true);
  }

  async function register() {
    try {
      await hrApi.createLeave(form);
      setShowModal(false);
      toast.success('Leave request registered.', 'Leave registered');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to register leave.'), 'Registration failed');
    }
  }

  async function updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await hrApi.updateLeaveStatus(id, status);
      toast.success(`Leave request ${status.toLowerCase()}.`, 'Status updated');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update leave status.'), 'Update failed');
    }
  }

  return (
    <HrPageLayout
      title="Leave Management"
      subtitle="Register, filter, approve and track school-wide leave requests"
      actions={<button type="button" onClick={openRegister} className="btn-primary"><Plus size={16} /> Register leave</button>}
      kpis={[
        { label: 'Total Requests', value: stats.total ?? 0 },
        { label: 'Pending', value: stats.pending ?? 0 },
        { label: 'Approved', value: stats.approved ?? 0 },
        { label: 'On Leave', value: stats.onLeave ?? 0 },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Requests" value={stats.total ?? 0} />
        <StatCard label="Pending" value={stats.pending ?? 0} />
        <StatCard label="Approved (year)" value={stats.approved ?? 0} />
        <StatCard label="Rejected (year)" value={stats.rejected ?? 0} />
        <StatCard label="On Leave" value={stats.onLeave ?? 0} />
        <StatCard label="Annual Balance" value={stats.annualBalance ?? 0} hint="days remaining" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: '', label: 'All Requests' },
          { key: 'PENDING', label: `Pending (${stats.pending ?? 0})` },
          { key: 'APPROVED', label: `Approved (${stats.approved ?? 0})` },
          { key: 'REJECTED', label: `Rejected (${stats.rejected ?? 0})` },
        ].map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-full px-4 py-2 text-xs font-medium ${tab === t.key ? 'bg-navy text-white' : 'border border-border bg-white text-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Leave Type</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="px-4 py-3"><p className="font-medium">{r.employeeName}</p><p className="text-xs text-muted">{r.employeeNumber}</p></td>
                <td className="px-4 py-3">{r.leaveType}</td>
                <td className="px-4 py-3">{r.totalDays} days</td>
                <td className="px-4 py-3 text-xs">{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs">{new Date(r.appliedOn).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button type="button" className="rounded p-1 text-muted hover:bg-slate-100"><Eye size={14} /></button>
                    {r.status === 'PENDING' && (
                      <>
                        <button type="button" onClick={() => updateStatus(r.id, 'APPROVED')} className="rounded p-1 text-green-600 hover:bg-green-50"><Check size={14} /></button>
                        <button type="button" onClick={() => updateStatus(r.id, 'REJECTED')} className="rounded p-1 text-red-600 hover:bg-red-50"><X size={14} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">Register Leave</h2>
            <div className="mt-4 space-y-3">
              <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
              <select className="input" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                {leaveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <textarea className="input" placeholder="Reason" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={register} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </HrPageLayout>
  );
}

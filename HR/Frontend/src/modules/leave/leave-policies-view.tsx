'use client';

import { useEffect, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { HrPageLayout } from '@/components/hr-page-layout';
import { useAuth } from '@/contexts/auth-context';
import { hrApi } from '@/services/hr-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { type LeaveCategory, type LeavePolicy } from '@/types/leave';
import { emptyLeavePolicy, LeavePolicyModal } from './leave-policy-modal';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#FCB038]' : 'bg-slate-200'}`}
      aria-pressed={checked}
      aria-label={label}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
}

export function LeavePoliciesView() {
  const toast = useToast();
  const { ready, authorized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [category, setCategory] = useState<LeaveCategory>('STATUTORY');
  const [modalPolicy, setModalPolicy] = useState<LeavePolicy | (Omit<LeavePolicy, 'id'> & { id?: string }) | null>(
    null
  );

  useEffect(() => {
    if (!ready || !authorized) {
      if (ready && !authorized) setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data } = await hrApi.leavePolicies();
        if (!cancelled) setPolicies(data.data);
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, 'Failed to load leave policies.'), 'Load failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authorized, ready, toast]);

  async function reloadPolicies() {
    try {
      const { data } = await hrApi.leavePolicies();
      setPolicies(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load leave policies.'), 'Load failed');
    }
  }

  async function handleSave(draft: Omit<LeavePolicy, 'id'> & { id?: string }) {
    setSaving(true);
    try {
      if (draft.id) {
        await hrApi.updateLeavePolicy(draft.id, draft);
        toast.success(`"${draft.leaveType}" policy updated.`, 'Saved');
      } else {
        await hrApi.createLeavePolicy(draft);
        toast.success(`"${draft.leaveType}" policy created.`, 'Saved');
      }
      setModalPolicy(null);
      void reloadPolicies();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save policy.'), 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete policy "${name}"?`)) return;
    try {
      await hrApi.deleteLeavePolicy(id);
      toast.success('Policy removed.', 'Deleted');
      void reloadPolicies();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete policy.'), 'Delete failed');
    }
  }

  async function toggleActive(policy: LeavePolicy) {
    try {
      await hrApi.updateLeavePolicy(policy.id, { ...policy, active: !policy.active });
      void reloadPolicies();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update policy.'), 'Update failed');
    }
  }

  const visiblePolicies = policies.filter((p) => p.category === category);

  return (
    <HrPageLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#000435] sm:text-2xl">Leave Policies</h1>
            <p className="mt-1 text-sm text-slate-500">
              Set leave categories, maximum working days, and rules. Register Leave uses these settings automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalPolicy(emptyLeavePolicy(category))}
            className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_16px_-6px_rgba(0,4,53,0.5)] transition-transform hover:scale-[1.02]"
          >
            <Plus size={14} className="text-[#FCB038]" />
            New {category === 'STATUTORY' ? 'Statutory' : 'Organization'} Policy
          </button>
        </div>

        <div className="inline-flex rounded-2xl border border-slate-100 bg-white p-1 shadow-[0_2px_8px_-4px_rgba(0,4,53,0.08)]">
          {(['STATUTORY', 'ORGANIZATION'] as LeaveCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                category === c ? 'bg-[#000435] text-white' : 'text-slate-500 hover:text-[#000435]'
              }`}
            >
              {c === 'STATUTORY' ? 'Statutory Leave' : 'Organization Leave'}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_-4px_rgba(0,4,53,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Max Days</th>
                  <th className="px-4 py-3">Carry Forward</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      Loading policies…
                    </td>
                  </tr>
                )}
                {!loading && visiblePolicies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      No {category === 'STATUTORY' ? 'statutory' : 'organization'} leave policies yet. Click New Policy
                      to add one.
                    </td>
                  </tr>
                )}
                {visiblePolicies.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-[#000435]">{p.leaveType}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{p.category}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[#000435]">
                      {p.maxDays > 0 ? `${p.maxDays} days` : 'Flexible'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.carryForward ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.approvalWorkflow.join(' + ') || '—'}</td>
                    <td className="px-4 py-3">
                      <Toggle checked={p.active} onChange={() => toggleActive(p)} label={`Toggle ${p.leaveType}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModalPolicy(p)}
                          title="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#000435]"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.leaveType)}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LeavePolicyModal
        open={modalPolicy !== null}
        policy={modalPolicy}
        saving={saving}
        onClose={() => setModalPolicy(null)}
        onSave={handleSave}
      />
    </HrPageLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { api } from '@/services/api';
import { PlanStatusBadge } from './risk-badge';

type Installment = {
  id: string;
  sequence: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  isPaid: boolean;
};

type Plan = {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  progress: number;
  displayStatus: string;
  frequency: string;
  installments: Installment[];
};

type Props = {
  planId: string | null;
  onClose: () => void;
  onOpenStudent?: (studentId: string) => void;
};

export function InstallmentPlanDrawer({ planId, onClose, onOpenStudent }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!planId) {
      setPlan(null);
      return;
    }
    setLoading(true);
    void api
      .get(`/installments/plans/${planId}`)
      .then(({ data }) => setPlan(data.data))
      .finally(() => setLoading(false));
    requestAnimationFrame(() => setEntered(true));
  }, [planId]);

  if (!planId) return null;

  return (
    <div className="fixed inset-0 z-[84] flex justify-end">
      <button type="button" className="absolute inset-0 bg-navy/40" onClick={onClose} />
      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-[-12px_0_40px_rgba(0,4,53,0.14)] transition-transform duration-300 ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <button
                type="button"
                className="text-left text-lg font-bold text-navy hover:underline"
                onClick={() => plan && onOpenStudent?.(plan.studentId)}
              >
                {loading ? '…' : plan?.studentName}
              </button>
              <p className="text-sm text-muted">{plan?.className}</p>
              <div className="mt-2">{plan ? <PlanStatusBadge status={plan.displayStatus} /> : null}</div>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {plan ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] uppercase text-muted">Total</p>
                  <p className="font-bold text-navy">{plan.totalAmount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[10px] uppercase text-muted">Paid</p>
                  <p className="font-bold text-emerald-800">{plan.paidAmount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[10px] uppercase text-muted">Remaining</p>
                  <p className="font-bold text-amber-900">{plan.remaining.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
                  <span>Progress</span>
                  <span>{plan.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${plan.progress}%` }} />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-navy">Payment timeline</h3>
                <ul className="space-y-0 border-l-2 border-primary/30 pl-4">
                  {plan.installments.map((i) => {
                    const upcoming = !i.isPaid && new Date(i.dueDate) >= new Date();
                    return (
                      <li key={i.id} className="relative pb-4 last:pb-0">
                        <span
                          className={`absolute -left-[1.35rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ${
                            i.isPaid ? 'text-emerald-600' : upcoming ? 'text-muted' : 'text-red-500'
                          }`}
                        >
                          {i.isPaid ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                        </span>
                        <p className="text-xs font-semibold text-muted">
                          {new Date(i.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="font-bold text-navy">{i.amount.toLocaleString()} RWF</p>
                        <p className="text-xs text-muted">
                          {i.isPaid ? 'Paid' : upcoming ? 'Upcoming' : 'Overdue'}
                          {i.isPaid && i.paidAmount ? ` · ${i.paidAmount.toLocaleString()} RWF` : ''}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

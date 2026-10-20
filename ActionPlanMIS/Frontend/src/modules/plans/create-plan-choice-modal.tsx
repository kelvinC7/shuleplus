'use client';

import { useRouter } from 'next/navigation';
import { FileText, Wrench, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreatePlanChoiceModal({ open, onClose }: Props) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy">Create New Action Plan</h2>
            <p className="mt-1 text-sm text-muted">Build a plan from scratch or start with a ready template.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-navy">
              <Wrench size={20} />
            </div>
            <h3 className="text-base font-semibold text-navy">Create from Scratch</h3>
            <p className="mt-2 flex-1 text-sm text-muted">Build a completely custom action plan with your own goals, objectives, and activities.</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/plans/new');
              }}
              className="btn-primary mt-5 w-full"
            >
              Get Started
            </button>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
              <FileText size={20} />
            </div>
            <h3 className="text-base font-semibold text-navy">Use a Template</h3>
            <p className="mt-2 flex-1 text-sm text-muted">Start with a ready-made plan aligned to Rwanda school priorities and customize it.</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/templates');
              }}
              className="btn-secondary mt-5 w-full"
            >
              Browse Templates
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

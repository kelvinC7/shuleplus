'use client';

import { RegisterDepartmentView } from './registration-departments';

interface Props {
  open: boolean;
  departmentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DepartmentCreateModal({ open, departmentId, onClose, onSuccess }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000435]/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_24px_64px_-16px_rgba(0,4,53,0.45)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-[#000435] px-5 py-4 text-white sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">Departments</p>
            <h2 className="text-lg font-bold">{departmentId ? 'Edit Department' : 'Create Department'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <RegisterDepartmentView
            key={departmentId ?? 'new'}
            variant="modal"
            departmentId={departmentId}
            onClose={onClose}
            onSuccess={() => onSuccess()}
          />
        </div>
      </div>
    </div>
  );
}

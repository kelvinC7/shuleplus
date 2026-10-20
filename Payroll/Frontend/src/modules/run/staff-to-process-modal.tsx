'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, X } from 'lucide-react';
import { payrollApi } from '@/services/payroll-api';

interface StaffRow {
  id: string;
  employeeNumber: string;
  fullName: string;
  department: string | null;
  basicSalary: number;
}

interface Props {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export function StaffToProcessModal({ open, selectedIds, onClose, onConfirm }: Props) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (!open) return;
    setPicked(new Set(selectedIds));
    payrollApi.listStaff().then(({ data }) => {
      const rows = (data.data as StaffRow[]).filter((s) => s.basicSalary > 0);
      setStaff(rows);
      if (!selectedIds.length && rows.length) {
        setPicked(new Set(rows.map((r) => r.id)));
      }
    });
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.employeeNumber.toLowerCase().includes(q) ||
        (s.department ?? '').toLowerCase().includes(q)
    );
  }, [staff, search]);

  if (!open) return null;

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setPicked(new Set(filtered.map((s) => s.id)));
  }

  function clearAll() {
    setPicked(new Set());
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-amber" />
            <h2 className="font-semibold text-navy">Staff to Process</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 px-6 py-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Search by name, ID or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <button type="button" className="text-amber hover:underline" onClick={selectAll}>Select all</button>
            <span className="text-muted">·</span>
            <button type="button" className="text-muted hover:underline" onClick={clearAll}>Clear</button>
            <span className="ml-auto text-muted">{picked.size} selected</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50"
            >
              <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 rounded" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy">{s.fullName}</p>
                <p className="text-xs text-muted">{s.employeeNumber} · {s.department ?? '—'}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700">
                {Math.round(s.basicSalary).toLocaleString()} RWF
              </span>
            </label>
          ))}
          {!filtered.length && <p className="p-6 text-center text-sm text-muted">No staff match your search</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!picked.size}
            onClick={() => { onConfirm(Array.from(picked)); onClose(); }}
          >
            Confirm ({picked.size})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

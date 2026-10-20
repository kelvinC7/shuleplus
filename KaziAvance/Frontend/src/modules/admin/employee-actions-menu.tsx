"use client";

import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminEmployee } from "./types";
import { needsSalarySetup } from "./advance-eligibility-badge";

export type EmployeeAction =
  | "view"
  | "edit"
  | "salary"
  | "fetch-payroll"
  | "eligibility"
  | "disable"
  | "enable"
  | "history-advances"
  | "history-salary";

interface EmployeeActionsMenuProps {
  employee: AdminEmployee;
  payrollEnabled?: boolean;
  onAction: (action: EmployeeAction) => void;
}

export function EmployeeActionsMenu({ employee, payrollEnabled, onAction }: EmployeeActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    function place() {
      const rect = btnRef.current!.getBoundingClientRect();
      const menuW = 220;
      const menuH = 320;
      const pad = 8;
      let left = rect.right - menuW;
      let top = rect.bottom + 6;
      if (left < pad) left = pad;
      if (left + menuW > window.innerWidth - pad) left = window.innerWidth - menuW - pad;
      if (top + menuH > window.innerHeight - pad) top = Math.max(pad, rect.top - menuH - 6);
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action: EmployeeAction) {
    setOpen(false);
    onAction(action);
  }

  const salaryMissing = needsSalarySetup(employee.advanceEligibility);
  const payrollOn = payrollEnabled ?? employee.payrollEnabled;

  const menu =
    open && pos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[200] w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(0,4,53,0.28)]"
            style={{ top: pos.top, left: pos.left }}
          >
            <MenuItem label="View details" onClick={() => run("view")} />
            <MenuItem label="Edit employee" onClick={() => run("edit")} />
            <MenuItem label={salaryMissing ? "Set salary" : "Update salary"} onClick={() => run("salary")} />
            {payrollOn ? <MenuItem label="Fetch from Payroll" onClick={() => run("fetch-payroll")} /> : null}
            <div className="my-1 border-t border-slate-100" />
            <MenuItem label="Set eligibility" onClick={() => run("eligibility")} />
            {employee.allowAdvance === false ? (
              <MenuItem label="Allow advance" onClick={() => run("enable")} />
            ) : (
              <MenuItem label="Disable advance" onClick={() => run("disable")} />
            )}
            <div className="my-1 border-t border-slate-100" />
            <MenuItem label="Advance history" onClick={() => run("history-advances")} />
            <MenuItem label="Salary history" onClick={() => run("history-salary")} />
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        className="btn-table-action"
        onClick={() => run("view")}
      >
        View
      </button>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-table-more"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
      >
        <MoreVertical size={16} />
      </button>
      {menu}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3.5 py-2 text-left text-[13px] font-medium text-navy/90 transition hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

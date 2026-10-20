"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/admin-api";
import { FormSheet } from "@/components/ui/form-sheet";
import type { AdminEmployee } from "./types";

interface EditEmployeeModalProps {
  employee: AdminEmployee | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditEmployeeModal({ employee, onClose, onSaved }: EditEmployeeModalProps) {
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("Active");
  const [hireDate, setHireDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employee) return;
    setFullName(employee.fullName);
    setDepartment(employee.department);
    setPosition(employee.position);
    setPhone(employee.phone ?? "");
    setEmploymentStatus(employee.employmentStatus || employee.accountStatus || "Active");
    setHireDate(employee.hireDate ? employee.hireDate.slice(0, 10) : "");
    setError("");
  }, [employee]);

  if (!employee) return null;
  const selected = employee;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await adminApi.updateEmployee(selected.id, {
        fullName,
        department,
        position,
        phone: phone || null,
        employmentStatus,
        hireDate: hireDate || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save employee");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet
      title="Edit employee"
      subtitle={employee.employeeCode}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Full name</span>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Department</span>
          <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Position</span>
          <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Phone</span>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Employment status</span>
          <select className="input" value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
            <option>Suspended</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Employment date</span>
          <input type="date" className="input" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
        </label>
        {error ? <p className="text-sm text-danger sm:col-span-2">{error}</p> : null}
      </div>
    </FormSheet>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { uniformApi } from "@/services/uniform-api";

const STEPS = ["Upload", "Preview", "Confirm", "Done"] as const;

const TEMPLATE_HEADERS = [
  "First Name",
  "Last Name",
  "Gender",
  "Class",
  "Academic Year",
  "Phone",
];

type ImportRow = {
  firstName: string;
  lastName: string;
  gender?: string;
  className?: string;
  academicYear?: string;
  phone?: string;
  status: "ready" | "invalid";
  reason?: string;
};

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find(
      (h) =>
        h.toLowerCase().replace(/[\s_]+/g, "") ===
        key.toLowerCase().replace(/[\s_]+/g, ""),
    );
    if (
      found != null &&
      row[found] != null &&
      String(row[found]).trim() !== ""
    ) {
      return String(row[found]).trim();
    }
  }
  return "";
}

function mapRows(raw: Record<string, unknown>[]): ImportRow[] {
  return raw.map((row) => {
    let firstName = cell(row, "firstName", "first name", "firstname");
    let lastName = cell(row, "lastName", "last name", "lastname", "surname");
    const full = cell(
      row,
      "names",
      "name",
      "fullName",
      "fullname",
      "student name",
    );
    if ((!firstName || !lastName) && full) {
      const parts = full.split(/\s+/);
      firstName = firstName || parts[0] || "";
      lastName = lastName || parts.slice(1).join(" ") || "";
    }
    const gender = cell(row, "gender", "sex");
    const className = cell(row, "class", "className", "grade");
    const academicYear = cell(row, "academicYear", "academic year", "year");
    const phone = cell(row, "phone", "father phone", "mother phone", "mobile");

    if (!firstName || !lastName) {
      return {
        firstName,
        lastName,
        gender,
        className,
        academicYear,
        phone,
        status: "invalid",
        reason: "First and last name required",
      };
    }
    return {
      firstName,
      lastName,
      gender: gender || undefined,
      className: className || undefined,
      academicYear: academicYear || undefined,
      phone: phone || undefined,
      status: "ready",
    };
  });
}

export function StudentImportWizard({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [academicYear, setAcademicYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readyRows = useMemo(
    () => rows.filter((r) => r.status === "ready"),
    [rows],
  );
  const invalidRows = useMemo(
    () => rows.filter((r) => r.status === "invalid"),
    [rows],
  );

  function reset() {
    setStep(0);
    setRows([]);
    setFileName("");
    setResult(null);
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["Jean", "Uwimana", "Male", "Primary 3", "2026", "0780000000"],
      ["Alice", "Mukamana", "Female", "Primary 4", "2026", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "uniform-students-template.xlsx");
  }

  async function parseFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
    const mapped = mapRows(json).map((r) => ({
      ...r,
      academicYear: r.academicYear || academicYear,
    }));
    setRows(mapped);
    setFileName(file.name);
    setStep(1);
  }

  async function runImport() {
    if (!readyRows.length) {
      toast.error("No valid rows to import");
      return;
    }
    setSaving(true);
    try {
      const res = await uniformApi.students.importRows(
        readyRows.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          gender: r.gender,
          className: r.className,
          academicYear: r.academicYear || academicYear,
          phone: r.phone,
        })),
      );
      setResult({ created: res.created, failed: res.failed });
      setStep(3);
      toast.success(
        `Imported ${res.created} student${res.created === 1 ? "" : "s"}`,
      );
      onImported();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Import failed",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/40 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] font-medium text-muted">
              Students / Import
            </p>
            <h2 className="text-lg font-bold text-navy">Import Students</h2>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-slate-100"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex gap-1 border-b border-border px-5 py-3">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                i === step
                  ? "bg-primary text-navy"
                  : i < step
                    ? "bg-navy/10 text-navy"
                    : "bg-slate-100 text-muted"
              }`}
            >
              {i < step ? <Check size={12} className="mr-1 inline" /> : null}
              {label}
            </span>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-navy">
                  Academic Year
                </label>
                <input
                  className="input"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={downloadTemplate}
              >
                <Download size={15} /> Download Excel/CSV template
              </button>
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-slate-50 px-4 py-10 text-center hover:bg-slate-100"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="text-navy" size={28} />
                <span className="text-sm font-semibold text-navy">
                  Upload student file
                </span>
                <span className="text-xs text-muted">
                  CSV, XLS or XLSX · max ~2000 rows
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void parseFile(file).catch(() =>
                      toast.error("Could not read file"),
                    );
                  e.target.value = "";
                }}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-slate-50 px-3 py-2 text-sm">
                <FileSpreadsheet size={16} className="text-navy" />
                <span className="font-medium text-navy">{fileName}</span>
                <span className="text-muted">
                  · {readyRows.length} ready · {invalidRows.length} invalid
                </span>
              </div>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="sp-table w-full text-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={`${r.firstName}-${i}`}>
                        <td className="font-medium text-navy">
                          {r.firstName} {r.lastName}
                        </td>
                        <td className="text-muted">{r.className || ""}</td>
                        <td
                          className={
                            r.status === "ready"
                              ? "text-emerald-700"
                              : "text-danger"
                          }
                        >
                          {r.status === "ready" ? "Ready" : r.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 ? (
                <p className="text-xs text-muted">
                  Showing first 50 of {rows.length} rows
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3 rounded-md border border-border bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-navy">Confirm import</p>
              <p className="text-muted">
                {readyRows.length} student{readyRows.length === 1 ? "" : "s"}{" "}
                will be created as local Uniform students for academic year{" "}
                <strong className="text-navy">{academicYear}</strong>.
              </p>
              {invalidRows.length ? (
                <p className="text-amber-700">
                  {invalidRows.length} invalid row(s) will be skipped.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 3 && result ? (
            <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-center">
              <Check className="mx-auto text-emerald-700" size={32} />
              <p className="text-lg font-bold text-navy">Import complete</p>
              <p className="text-sm text-muted">
                Created <strong className="text-navy">{result.created}</strong>
                {result.failed ? (
                  <>
                    {" "}
                    · Failed{" "}
                    <strong className="text-danger">{result.failed}</strong>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>

        <footer className="flex justify-between gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            className="btn-secondary !py-2"
            onClick={handleClose}
          >
            {step === 3 ? "Close" : "Cancel"}
          </button>
          <div className="flex gap-2">
            {step > 0 && step < 3 ? (
              <button
                type="button"
                className="btn-secondary !py-2"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            ) : null}
            {step === 1 ? (
              <button
                type="button"
                className="btn-primary !py-2"
                disabled={!readyRows.length}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            ) : null}
            {step === 2 ? (
              <button
                type="button"
                className="btn-primary !py-2"
                disabled={saving}
                onClick={() => void runImport()}
              >
                {saving ? "Importing…" : `Import ${readyRows.length}`}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

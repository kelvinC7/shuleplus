'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle,
  CircleCheck,
  Download,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { procurementApi } from '@/services/procurement-api';
import {
  IMPORT_FILE_ACCEPT,
  downloadExcelTemplate,
  hasRequiredColumns,
  normalizeItemName,
  parsePositiveNumber,
  pickCell,
  readWorkbookRows,
} from '@/lib/excel-import';
import type {
  AcademicSettings,
} from '@/lib/academic-settings';
import type {
  ImportItemOption,
  PurchaseRequestImportBody,
  PurchaseRequestImportResult,
} from '@/types';

type DepartmentOption = { id: string; name: string; code: string };

type PRImportRow = {
  rowNumber: number;
  itemName: string;
  quantity: number;
  unit: string;
  matched: boolean;
  catalogName?: string;
  duplicateOf?: number;
  error?: string;
};

type WizardStep = 'departments' | 'items' | 'done';

interface PurchaseRequestImportWizardProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  departments: DepartmentOption[];
  academicSettings: AcademicSettings;
  requestedBy?: string;
}

const STEP_LABELS: { key: WizardStep; title: string }[] = [
  { key: 'departments', title: 'Departments' },
  { key: 'items', title: 'Items & Preview' },
];

export function PurchaseRequestImportWizard({
  open,
  onClose,
  onImported,
  departments,
  academicSettings,
  requestedBy,
}: PurchaseRequestImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('departments');
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [catalog, setCatalog] = useState<ImportItemOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PRImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PurchaseRequestImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setStep('departments');
    setSelectedDepartments(new Set());
    setFile(null);
    setRows([]);
    setFileError('');
    setResult(null);
    setParsing(false);
    setSubmitting(false);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    let cancelled = false;
    setCatalogLoading(true);
    procurementApi.purchaseRequests
      .itemCatalog()
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  const catalogByName = useMemo(
    () => new Map(catalog.map((item) => [normalizeItemName(item.name), item])),
    [catalog],
  );

  const validRows = useMemo(
    () => rows.filter((row) => !row.error && row.duplicateOf === undefined),
    [rows],
  );
  const errorCount = useMemo(() => rows.filter((row) => row.error).length, [rows]);
  const duplicateCount = useMemo(
    () => rows.filter((row) => row.duplicateOf !== undefined).length,
    [rows],
  );
  const unmatchedCount = useMemo(
    () => validRows.filter((row) => !row.matched).length,
    [validRows],
  );
  const totalQuantity = useMemo(
    () => validRows.reduce((sum, row) => sum + row.quantity, 0),
    [validRows],
  );

  const toggleDepartment = (id: string) => {
    setSelectedDepartments((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableDepartments = useMemo(
    () => departments.filter((department) => department.code !== 'OTHER'),
    [departments],
  );

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(
      'purchase-request-import-template.xlsx',
      'Purchase Requests',
      ['Item', 'Quantity'],
      [
        ['Exercise Books', 50],
        ['Whiteboard Markers', 12],
      ],
    );
  };

  const handleFile = async (nextFile: File | null | undefined) => {
    if (!nextFile) return;
    setFile(nextFile);
    setFileError('');
    setRows([]);
    setResult(null);
    setParsing(true);
    try {
      const rawRows = await readWorkbookRows(nextFile);
      if (rawRows.length === 0) {
        setFileError('The workbook is empty. Download the template and add at least one row.');
        return;
      }
      const columns = hasRequiredColumns(rawRows, [
        { label: 'Item', aliases: ['item', 'item name', 'product', 'product name'] },
        { label: 'Quantity', aliases: ['quantity', 'qty'] },
      ]);
      if (!columns.ok) {
        setFileError(
          `Missing required column${columns.missing.length === 1 ? '' : 's'}: ${columns.missing.join(', ')}.`,
        );
        return;
      }

      const byName = new Map<string, PRImportRow>();
      const parsed: PRImportRow[] = rawRows.map((raw, index) => {
        const rowNumber = index + 2;
        const itemName = String(pickCell(raw, ['Item', 'Item Name', 'Product'])).trim();
        const quantity = parsePositiveNumber(pickCell(raw, ['Quantity', 'Qty']));
        const problems: string[] = [];
        if (!itemName) problems.push('Item is required');
        if (quantity === null) problems.push('Quantity must be a positive number');

        const match = itemName ? catalogByName.get(normalizeItemName(itemName)) : undefined;
        const row: PRImportRow = {
          rowNumber,
          itemName,
          quantity: quantity ?? 0,
          unit: match?.unit || 'EA',
          matched: Boolean(match),
          catalogName: match?.name,
          error: problems.length > 0 ? problems.join(' · ') : undefined,
        };

        if (row.error || quantity === null) return row;

        const key = normalizeItemName(itemName);
        const existing = byName.get(key);
        if (existing) {
          existing.quantity += quantity;
          row.duplicateOf = existing.rowNumber;
        } else {
          byName.set(key, row);
        }
        return row;
      });

      setRows(parsed);
      if (parsed.every((row) => row.error)) {
        toast.error('No valid rows were found in this file');
      }
    } catch (error: any) {
      setFileError(error?.message || 'The file could not be read.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      toast.error('There are no valid rows to import');
      return;
    }
    setSubmitting(true);
    try {
      const payload: PurchaseRequestImportBody = {
        departmentIds:
          selectedDepartments.size > 0 ? [...selectedDepartments] : undefined,
        academicYear: academicSettings.currentAcademicYear || undefined,
        term: academicSettings.currentTerm || undefined,
        priority: 'MEDIUM',
        departmentHeadId: requestedBy || undefined,
        items: validRows.map((row) => ({
          itemName: row.itemName,
          quantity: row.quantity,
          unit: row.unit,
        })),
      };
      const response = await procurementApi.purchaseRequests.import(payload);
      setResult(response);
      setStep('done');
      toast.success(
        `${response.itemCount} item${response.itemCount === 1 ? '' : 's'} imported across ${
          response.departmentCount
        } purchase request${response.departmentCount === 1 ? '' : 's'}`,
      );
      onImported();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Import failed. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    setStep('departments');
    onClose();
  };

  const stepIndex = step === 'departments' ? 0 : step === 'items' ? 1 : 2;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[min(1040px,96vw)] !max-w-[1040px] flex flex-col gap-0 overflow-hidden border-l border-border p-0"
      >
        <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-6 py-5 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                <Upload className="h-3 w-3" />
                Excel Import
              </div>
              <SheetTitle className="truncate text-2xl font-bold text-white">
                Import Purchase Requests
              </SheetTitle>
              <SheetDescription className="mt-1 text-white/65">
                Upload one spreadsheet and create purchase requests for one or more departments.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close import wizard"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {STEP_LABELS.map((label, index) => {
              const active = stepIndex === index;
              const complete = stepIndex > index;
              return (
                <div
                  key={label.key}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-[#fcb038] text-navy'
                      : complete
                        ? 'bg-white/15 text-white'
                        : 'bg-white/5 text-white/50'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      active ? 'bg-navy/15 text-navy' : 'bg-white/10'
                    }`}
                  >
                    {complete ? <CheckCircle className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  {label.title}
                </div>
              );
            })}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-6 py-6 sm:px-8">
          {step === 'departments' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-navy">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-navy">Choose departments (optional)</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      One purchase request is created per selected department. Leave all unselected
                      to use the existing department assignment rules.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectableDepartments.map((department) => {
                    const checked = selectedDepartments.has(department.id);
                    return (
                      <label
                        key={department.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                          checked
                            ? 'border-primary bg-primary/10 text-navy'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDepartment(department.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#fcb038]"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{department.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {department.code}
                        </span>
                      </label>
                    );
                  })}
                  {selectableDepartments.length === 0 ? (
                    <p className="text-sm text-slate-500">No departments are available.</p>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                  <span className="font-semibold text-navy">
                    {selectedDepartments.size} department
                    {selectedDepartments.size === 1 ? '' : 's'} selected
                  </span>
                  {selectedDepartments.size === 0 ? (
                    <span className="text-slate-500">Existing assignment rules will be used</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedDepartments(new Set())}
                      className="font-semibold text-navy/70 hover:text-navy"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Imported requests are submitted for approval using the normal procurement
                  workflow. Item prices are captured later during purchase order creation.
                </p>
              </div>
            </div>
          ) : null}

          {step === 'items' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-navy">
                      <FileSpreadsheet className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-navy">Upload the item spreadsheet</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Required columns: <span className="font-semibold text-navy">Item</span> and{' '}
                        <span className="font-semibold text-navy">Quantity</span>. Quantities must be
                        greater than zero.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="btn-ghost inline-flex items-center gap-2 !rounded-xl ring-1 ring-slate-200"
                  >
                    <Download className="h-4 w-4" /> Template
                  </button>
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void handleFile(event.dataTransfer.files?.[0]);
                  }}
                  className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                    dragging
                      ? 'border-primary bg-primary/10'
                      : 'border-slate-200 bg-slate-50/60 hover:border-primary/40'
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-sm ring-1 ring-slate-200">
                    {parsing ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </span>
                  <p className="text-sm font-semibold text-navy">
                    {parsing
                      ? 'Reading the workbook…'
                      : file
                        ? file.name
                        : 'Drop the Excel file here, or choose a file'}
                  </p>
                  <p className="text-xs text-slate-500">Supports .xlsx, .xls and .csv</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={IMPORT_FILE_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      void handleFile(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="btn-secondary mt-1 !rounded-xl px-4"
                  >
                    Choose file
                  </button>
                </div>

                {fileError ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{fileError}</p>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    {catalogLoading ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    {catalogLoading
                      ? 'Loading inventory catalogue…'
                      : `${catalog.length} inventory item${catalog.length === 1 ? '' : 's'} available for matching`}
                  </span>
                  <span>Duplicate rows are merged automatically.</span>
                </div>
              </div>

              {rows.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <SummaryTile label="Valid rows" value={validRows.length} tone="success" />
                    <SummaryTile label="Errors" value={errorCount} tone={errorCount ? 'danger' : 'neutral'} />
                    <SummaryTile
                      label="New items"
                      value={unmatchedCount}
                      tone={unmatchedCount ? 'warning' : 'neutral'}
                    />
                    <SummaryTile label="Total quantity" value={totalQuantity} tone="info" />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                        Import preview
                      </span>
                      <span className="text-xs text-slate-500">
                        {rows.length} row{rows.length === 1 ? '' : 's'} read
                        {duplicateCount > 0 ? ` · ${duplicateCount} duplicate merged` : ''}
                      </span>
                    </div>
                    <div className="max-h-[340px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          <tr className="border-b border-slate-200">
                            <th className="px-3 py-2.5 text-left">Row</th>
                            <th className="px-3 py-2.5 text-left">Item</th>
                            <th className="px-3 py-2.5 text-right">Quantity</th>
                            <th className="px-3 py-2.5 text-left">Unit</th>
                            <th className="px-3 py-2.5 text-left">Inventory match</th>
                            <th className="px-3 py-2.5 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const invalid = Boolean(row.error);
                            const duplicate = row.duplicateOf !== undefined;
                            return (
                              <tr
                                key={row.rowNumber}
                                className={`border-b border-slate-100 last:border-0 ${
                                  invalid
                                    ? 'bg-red-50/60'
                                    : duplicate
                                      ? 'bg-slate-50/60'
                                      : row.matched
                                        ? ''
                                        : 'bg-amber-50/50'
                                }`}
                              >
                                <td className="px-3 py-2.5 text-xs text-slate-500">{row.rowNumber}</td>
                                <td className="px-3 py-2.5">
                                  <p className="font-semibold text-navy">{row.itemName || '—'}</p>
                                  {row.matched && row.catalogName && row.catalogName !== row.itemName ? (
                                    <p className="text-[11px] text-slate-500">
                                      Matched: {row.catalogName}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                                  {row.quantity || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-slate-500">{row.unit}</td>
                                <td className="px-3 py-2.5">
                                  {row.matched ? (
                                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      Matched
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                      New item
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  {invalid ? (
                                    <span className="inline-flex items-start gap-1 text-xs font-medium text-red-700">
                                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      {row.error}
                                    </span>
                                  ) : duplicate ? (
                                    <span className="text-xs text-slate-500">
                                      Merged into row {row.duplicateOf}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                      <CircleCheck className="h-3.5 w-3.5" /> Ready
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {errorCount > 0 ? (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        {errorCount} row{errorCount === 1 ? '' : 's'} cannot be imported and will be
                        skipped. Correct the file and upload it again, or import the valid rows only.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 'done' && result ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle className="h-7 w-7" />
                </span>
                <h3 className="mt-3 text-lg font-bold text-navy">Import completed</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {result.itemCount} item{result.itemCount === 1 ? '' : 's'} imported across{' '}
                  {result.departmentCount} purchase request
                  {result.departmentCount === 1 ? '' : 's'}.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                  Created requests
                </div>
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left">PR Number</th>
                      <th className="px-4 py-2.5 text-left">Department</th>
                      <th className="px-4 py-2.5 text-right">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.requests.map((request) => (
                      <tr key={request.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-navy">{request.prNumber}</td>
                        <td className="px-4 py-2.5 text-slate-600">{request.departmentName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {request.itemCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-6 py-4 sm:px-8">
          {step === 'departments' ? (
            <>
              <button
                type="button"
                onClick={close}
                className="min-w-[110px] rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('items')}
                className="btn-primary inline-flex items-center gap-2 px-6"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : step === 'items' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('departments')}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || validRows.length === 0}
                  className="btn-primary inline-flex items-center gap-2 px-6 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" /> Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Import {validRows.length} item
                      {validRows.length === 1 ? '' : 's'}
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" /> Import another
              </button>
              <button type="button" onClick={close} className="btn-primary px-6">
                Done
              </button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}) {
  const tones: Record<string, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    neutral: 'border-slate-200 bg-white text-slate-600',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

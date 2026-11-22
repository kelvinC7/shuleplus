'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CircleCheck,
  Download,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  ShoppingCart,
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
import { formatFrw } from '@/utils/currency';
import type {
  PurchaseOrderImportBody,
  PurchaseOrderImportResult,
  PurchaseRequest,
  Supplier,
} from '@/types';

type WizardStep = 'details' | 'items' | 'done';

type POImportRow = {
  rowNumber: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  prCode: string;
  prId?: string;
  prNumber?: string;
  prItemName?: string;
  unit?: string;
  error?: string;
};

interface PurchaseOrderImportWizardProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  suppliers: Supplier[];
}

const ELIGIBLE_STATUSES = new Set([
  'PENDING',
  'DEPARTMENT_HEAD_APPROVED',
  'FINANCE_APPROVED',
  'PROCUREMENT_APPROVED',
  'MD_APPROVED',
]);

const STEP_LABELS: { key: WizardStep; title: string }[] = [
  { key: 'details', title: 'Order Details' },
  { key: 'items', title: 'Items & Preview' },
];

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function PurchaseOrderImportWizard({
  open,
  onClose,
  onImported,
  suppliers,
}: PurchaseOrderImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('details');
  const [supplierId, setSupplierId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<POImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PurchaseOrderImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setStep('details');
    setSupplierId('');
    setExpectedDelivery('');
    setDeliveryAddress('');
    setPaymentTerms('');
    setNotes('');
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
    setRequestsLoading(true);
    procurementApi.purchaseRequests
      .list()
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      })
      .finally(() => {
        if (!cancelled) setRequestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.isActive !== false),
    [suppliers],
  );

  const prByCode = useMemo(() => {
    const map = new Map<string, PurchaseRequest>();
    for (const request of requests) {
      map.set(request.prNumber.trim().toUpperCase(), request);
    }
    return map;
  }, [requests]);

  const eligibleRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          ELIGIBLE_STATUSES.has(request.status) &&
          !(request.purchaseOrders && request.purchaseOrders.length > 0),
      ),
    [requests],
  );

  const validRows = useMemo(() => rows.filter((row) => !row.error), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => Boolean(row.error)), [rows]);
  const totalQuantity = useMemo(
    () => validRows.reduce((sum, row) => sum + row.quantity, 0),
    [validRows],
  );
  const totalAmount = useMemo(
    () => validRows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0),
    [validRows],
  );
  const uniquePrCodes = useMemo(
    () => [...new Set(validRows.map((row) => row.prCode.trim().toUpperCase()))],
    [validRows],
  );

  const handleDownloadTemplate = () => {
    const sampleCode = eligibleRequests[0]?.prNumber ?? 'PR-2601-1234';
    downloadExcelTemplate(
      'purchase-order-import-template.xlsx',
      'Purchase Orders',
      ['Item', 'Quantity', 'Unit Price', 'Purchase Request Code'],
      [
        ['Exercise Books', 20, 1200, sampleCode],
        ['Whiteboard Markers', 5, 3500, sampleCode],
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
        { label: 'Unit Price', aliases: ['unit price', 'price', 'unit cost', 'unitprice'] },
        {
          label: 'Purchase Request Code',
          aliases: [
            'purchase request code',
            'purchase request',
            'pr code',
            'pr number',
            'pr no',
            'pr',
          ],
        },
      ]);
      if (!columns.ok) {
        setFileError(
          `Missing required column${columns.missing.length === 1 ? '' : 's'}: ${columns.missing.join(', ')}.`,
        );
        return;
      }

      const consumed = new Map<string, number>();
      const capacities = new Map<string, number>();
      const seen = new Set<string>();

      const parsed: POImportRow[] = rawRows.map((raw, index) => {
        const rowNumber = index + 2;
        const itemName = String(pickCell(raw, ['Item', 'Item Name', 'Product'])).trim();
        const prCode = String(
          pickCell(raw, ['Purchase Request Code', 'PR Code', 'PR Number', 'PR']),
        ).trim();
        const quantity = parsePositiveNumber(pickCell(raw, ['Quantity', 'Qty']));
        const unitPrice = parsePositiveNumber(
          pickCell(raw, ['Unit Price', 'Price', 'Unit Cost']),
        );

        const problems: string[] = [];
        if (!itemName) problems.push('Item is required');
        if (!prCode) problems.push('Purchase Request Code is required');
        if (quantity === null) problems.push('Quantity must be a positive number');
        if (unitPrice === null) problems.push('Unit Price must be a positive number');

        const row: POImportRow = {
          rowNumber,
          itemName,
          quantity: quantity ?? 0,
          unitPrice: unitPrice ?? 0,
          prCode,
        };

        if (problems.length > 0) {
          row.error = problems.join(' · ');
          return row;
        }

        const request = prByCode.get(prCode.toUpperCase());
        if (!request) {
          row.error = `Purchase Request "${prCode}" was not found`;
          return row;
        }
        row.prId = request.id;
        row.prNumber = request.prNumber;

        if (!ELIGIBLE_STATUSES.has(request.status)) {
          row.error = `Purchase Request "${request.prNumber}" is not eligible (status: ${statusLabel(
            request.status,
          )})`;
          return row;
        }
        if (request.purchaseOrders && request.purchaseOrders.length > 0) {
          row.error = `Purchase Request "${request.prNumber}" already has purchase order ${
            request.purchaseOrders[0]?.poNumber ?? ''
          }`.trim();
          return row;
        }

        const itemKey = normalizeItemName(itemName);
        const matchingItems = (request.items ?? []).filter(
          (item) => normalizeItemName(item.itemName) === itemKey,
        );
        if (matchingItems.length === 0) {
          row.error = `"${itemName}" does not exist on Purchase Request "${request.prNumber}"`;
          return row;
        }
        row.prItemName = matchingItems[0].itemName;
        row.unit = matchingItems[0].unit;

        const capacityKey = `${request.id}|${itemKey}`;
        if (!capacities.has(capacityKey)) {
          capacities.set(
            capacityKey,
            matchingItems.reduce((sum, item) => sum + Number(item.quantity), 0),
          );
        }
        if (seen.has(capacityKey)) {
          row.error = `Duplicate row for "${itemName}" on Purchase Request "${request.prNumber}"`;
          return row;
        }
        seen.add(capacityKey);

        const alreadyConsumed = consumed.get(capacityKey) ?? 0;
        const capacity = capacities.get(capacityKey) ?? 0;
        if (alreadyConsumed + quantity! > capacity) {
          row.error = `Quantity exceeds the requested quantity of ${capacity} on "${request.prNumber}"`;
          return row;
        }
        consumed.set(capacityKey, alreadyConsumed + quantity!);

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

  const canContinueDetails = Boolean(supplierId);

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error('Please select a supplier');
      setStep('details');
      return;
    }
    if (validRows.length === 0) {
      toast.error('There are no valid rows to import');
      return;
    }
    if (invalidRows.length > 0) {
      toast.error(
        `Fix the ${invalidRows.length} invalid row${
          invalidRows.length === 1 ? '' : 's'
        } before importing`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload: PurchaseOrderImportBody = {
        supplierId,
        expectedDelivery: expectedDelivery || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        notes: notes.trim() || undefined,
        rows: validRows.map((row) => ({
          itemName: row.prItemName ?? row.itemName,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          prCode: row.prCode,
          rowNumber: row.rowNumber,
        })),
      };
      const response = await procurementApi.purchaseOrders.import(payload);
      setResult(response);
      setStep('done');
      toast.success(
        `${response.purchaseOrders.length} purchase order${
          response.purchaseOrders.length === 1 ? '' : 's'
        } created · ${formatFrw(response.totalAmount)}`,
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
    setStep('details');
    onClose();
  };

  const stepIndex = step === 'details' ? 0 : step === 'items' ? 1 : 2;

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
                Import Purchase Orders
              </SheetTitle>
              <SheetDescription className="mt-1 text-white/65">
                Create purchase orders from approved requests and automatically calculate totals.
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
          {step === 'details' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-navy">
                    <ShoppingCart className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-navy">Purchase order details</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      These values apply to every purchase order created by this import.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                      Supplier <span className="text-red-500">*</span>
                    </span>
                    <select
                      value={supplierId}
                      onChange={(event) => setSupplierId(event.target.value)}
                      className="input"
                    >
                      <option value="">Select supplier</option>
                      {activeSuppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.companyName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                      Expected Delivery
                    </span>
                    <input
                      type="date"
                      value={expectedDelivery}
                      onChange={(event) => setExpectedDelivery(event.target.value)}
                      className="input"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                      Payment Terms
                    </span>
                    <input
                      value={paymentTerms}
                      onChange={(event) => setPaymentTerms(event.target.value)}
                      className="input"
                      placeholder="e.g. 30 days"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                      Delivery Address
                    </span>
                    <input
                      value={deliveryAddress}
                      onChange={(event) => setDeliveryAddress(event.target.value)}
                      className="input"
                      placeholder="Where should the supplier deliver?"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                      Notes
                    </span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="input min-h-[80px] resize-y"
                      placeholder="Optional instructions for the supplier"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-navy">Eligible purchase requests</h3>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {requestsLoading ? 'Loading…' : `${eligibleRequests.length} ready`}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Imported items must belong to an approved purchase request without an existing
                  purchase order.
                </p>
                {!requestsLoading && eligibleRequests.length > 0 ? (
                  <div className="mt-3 flex max-h-[150px] flex-wrap gap-2 overflow-y-auto">
                    {eligibleRequests.slice(0, 40).map((request) => (
                      <span
                        key={request.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-navy"
                      >
                        {request.prNumber}
                      </span>
                    ))}
                  </div>
                ) : null}
                {!requestsLoading && eligibleRequests.length === 0 ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>No eligible purchase requests were found. Approve a request before importing.</p>
                  </div>
                ) : null}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Purchase orders are created in draft status. Each purchase request becomes one
                  purchase order, and item totals are calculated from quantity × unit price.
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
                      <h3 className="text-sm font-bold text-navy">Upload the order spreadsheet</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Required columns:{' '}
                        <span className="font-semibold text-navy">Item</span>,{' '}
                        <span className="font-semibold text-navy">Quantity</span>,{' '}
                        <span className="font-semibold text-navy">Unit Price</span> and{' '}
                        <span className="font-semibold text-navy">Purchase Request Code</span>.
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
              </div>

              {rows.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryTile label="Valid rows" value={`${validRows.length}`} tone="success" />
                    <SummaryTile
                      label="Invalid rows"
                      value={`${invalidRows.length}`}
                      tone={invalidRows.length ? 'danger' : 'neutral'}
                    />
                    <SummaryTile label="Total quantity" value={`${totalQuantity}`} tone="info" />
                    <SummaryTile label="Purchase order total" value={formatFrw(totalAmount)} tone="warning" />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                        Import preview
                      </span>
                      <span className="text-xs text-slate-500">
                        {rows.length} row{rows.length === 1 ? '' : 's'} · {uniquePrCodes.length}{' '}
                        purchase order{uniquePrCodes.length === 1 ? '' : 's'} will be created
                      </span>
                    </div>
                    <div className="max-h-[360px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          <tr className="border-b border-slate-200">
                            <th className="px-3 py-2.5 text-left">Row</th>
                            <th className="px-3 py-2.5 text-left">Item</th>
                            <th className="px-3 py-2.5 text-left">PR Code</th>
                            <th className="px-3 py-2.5 text-right">Qty</th>
                            <th className="px-3 py-2.5 text-right">Unit Price</th>
                            <th className="px-3 py-2.5 text-right">Line Total</th>
                            <th className="px-3 py-2.5 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const invalid = Boolean(row.error);
                            return (
                              <tr
                                key={row.rowNumber}
                                className={`border-b border-slate-100 last:border-0 ${
                                  invalid ? 'bg-red-50/60' : ''
                                }`}
                              >
                                <td className="px-3 py-2.5 text-xs text-slate-500">{row.rowNumber}</td>
                                <td className="px-3 py-2.5">
                                  <p className="font-semibold text-navy">{row.itemName || '—'}</p>
                                  {row.prItemName && row.prItemName !== row.itemName ? (
                                    <p className="text-[11px] text-slate-500">
                                      Matched: {row.prItemName}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2.5 text-xs font-semibold text-slate-600">
                                  {row.prNumber || row.prCode || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                                  {row.quantity || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                                  {row.unitPrice ? formatFrw(row.unitPrice) : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-navy">
                                  {row.quantity && row.unitPrice
                                    ? formatFrw(row.quantity * row.unitPrice)
                                    : '—'}
                                </td>
                                <td className="px-3 py-2.5">
                                  {invalid ? (
                                    <span className="inline-flex items-start gap-1 text-xs font-medium text-red-700">
                                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      {row.error}
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
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
                      <span className="text-slate-500">
                        Valid: <span className="font-semibold text-emerald-700">{validRows.length}</span>{' '}
                        · Invalid:{' '}
                        <span className="font-semibold text-red-700">{invalidRows.length}</span>
                      </span>
                      <span className="font-semibold text-navy">
                        Total: {formatFrw(totalAmount)}
                      </span>
                    </div>
                  </div>

                  {invalidRows.length > 0 ? (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        {invalidRows.length} row{invalidRows.length === 1 ? '' : 's'} must be
                        corrected before this import can be submitted. Fix the file and upload it
                        again.
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
                  {result.purchaseOrders.length} purchase order
                  {result.purchaseOrders.length === 1 ? '' : 's'} created ·{' '}
                  {result.itemCount} item{result.itemCount === 1 ? '' : 's'} · total quantity{' '}
                  {result.totalQuantity}
                </p>
                <p className="mt-2 text-2xl font-extrabold text-navy">
                  {formatFrw(result.totalAmount)}
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
                  Created purchase orders
                </div>
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left">PO Number</th>
                      <th className="px-4 py-2.5 text-left">PR Reference</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Items</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.purchaseOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-navy">{order.poNumber}</td>
                        <td className="px-4 py-2.5 text-slate-600">{order.prNumber}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {order.totalQuantity}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {order.itemCount}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-navy">
                          {formatFrw(order.totalAmount)}
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
          {step === 'details' ? (
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
                disabled={!canContinueDetails}
                className="btn-primary inline-flex items-center gap-2 px-6 disabled:opacity-60"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : step === 'items' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('details')}
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
                  disabled={submitting || validRows.length === 0 || invalidRows.length > 0}
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
  value: string;
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
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

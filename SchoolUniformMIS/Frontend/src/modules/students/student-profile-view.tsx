"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  QrCode,
  Ruler,
  Scissors,
  Shirt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import { ListToolbar, StatusBadge } from "@/components/list-ui";
import { cn } from "@/lib/utils";
import { uniformApi } from "@/services/uniform-api";
import type { UniformProduct, UniformSale, UniformStudent } from "@/types";

type SizeRow = { id: string; label: string; value: string };

const SIZE_SUGGESTIONS = [
  "Shirt",
  "Trouser",
  "Skirt",
  "Dress",
  "Sweater",
  "Shoe",
  "Sport Wear",
  "Hat",
  "Belt",
  "Height (cm)",
  "Weight (kg)",
];

const LEGACY_SIZE_MAP: { key: string; label: string }[] = [
  { key: "shirtSize", label: "Shirt" },
  { key: "trouserSize", label: "Trouser" },
  { key: "skirtSize", label: "Skirt" },
  { key: "dressSize", label: "Dress" },
  { key: "sweaterSize", label: "Sweater" },
  { key: "shoeSize", label: "Shoe" },
  { key: "sportSize", label: "Sport Wear" },
  { key: "hatSize", label: "Hat" },
  { key: "beltSize", label: "Belt" },
  { key: "height", label: "Height (cm)" },
  { key: "weight", label: "Weight (kg)" },
];

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function newId() {
  return `sz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sizesFromMeasurement(
  measurement: UniformStudent["measurement"],
): SizeRow[] {
  if (!measurement) return [];
  if (Array.isArray(measurement.sizes) && measurement.sizes.length) {
    return measurement.sizes
      .filter((r) => r.label && r.value)
      .map((r, i) => ({
        id: r.id || `legacy-${i}`,
        label: r.label,
        value: String(r.value),
      }));
  }
  const fromCols: SizeRow[] = [];
  for (const { key, label } of LEGACY_SIZE_MAP) {
    const val = (measurement as Record<string, unknown>)[key];
    if (val !== null && val !== undefined && String(val).trim() !== "") {
      fromCols.push({ id: `col-${key}`, label, value: String(val) });
    }
  }
  return fromCols;
}

export function StudentProfileView({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<UniformStudent | null>(null);
  const [products, setProducts] = useState<UniformProduct[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    reference: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [s, p] = await Promise.all([
        uniformApi.students.getProfile(studentId),
        uniformApi.products.list(),
      ]);
      setStudent(s);
      setProducts(p);
      setSizes(sizesFromMeasurement(s.measurement));
    } catch {
      toast.error("Failed to load profile");
    }
  }

  useEffect(() => {
    void load();
  }, [studentId]);

  const items = student?.items ?? student?.uniformItems ?? [];
  const distributions = student?.distributions ?? [];
  const sales = student?.sales ?? [];

  const requirements = useMemo(() => {
    return products.map((p) => {
      const owned = items.filter((i) => i.productId === p.id);
      const received = owned.reduce(
        (sum, i) => sum + (i.owned ? i.quantity : 0),
        0,
      );
      const required = Math.max(
        1,
        owned.reduce((sum, i) => sum + i.quantity, 0) || 1,
      );
      const reqQty = owned.length ? Math.max(required, 1) : 1;
      const remaining = Math.max(0, reqQty - received);
      return {
        product: p,
        required: reqQty,
        received,
        remaining,
        status:
          remaining === 0 && received > 0
            ? "Complete"
            : remaining > 0 && received > 0
              ? "Partial"
              : received > 0
                ? "Complete"
                : "Pending",
      };
    });
  }, [products, items]);

  const kpis = useMemo(() => {
    const receivedTotal = requirements.reduce((s, r) => s + r.received, 0);
    const pendingTotal = requirements.reduce((s, r) => s + r.remaining, 0);
    const status =
      pendingTotal === 0 && receivedTotal > 0
        ? "Complete"
        : receivedTotal > 0
          ? "Partial"
          : "Pending";

    let balance = 0;
    let totalCost = 0;
    let amountPaid = 0;
    let lastPayment: UniformSale | undefined;
    let lastReceipt = "-";

    for (const sale of sales) {
      const total = Number(sale.total);
      const paid = (sale.payments ?? []).reduce(
        (s, p) => s + Number(p.amount),
        0,
      );
      totalCost += total;
      amountPaid += paid;
      balance += Math.max(0, total - paid);
      if (
        !lastPayment ||
        new Date(sale.createdAt) > new Date(lastPayment.createdAt)
      ) {
        lastPayment = sale;
        lastReceipt = sale.invoiceNumber;
      }
    }

    const requiredTotal = requirements.reduce((s, r) => s + r.required, 0);
    const progress =
      requiredTotal > 0 ? Math.round((receivedTotal / requiredTotal) * 100) : 0;
    const meta = (student?.profileMeta ?? {}) as { fabricOrders?: number };

    return {
      status,
      receivedTotal,
      pendingTotal,
      balance,
      fabricOrders: meta.fabricOrders ?? 0,
      lastDist: distributions[0]?.issuedAt,
      totalCost,
      amountPaid,
      lastPayment,
      lastReceipt,
      progress,
      missing: requirements.filter((r) => r.remaining > 0),
    };
  }, [requirements, sales, distributions, student?.profileMeta]);

  const qrUrl = useMemo(() => {
    const meta = student?.profileMeta as
      { shuleCode?: string } | null | undefined;
    const code = (meta?.shuleCode || student?.academicStudentId || "").trim();
    const displayCode =
      code && !/^[0-9a-f-]{36}$/i.test(code) ? code : studentId.slice(0, 8);
    const payload = encodeURIComponent(
      JSON.stringify({
        type: "shuleplus-uniform",
        studentId,
        name: student ? `${student.firstName} ${student.lastName}` : "",
        code: displayCode,
      }),
    );
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${payload}`;
  }, [studentId, student]);

  const usedLabels = useMemo(
    () => new Set(sizes.map((s) => s.label.toLowerCase())),
    [sizes],
  );

  function startEdit(row: SizeRow) {
    setEditingId(row.id);
    setDraftLabel(row.label);
    setDraftValue(row.value);
  }

  function resetDraft() {
    setEditingId(null);
    setDraftLabel("");
    setDraftValue("");
  }

  async function persistSizes(next: SizeRow[]) {
    setSaving(true);
    try {
      await uniformApi.students.upsertMeasurement(studentId, {
        sizes: next.map(({ id, label, value }) => ({ id, label, value })),
      });
      setSizes(next);
      toast.success(editingId ? "Size updated" : "Size saved");
      resetDraft();
      await load();
    } catch {
      toast.error("Could not save sizes");
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    const label = draftLabel.trim();
    const value = draftValue.trim();
    if (!label || !value) {
      toast.error("Enter item and size");
      return;
    }
    if (editingId) {
      const next = sizes.map((r) =>
        r.id === editingId ? { ...r, label, value } : r,
      );
      await persistSizes(next);
      return;
    }
    if (usedLabels.has(label.toLowerCase())) {
      toast.error("That item is already listed. Edit it instead.");
      return;
    }
    await persistSizes([...sizes, { id: newId(), label, value }]);
  }

  async function removeSize(id: string) {
    const next = sizes.filter((r) => r.id !== id);
    setSaving(true);
    try {
      await uniformApi.students.upsertMeasurement(studentId, {
        sizes: next.map(({ id: rowId, label, value }) => ({
          id: rowId,
          label,
          value,
        })),
      });
      setSizes(next);
      if (editingId === id) resetDraft();
      toast.success("Size removed");
    } catch {
      toast.error("Could not remove size");
    } finally {
      setSaving(false);
    }
  }

  async function savePayment() {
    const openSale = sales.find((s) => s.paymentStatus !== "PAID");
    if (!openSale) {
      toast.error("No outstanding sale to pay against");
      return;
    }
    setSaving(true);
    try {
      await uniformApi.sales.addPayment(openSale.id, {
        amount: paymentForm.amount,
        method: paymentForm.method,
        notes: paymentForm.reference || undefined,
      });
      toast.success("Payment recorded");
      setPaymentOpen(false);
      setPaymentForm({ amount: "", method: "CASH", reference: "" });
      await load();
    } catch {
      toast.error("Payment failed");
    } finally {
      setSaving(false);
    }
  }

  if (!student) {
    return <p className="text-sm text-muted">Loading uniform profile…</p>;
  }

  const statusTone =
    kpis.status === "Complete"
      ? "success"
      : kpis.status === "Partial"
        ? "warning"
        : "danger";

  const meta = student.profileMeta as { shuleCode?: string } | null | undefined;
  const rawCode = (meta?.shuleCode || student.academicStudentId || "").trim();
  const shuleCode =
    rawCode && !/^[0-9a-f-]{36}$/i.test(rawCode) ? rawCode : null;

  return (
    <PlatformPageLayout
      title={`${student.firstName} ${student.lastName}`}
      subtitle={`Uniform profile · ${student.className ?? "No class"} · ${shuleCode ?? "Local student"}`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
          <KpiCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Uniform Status"
            value={
              kpis.status === "Complete"
                ? "Fully Equipped"
                : kpis.status === "Partial"
                  ? "Partial"
                  : "Pending"
            }
            tone={statusTone}
          />
          <KpiCard
            icon={<Shirt className="h-4 w-4" />}
            label="Received Items"
            value={kpis.receivedTotal}
          />
          <KpiCard
            icon={<Package className="h-4 w-4" />}
            label="Pending Items"
            value={kpis.pendingTotal}
            tone="warning"
          />
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label="Uniform Balance"
            value={money(kpis.balance)}
          />
          <KpiCard
            icon={<Scissors className="h-4 w-4" />}
            label="Fabric Orders"
            value={kpis.fabricOrders}
          />
          <KpiCard
            icon={<Calendar className="h-4 w-4" />}
            label="Last Distribution"
            value={formatDate(kpis.lastDist)}
          />
        </div>

        {/* Student Sizes - flexible form + table */}
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-navy">
                <Ruler className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-navy">Student Sizes</h3>
                <p className="text-xs text-muted">
                  Add only the items your school uses · Updated{" "}
                  {formatDate(student.measurement?.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-border bg-slate-50/50 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {SIZE_SUGGESTIONS.filter(
                (s) => !usedLabels.has(s.toLowerCase()),
              ).map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-navy transition hover:border-primary hover:bg-primary/10"
                  onClick={() => {
                    setEditingId(null);
                    setDraftLabel(label);
                  }}
                >
                  + {label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Uniform item
                </span>
                <input
                  className="input !rounded-full !py-2.5"
                  placeholder="e.g. Shirt, Skirt, Sport Wear…"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Size / value
                </span>
                <input
                  className="input !rounded-full !py-2.5"
                  placeholder="e.g. 32, M, 37…"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveDraft();
                  }}
                />
              </label>
              <div className="flex items-end gap-2">
                {editingId ? (
                  <button
                    type="button"
                    className="btn-ghost !rounded-full"
                    onClick={resetDraft}
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-primary !rounded-full"
                  disabled={saving}
                  onClick={() => void saveDraft()}
                >
                  {editingId ? (
                    <>
                      <Pencil className="h-4 w-4" /> Update
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add size
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <ListToolbar
            icon={<Shirt />}
            resultLabel={`${sizes.length} size${sizes.length === 1 ? "" : "s"} recorded`}
            resultHint="Only items you add appear here"
          />

          <div className="overflow-x-auto">
            <table className="sp-table w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Size</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sizes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="!py-10 text-center text-muted">
                      No sizes yet. Add the uniform items this student needs.
                    </td>
                  </tr>
                ) : (
                  sizes.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        editingId === row.id ? "bg-primary/5" : undefined
                      }
                    >
                      <td className="font-semibold text-navy">{row.label}</td>
                      <td className="tabular-nums font-medium text-navy">
                        {row.value}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-navy"
                            aria-label="Edit"
                            onClick={() => startEdit(row)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove"
                            disabled={saving}
                            onClick={() => void removeSize(row.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Requirements */}
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-navy">
                Uniform Requirements
              </h3>
              <p className="text-xs text-muted">
                What this student should receive this year
              </p>
            </div>
            <StatusBadge tone={statusTone} pill>
              {kpis.status === "Complete"
                ? "Fully Equipped"
                : kpis.status === "Partial"
                  ? "Partially Equipped"
                  : "Not Started"}
            </StatusBadge>
          </div>
          <div className="overflow-x-auto">
            <table className="sp-table w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Required</th>
                  <th>Received</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((row) => (
                  <tr key={row.product.id}>
                    <td className="font-medium text-navy">
                      {row.product.name}
                    </td>
                    <td className="tabular-nums text-muted">{row.required}</td>
                    <td className="tabular-nums text-navy">{row.received}</td>
                    <td className="tabular-nums text-muted">{row.remaining}</td>
                    <td>
                      <StatusBadge
                        pill
                        tone={
                          row.status === "Complete"
                            ? "success"
                            : row.status === "Partial"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {row.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {!requirements.length ? (
                  <tr>
                    <td colSpan={5} className="!py-10 text-center text-muted">
                      No catalog products yet. Add products to define
                      requirements.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="hr-card flex flex-col items-center p-6 text-center">
            <h3 className="mb-4 text-sm font-semibold text-navy">
              Uniform Completion
            </h3>
            <ProgressRing value={kpis.progress} />
            <p className="mt-3 text-sm font-semibold text-navy">
              {kpis.progress}% ·{" "}
              {kpis.status === "Complete"
                ? "Fully Equipped"
                : kpis.status === "Partial"
                  ? "Partially Equipped"
                  : "Not Started"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Required {requirements.reduce((s, r) => s + r.required, 0)} ·
              Received {kpis.receivedTotal} · Remaining {kpis.pendingTotal}
            </p>
            {kpis.missing.length ? (
              <ul className="mt-4 w-full space-y-1 text-left text-xs text-muted">
                {kpis.missing.slice(0, 5).map((mItem) => (
                  <li
                    key={mItem.product.id}
                    className="flex justify-between rounded-md bg-amber-50 px-3 py-1.5 text-amber-900"
                  >
                    <span>{mItem.product.name}</span>
                    <span className="font-semibold">{mItem.remaining}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="hr-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">
                Payment Summary
              </h3>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setPaymentOpen(true)}
              >
                Record payment
              </button>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Total Cost" value={money(kpis.totalCost)} />
              <Row label="Amount Paid" value={money(kpis.amountPaid)} />
              <Row label="Remaining" value={money(kpis.balance)} emphasize />
              <Row
                label="Last Payment"
                value={
                  kpis.lastPayment
                    ? formatDate(kpis.lastPayment.createdAt)
                    : ""
                }
              />
              <Row label="Receipt Number" value={kpis.lastReceipt} />
            </dl>
          </section>

          <section className="hr-card flex flex-col items-center p-5 text-center">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
              <QrCode className="h-4 w-4" /> Student Uniform QR
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Student uniform QR"
              className="h-36 w-36 rounded-md border border-border bg-white p-2"
            />
            <p className="mt-3 text-xs text-muted">
              Scan for pending items, receipts, and sizes
            </p>
            <p className="mt-1 font-mono text-[11px] text-navy">
              {shuleCode ?? "No ShuleCode"}
            </p>
          </section>
        </div>
      </div>

      {paymentOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-navy">
                Payment Details
              </h3>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPaymentOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-navy">
                  Amount (RWF)
                </span>
                <input
                  className="input"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-navy">
                  Method
                </span>
                <select
                  className="input"
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value })
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CARD">Card</option>
                  <option value="BANK">Bank / School Account</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-navy">
                  Reference
                </span>
                <input
                  className="input"
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: e.target.value,
                    })
                  }
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPaymentOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => void savePayment()}
                >
                  Save payment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PlatformPageLayout>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-3 shadow-soft">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            tone === "success"
              ? "bg-emerald-100 text-emerald-700"
              : tone === "warning"
                ? "bg-amber-100 text-amber-800"
                : tone === "danger"
                  ? "bg-red-100 text-red-700"
                  : "bg-navy/5 text-navy",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="truncate text-base font-bold tabular-nums text-navy">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums",
          emphasize ? "text-amber-700" : "text-navy",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative h-28 w-28">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#FCB038"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-navy">{value}%</span>
      </div>
    </div>
  );
}

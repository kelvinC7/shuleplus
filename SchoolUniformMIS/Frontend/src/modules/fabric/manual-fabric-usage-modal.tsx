"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { uniformApi } from "@/services/uniform-api";
import type { Fabric, FabricIssue, UniformProduct } from "@/types";
import {
  fabricStatus,
  fmtMeters,
  fmtMoney,
} from "@/modules/fabric/fabric-utils";

const USAGE_PURPOSES = [
  "Uniform Production",
  "Sample Making",
  "Repairs",
  "Testing",
  "Quality Control",
  "Damaged",
  "Waste",
  "Other",
] as const;

const DEPARTMENTS = [
  "Tailoring",
  "Cutting",
  "Sampling",
  "Repairs",
  "Quality Control",
] as const;

const MIN_STOCK = 300;

function noteField(notes: string | null | undefined, key: string) {
  if (!notes) return "";
  const re = new RegExp(`${key}:\\s*([^·]+)`, "i");
  return notes.match(re)?.[1]?.trim() || "";
}

function freeNotes(notes: string | null | undefined) {
  if (!notes) return "";
  const known =
    /^(Purpose|Uniform|Production Order|Department|Responsible|Variant|Batch|Warehouse):/i;
  return notes
    .split(" · ")
    .map((p) => p.trim())
    .filter((p) => p && !known.test(p))
    .join(" · ");
}

type Props = {
  open: boolean;
  fabrics: Fabric[];
  editing?: FabricIssue | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ManualFabricUsageModal({
  open,
  fabrics,
  editing = null,
  onClose,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<UniformProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fabricId: "",
    meters: "",
    purpose: "Uniform Production",
    productId: "",
    uniformType: "",
    department: "Tailoring",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const purpose =
        noteField(editing.notes, "Purpose") || "Uniform Production";
      const uniformType = noteField(editing.notes, "Uniform");
      const department = noteField(editing.notes, "Department") || "Tailoring";
      setForm({
        fabricId: editing.fabricId,
        meters: String(Number(editing.meters) || ""),
        purpose,
        productId: "",
        uniformType,
        department,
        notes: freeNotes(editing.notes),
      });
    } else {
      setForm({
        fabricId: "",
        meters: "",
        purpose: "Uniform Production",
        productId: "",
        uniformType: "",
        department: "Tailoring",
        notes: "",
      });
    }
    void uniformApi.products
      .list({ isActive: true })
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [open, editing]);

  const fabric = fabrics.find((f) => f.id === form.fabricId);
  const product =
    products.find((p) => p.id === form.productId) ||
    products.find(
      (p) => p.name.toLowerCase() === form.uniformType.trim().toLowerCase(),
    );
  // When editing, meters already deducted are available again for this issue
  const restored =
    editing && editing.fabricId === form.fabricId
      ? Number(editing.meters) || 0
      : 0;
  const available = Number(fabric?.metersRemaining ?? 0) + restored;
  const used = Number(form.meters) || 0;
  const remaining = available - used;
  const costPerM = Number(fabric?.cost ?? 0);
  const estimatedCost = used * costPerM;
  const usagePct =
    available > 0 ? Math.min(100, Math.round((used / available) * 100)) : 0;
  const status = fabricStatus(remaining, MIN_STOCK);
  const enough = used > 0 && remaining >= 0;
  const overuse = used > available;

  const warehouse =
    fabric?.warehouse?.split(" / ")[0]?.trim() || fabric?.warehouse || "";
  const batch = fabric?.rollNumber || "";
  const variantLabel =
    [fabric?.color, fabric?.quality].filter(Boolean).join(" · ") || "";

  const responsibleName =
    user?.email?.split("@")[0]?.replace(/[._]/g, " ") || "Staff";
  const responsibleRole =
    user?.roles?.[0]?.replace(/_/g, " ") || "Production Manager";

  async function confirm() {
    if (!form.fabricId) {
      toast.error("Select a fabric roll");
      return;
    }
    if (used <= 0) {
      toast.error("Enter quantity used");
      return;
    }
    if (overuse) {
      toast.error("Quantity exceeds available stock");
      return;
    }
    if (!form.purpose) {
      toast.error("Select usage purpose");
      return;
    }
    if (!form.uniformType.trim()) {
      toast.error("Enter or select uniform type");
      return;
    }

    setSaving(true);
    try {
      const uniformName = form.uniformType.trim();

      const payload = {
        fabricId: form.fabricId,
        meters: used,
        expectedPieces: product?.fabricMetersPerItem
          ? Math.floor(used / Number(product.fabricMetersPerItem))
          : undefined,
        notes: [
          `Purpose: ${form.purpose}`,
          `Uniform: ${uniformName}`,
          form.department ? `Department: ${form.department}` : null,
          `Responsible: ${responsibleName}`,
          fabric?.color ? `Variant: ${variantLabel}` : null,
          batch !== "" ? `Batch: ${batch}` : null,
          warehouse !== "" ? `Warehouse: ${warehouse}` : null,
          form.notes.trim() || null,
        ]
          .filter(Boolean)
          .join(" · "),
      };

      if (editing) {
        await uniformApi.fabricIssues.update(editing.id, payload);
        toast.success("Fabric usage updated");
      } else {
        await uniformApi.fabricIssues.create(payload);
        toast.success("Fabric usage recorded");
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || (editing ? "Update failed" : "Stock out failed"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-navy/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-md">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-lg font-semibold text-navy">
              {editing ? "Edit Fabric Usage" : "Manual Fabric Usage"}
            </h3>
            <p className="text-xs text-muted">
              {editing
                ? "Update meters and usage details"
                : "Issue meters from stock"}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-navy"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_280px]">
          <div className="space-y-4 p-4 sm:p-5">
            <Field label="1. Fabric Roll *" required>
              <select
                className="input"
                value={form.fabricId}
                onChange={(e) => setForm({ ...form, fabricId: e.target.value })}
              >
                <option value="">Select fabric roll</option>
                {fabrics.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({fmtMeters(Number(f.metersRemaining))})
                    {f.rollNumber ? ` · ${f.rollNumber}` : ""}
                  </option>
                ))}
              </select>
              {fabric ? (
                <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-muted">
                  <p>
                    <span className="font-semibold text-navy">Stock:</span>{" "}
                    {fmtMeters(available)}
                  </p>
                  <p>
                    <span className="font-semibold text-navy">Batch:</span>{" "}
                    {batch}
                  </p>
                  <p>
                    <span className="font-semibold text-navy">Warehouse:</span>{" "}
                    {warehouse}
                  </p>
                </div>
              ) : null}
            </Field>

            <Field label="2. Quantity Used (m) *" required>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`input ${overuse ? "!border-rose-400 focus:!ring-rose-200" : ""}`}
                value={form.meters}
                onChange={(e) => setForm({ ...form, meters: e.target.value })}
                placeholder="e.g. 600.00"
              />
              {fabric ? (
                <p
                  className={`mt-1.5 text-xs ${
                    overuse ? "font-semibold text-rose-600" : "text-muted"
                  }`}
                >
                  Available: {fmtMeters(available)} · Remaining after use:{" "}
                  <span
                    className={
                      remaining < MIN_STOCK
                        ? "text-amber-700"
                        : "text-emerald-700"
                    }
                  >
                    {fmtMeters(remaining)}
                  </span>
                  {overuse ? " · Exceeds stock" : null}
                </p>
              ) : null}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="3. Usage Purpose *" required>
                <select
                  className="input"
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                >
                  {USAGE_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="5. Uniform Type *" required>
                <input
                  className="input"
                  list="uniform-type-options"
                  value={form.uniformType}
                  onChange={(e) => {
                    const value = e.target.value;
                    const match = products.find(
                      (p) =>
                        p.name.toLowerCase() === value.trim().toLowerCase(),
                    );
                    setForm({
                      ...form,
                      uniformType: value,
                      productId: match?.id ?? "",
                    });
                  }}
                  placeholder="Type uniform name, e.g. White Shirt"
                />
                <datalist id="uniform-type-options">
                  {products.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-muted">
                  Type manually or pick a suggestion from your uniform items
                </p>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="4. Color / Variant">
                <input
                  className="input bg-slate-50 text-muted"
                  value={variantLabel}
                  readOnly
                />
              </Field>
              <Field label="5. Workshop / Department">
                <select
                  className="input"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="6. Responsible Person">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-sm font-semibold capitalize text-navy">
                  {responsibleName}
                </p>
                <p className="text-xs capitalize text-muted">
                  {responsibleRole}
                </p>
              </div>
            </Field>

            <Field label="7. Notes">
              <textarea
                className="input min-h-[72px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes…"
              />
            </Field>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving || !enough}
                onClick={() => void confirm()}
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save Changes"
                    : "Confirm Fabric Usage"}
              </button>
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/80 p-4 lg:border-l lg:border-t-0 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
              Live Inventory
            </p>

            <dl className="mt-4 space-y-3 text-sm">
              <LiveRow label="Current Stock" value={fmtMeters(available)} />
              <LiveRow label="Usage" value={fmtMeters(used)} />
              <LiveRow
                label="Remaining"
                value={fmtMeters(remaining)}
                valueClass={
                  overuse
                    ? "text-rose-600"
                    : remaining < MIN_STOCK
                      ? "text-amber-700"
                      : "text-emerald-700"
                }
              />
            </dl>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted">Progress</span>
                <span className="font-semibold tabular-nums text-navy">
                  {usagePct}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    overuse
                      ? "bg-rose-500"
                      : usagePct > 70
                        ? "bg-amber-400"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, usagePct)}%` }}
                />
              </div>
            </div>

            <div className="my-4 border-t border-slate-200" />

            <dl className="space-y-2.5 text-sm">
              <LiveRow label="Batch Number" value={batch} />
              <LiveRow label="Warehouse" value={warehouse} />
              <LiveRow label="Minimum Stock" value={fmtMeters(MIN_STOCK)} />
              <LiveRow
                label="Status"
                value={`${status.emoji} ${remaining < 0 ? "Insufficient" : status.label}`}
              />
              <LiveRow
                label="Estimated Cost"
                value={
                  used > 0
                    ? `${used} × ${fmtMoney(costPerM).replace("RWF ", "")} = ${fmtMoney(estimatedCost)}`
                    : fmtMoney(0)
                }
                bold
              />
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-navy">
        {label}
        {required ? <span className="sr-only"> required</span> : null}
      </span>
      {children}
    </label>
  );
}

function LiveRow({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`text-right tabular-nums ${
          bold ? "font-bold text-navy" : "font-semibold text-navy"
        } ${valueClass ?? ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

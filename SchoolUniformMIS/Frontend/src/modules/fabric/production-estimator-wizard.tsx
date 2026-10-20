"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { uniformApi } from "@/services/uniform-api";
import type { Fabric, Tailor, UniformProduct, UniformStudent } from "@/types";
import { fmtMeters, fmtMoney } from "@/modules/fabric/fabric-utils";

const STEPS = [
  "Year & Class",
  "Uniform & Fabric",
  "Production Qty",
  "Tailor",
  "Confirm",
] as const;

type WizardProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  fabrics?: Fabric[];
  products?: UniformProduct[];
  tailors?: Tailor[];
};

export function ProductionEstimatorWizard({
  open,
  onClose,
  onCreated,
  fabrics: fabricsProp,
  products: productsProp,
  tailors: tailorsProp,
}: WizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fabrics, setFabrics] = useState<Fabric[]>(fabricsProp ?? []);
  const [products, setProducts] = useState<UniformProduct[]>(
    productsProp ?? [],
  );
  const [tailors, setTailors] = useState<Tailor[]>(tailorsProp ?? []);
  const [students, setStudents] = useState<UniformStudent[]>([]);

  const [academicYear, setAcademicYear] = useState(
    String(new Date().getFullYear()),
  );
  const [term, setTerm] = useState("Term 1");
  const [className, setClassName] = useState("");
  const [productId, setProductId] = useState("");
  const [fabricId, setFabricId] = useState("");
  const [metersPerStudent, setMetersPerStudent] = useState("1.8");
  const [extra, setExtra] = useState("10");
  const [tailorId, setTailorId] = useState("");
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expectedFinish, setExpectedFinish] = useState("");
  const [batchNumber, setBatchNumber] = useState(
    `PB-${Date.now().toString().slice(-5)}`,
  );

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [f, p, t, s] = await Promise.all([
          fabricsProp
            ? Promise.resolve(fabricsProp)
            : uniformApi.fabrics.list(),
          productsProp
            ? Promise.resolve(productsProp)
            : uniformApi.products.list({ isActive: true }),
          tailorsProp
            ? Promise.resolve(tailorsProp)
            : uniformApi.tailors.list(),
          uniformApi.students.list(),
        ]);
        setFabrics(f);
        setProducts(p);
        setTailors(t);
        setStudents(s);
      } catch {
        toast.error("Failed to load estimator data");
      }
    })();
  }, [open, fabricsProp, productsProp, tailorsProp]);

  const classes = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students) {
      const c = (s.className || "Unassigned").trim();
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const studentCount = classes.find((c) => c.name === className)?.count ?? 0;
  const fabric = fabrics.find((f) => f.id === fabricId);
  const product = products.find((p) => p.id === productId);
  const mps =
    Number(metersPerStudent) || Number(product?.fabricMetersPerItem) || 1.8;
  const metersRequired = Math.round(studentCount * mps * 10) / 10;
  const available = Number(fabric?.metersRemaining ?? 0);
  const remaining = available - metersRequired;
  const enough = remaining >= 0;
  const extraN = Number(extra) || 0;
  const totalUniforms = studentCount + extraN;
  const costPerM = Number(fabric?.cost ?? 0);
  const estimatedCost = metersRequired * costPerM;
  const sellPrice = Number(product?.sellingPrice ?? 4500);
  const expectedRevenue = totalUniforms * sellPrice;
  const profit = expectedRevenue - estimatedCost;

  useEffect(() => {
    if (product?.fabricMetersPerItem) {
      setMetersPerStudent(String(Number(product.fabricMetersPerItem)));
    }
  }, [productId, product?.fabricMetersPerItem]);

  function reset() {
    setStep(0);
    setClassName("");
    setProductId("");
    setFabricId("");
    setMetersPerStudent("1.8");
    setExtra("10");
    setTailorId("");
    setBatchNumber(`PB-${Date.now().toString().slice(-5)}`);
  }

  async function confirm() {
    if (!fabricId || !tailorId || metersRequired <= 0) {
      toast.error("Select fabric, class, and tailor");
      return;
    }
    if (!enough) {
      toast.error("Not enough fabric in stock");
      return;
    }
    setSaving(true);
    try {
      await uniformApi.fabricIssues.create({
        fabricId,
        tailorId,
        meters: metersRequired,
        expectedPieces: totalUniforms,
        notes: [
          `Batch ${batchNumber}`,
          `${academicYear} ${term}`,
          `Class ${className}`,
          product ? `Uniform: ${product.name}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      await uniformApi.productionOrders.create({
        tailorId,
        fabricId,
        productId: productId || undefined,
        metersIssued: metersRequired,
        expectedOutput: totalUniforms,
        deliveryDate: expectedFinish || undefined,
        tailoringCost: estimatedCost,
        status: "IN_PROGRESS",
        notes: [
          `Batch ${batchNumber}`,
          `${academicYear} ${term}`,
          `Class ${className} (${studentCount} students + ${extraN} extra)`,
          `Production date: ${productionDate}`,
        ].join(" · "),
      });
      toast.success(`Production batch ${batchNumber} created`);
      reset();
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create batch",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const canNext =
    (step === 0 && className && studentCount > 0) ||
    (step === 1 && productId && fabricId && mps > 0) ||
    (step === 2 && totalUniforms > 0) ||
    (step === 3 && tailorId) ||
    step === 4;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-navy/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-4xl flex-col bg-[#f7f8fb] shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
              Production Estimator
            </p>
            <h3 className="text-lg font-bold text-navy">
              Plan fabric → uniforms
            </h3>
          </div>
          <button
            type="button"
            className="rounded-xl border border-border p-2 hover:bg-slate-50"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-white px-3 py-2 sm:px-6">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                i === step
                  ? "bg-primary/15 text-navy"
                  : i < step
                    ? "text-emerald-700"
                    : "text-muted"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                      ? "bg-primary text-navy"
                      : "bg-slate-100"
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_280px]">
          <div className="space-y-4 p-4 sm:p-6">
            {step === 0 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">
                  Academic Year & Class
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Academic Year
                    </span>
                    <input
                      className="input"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Term
                    </span>
                    <select
                      className="input"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                    >
                      <option>Term 1</option>
                      <option>Term 2</option>
                      <option>Term 3</option>
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Class
                    </span>
                    <select
                      className="input"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                    >
                      <option value="">Select class</option>
                      {classes.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.count} students)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {className ? (
                  <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm">
                    <span className="font-bold text-navy">{className}</span>
                    <span className="text-muted"> · </span>
                    <span className="font-semibold text-sky-700">
                      {studentCount} students
                    </span>
                  </div>
                ) : null}
              </section>
            ) : null}

            {step === 1 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">
                  Uniform & Fabric
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Uniform
                    </span>
                    <select
                      className="input"
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                    >
                      <option value="">Select uniform</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Fabric
                    </span>
                    <select
                      className="input"
                      value={fabricId}
                      onChange={(e) => setFabricId(e.target.value)}
                    >
                      <option value="">Select fabric</option>
                      {fabrics.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({fmtMeters(Number(f.metersRemaining))})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Meter per Student
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={metersPerStudent}
                      onChange={(e) => setMetersPerStudent(e.target.value)}
                    />
                  </label>
                </div>
                <div
                  className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                    enough
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  }`}
                >
                  <p className="font-bold">
                    {studentCount} × {mps} = {fmtMeters(metersRequired)}
                  </p>
                  <p className="mt-1 text-xs">
                    {enough ? "Enough stock" : "Not enough stock"} · Remaining{" "}
                    {fmtMeters(remaining)}
                  </p>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">
                  Expected Production
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Students" value={String(studentCount)} />
                  <Stat label="Expected" value={String(studentCount)} />
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Extra
                    </span>
                    <input
                      type="number"
                      className="input"
                      value={extra}
                      onChange={(e) => setExtra(e.target.value)}
                    />
                  </label>
                </div>
                <p className="mt-4 text-lg font-bold text-navy">
                  Total · {totalUniforms} {product?.name ?? "uniforms"}
                </p>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">
                  Tailor & Schedule
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Tailor
                    </span>
                    <select
                      className="input"
                      value={tailorId}
                      onChange={(e) => setTailorId(e.target.value)}
                    >
                      <option value="">Select tailor</option>
                      {tailors.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Production Date
                    </span>
                    <input
                      type="date"
                      className="input"
                      value={productionDate}
                      onChange={(e) => setProductionDate(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Expected Finish
                    </span>
                    <input
                      type="date"
                      className="input"
                      value={expectedFinish}
                      onChange={(e) => setExpectedFinish(e.target.value)}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Batch Number
                    </span>
                    <input
                      className="input"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                    />
                  </label>
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                <h4 className="mb-3 text-sm font-bold text-navy">
                  Confirmation
                </h4>
                <dl className="space-y-2 text-sm">
                  <Row k="Batch" v={batchNumber} />
                  <Row
                    k="Class"
                    v={`${className} · ${studentCount} students`}
                  />
                  <Row k="Uniform" v={product?.name ?? ""} />
                  <Row k="Fabric used" v={fmtMeters(metersRequired)} />
                  <Row k="Stock remaining" v={fmtMeters(remaining)} />
                  <Row k="Estimated cost" v={fmtMoney(estimatedCost)} />
                  <Row k="Expected revenue" v={fmtMoney(expectedRevenue)} />
                  <Row k="Profit" v={fmtMoney(profit)} bold />
                </dl>
              </section>
            ) : null}
          </div>

          <aside className="border-t border-border bg-white p-4 lg:border-l lg:border-t-0 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
              Live Summary
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row k="Students" v={String(studentCount || "")} />
              <Row k="Fabric required" v={fmtMeters(metersRequired)} />
              <Row k="Available" v={fmtMeters(available)} />
              <Row
                k="Remaining"
                v={fmtMeters(remaining)}
                className={enough ? "text-emerald-700" : "text-rose-600"}
              />
              <div className="my-2 border-t border-border" />
              <Row k="Est. cost" v={fmtMoney(estimatedCost)} />
              <Row k="Revenue" v={fmtMoney(expectedRevenue)} />
              <Row k="Profit" v={fmtMoney(profit)} bold />
            </dl>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            className="btn-secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={saving || !enough}
              onClick={() => void confirm()}
            >
              {saving ? "Creating…" : "Create Production Batch"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-navy">{value}</p>
    </div>
  );
}

function Row({
  k,
  v,
  bold,
  className,
}: {
  k: string;
  v: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd
        className={`${bold ? "font-bold text-navy" : "font-semibold text-navy"} ${className ?? ""}`}
      >
        {v}
      </dd>
    </div>
  );
}
